"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { telefonDuzelt, trTarihStr } from "../../lib/util";
import { useOturum } from "../../lib/useOturum";
import Ust from "../../components/Ust";
import GunSec from "../../components/GunSec";

function csvOku(metin) {
  const satirlar = metin.replace(/^\uFEFF/, "").split(/\r?\n/).filter((s) => s.trim());
  if (!satirlar.length) return [];
  const ayrac = satirlar[0].includes(";") ? ";" : ",";
  const baslik = satirlar[0].split(ayrac).map((s) => s.trim().toLowerCase());
  return satirlar.slice(1).map((s) => {
    const p = s.split(ayrac).map((x) => x.trim());
    return Object.fromEntries(baslik.map((b, i) => [b, p[i]]));
  });
}

export default function Panel() {
  const oturum = useOturum();
  const [liste, setListe] = useState([]);
  const [q, setQ] = useState("");
  const [sadeceOdemeyen, setSO] = useState(false);
  const [secili, setSecili] = useState(new Set());
  const [duz, setDuz] = useState(null);
  const [mesaj, setMesaj] = useState("");
  const [bekle, setBekle] = useState(false);
  const [yeni, setYeni] = useState({ ad_soyad: "", telefon: "", aidat_gunu: "", aidat_tutari: "" });

  async function yukle() {
    const { data, error } = await supabase.from("ogrenciler").select("*").order("ad_soyad").limit(5000);
    if (error) setMesaj(error.message); else setListe(data);
  }
  useEffect(() => { if (oturum) yukle(); }, [oturum]);

  const gorunen = useMemo(() => liste.filter((o) =>
    (!sadeceOdemeyen || !o.odendi) &&
    (o.ad_soyad.toLowerCase().includes(q.toLowerCase()) || o.telefon.includes(q.replace(/\D/g, "") || "§"))
  ), [liste, q, sadeceOdemeyen]);

  // Bugün aidat günü olan öğrenci sayısı (Türkiye saatiyle; 29-30'lar kısa ayda ayın son günü)
  const bugunSayi = useMemo(() => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const gun = +p.day, sonGun = new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate();
    return liste.filter((o) => (gun === sonGun ? o.aidat_gunu >= gun : o.aidat_gunu === gun)).length;
  }, [liste]);

  function dogrula(f) {
    const tel = telefonDuzelt(f.telefon), gun = +f.aidat_gunu, tutar = +f.aidat_tutari;
    if (!f.ad_soyad?.trim()) return [null, "Ad soyad boş"];
    if (!tel) return [null, "Telefon geçersiz (05xx xxx xx xx)"];
    if (!(gun >= 1 && gun <= 30)) return [null, "Aidat gününü seçin (1-30)"];
    if (!(tutar > 0)) return [null, "Tutar geçersiz"];
    return [{ ad_soyad: f.ad_soyad.trim(), telefon: tel, aidat_gunu: gun, aidat_tutari: tutar }, null];
  }

  async function ekle(e) {
    e.preventDefault();
    const [v, hata] = dogrula(yeni);
    if (hata) return setMesaj(hata);
    const { error } = await supabase.from("ogrenciler").insert(v);
    if (error) return setMesaj(error.message);
    setYeni({ ad_soyad: "", telefon: "", aidat_gunu: "", aidat_tutari: "" }); setMesaj(""); yukle();
  }

  async function kaydetDuz() {
    const [v, hata] = dogrula(duz);
    if (hata) return setMesaj(hata);
    const borc = Math.max(0, +duz.borc || 0);
    const { error } = await supabase.from("ogrenciler").update({ ...v, borc }).eq("id", duz.id);
    if (error) return setMesaj(error.message);
    setDuz(null); setMesaj(""); yukle();
  }

  const odemeTutari = (o) => (o.borc > 0 ? o.borc : o.aidat_tutari);
  async function odemeDegis(o) {
    if (o.odendi) {   // "Hayır yap": bugün girilen ödeme kaydını da geri al
      await supabase.from("odemeler").delete().eq("ogrenci_id", o.id).eq("tarih", trTarihStr());
      await supabase.from("ogrenciler").update({ odendi: false }).eq("id", o.id);
    } else {
      await supabase.from("odemeler").insert({ ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih: trTarihStr(), tutar: odemeTutari(o) });
      await supabase.from("ogrenciler").update({ odendi: true, borc: 0 }).eq("id", o.id);
    }
    yukle();
  }
  async function topluOdendi() {
    if (!secili.size) return;
    const kisiler = liste.filter((o) => secili.has(o.id) && !o.odendi);
    if (kisiler.length) {
      await supabase.from("odemeler").insert(kisiler.map((o) => ({ ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih: trTarihStr(), tutar: odemeTutari(o) })));
    }
    await supabase.from("ogrenciler").update({ odendi: true, borc: 0 }).in("id", [...secili]);
    setSecili(new Set()); yukle();
  }
  async function mesajDegis(o) {   // veli mesaj istemiyorsa Bugün listesine alınmaz
    await supabase.from("ogrenciler").update({ mesaj_istemiyor: !o.mesaj_istemiyor }).eq("id", o.id);
    yukle();
  }
  async function sil(o) {
    if (!confirm(`${o.ad_soyad} silinsin mi?`)) return;
    await supabase.from("ogrenciler").delete().eq("id", o.id); yukle();
  }

  async function csvYukle(e) {
    const dosya = e.target.files[0]; if (!dosya) return;
    const satirlar = csvOku(await dosya.text());
    const gecerli = [], hatali = [];
    satirlar.forEach((s, i) => { const [v] = dogrula(s); v ? gecerli.push(v) : hatali.push(i + 2); });
    if (gecerli.length) {
      const { error } = await supabase.from("ogrenciler").insert(gecerli);
      if (error) return setMesaj(error.message);
    }
    setMesaj(`${gecerli.length} öğrenci eklendi.` + (hatali.length ? ` Hatalı satırlar: ${hatali.join(", ")}` : ""));
    e.target.value = ""; yukle();
  }

  if (!oturum) return null;
  const toggle = (id) => { const s = new Set(secili); s.has(id) ? s.delete(id) : s.add(id); setSecili(s); };

  return (<>
    <Ust />
    <div className="kap">
      {mesaj && <div className="msg">{mesaj}</div>}
      {bugunSayi > 0 && <div className="msg">Bugün aidat günü olan <b>{bugunSayi}</b> öğrenci var. <a href="/panel/bugun/">Mesajları gönder →</a></div>}

      <div className="kart">
        <b>Öğrenci ekle</b>
        <form onSubmit={ekle} className="satir">
          <input placeholder="Ad Soyad" value={yeni.ad_soyad} onChange={(e) => setYeni({ ...yeni, ad_soyad: e.target.value })} required />{" "}
          <input placeholder="Veli telefonu 05xx..." value={yeni.telefon} onChange={(e) => setYeni({ ...yeni, telefon: e.target.value })} required />{" "}
          <GunSec value={yeni.aidat_gunu} onChange={(g) => setYeni({ ...yeni, aidat_gunu: g })} />{" "}
          <input type="number" placeholder="Aidat TL" style={{ width: 110 }} value={yeni.aidat_tutari} onChange={(e) => setYeni({ ...yeni, aidat_tutari: e.target.value })} required />{" "}
          <button>Ekle</button>
        </form>
        <p style={{ fontSize: 13 }}>Toplu yükleme (CSV: ad_soyad,telefon,aidat_gunu,aidat_tutari):{" "}
          <input type="file" accept=".csv" style={{ width: "auto" }} onChange={csvYukle} /></p>
      </div>

      <div className="satir" style={{ marginBottom: 8 }}>
        <input placeholder="Ara (ad veya telefon)" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />{" "}
        <label><input type="checkbox" style={{ width: "auto" }} checked={sadeceOdemeyen} onChange={(e) => setSO(e.target.checked)} /> Sadece ödemeyenler</label>{" "}
        <button className="gri" onClick={topluOdendi} disabled={!secili.size}>Seçilenleri ödendi yap ({secili.size})</button>{" "}
        <a className="btn" href="/panel/bugun/">Bugünün mesajlarını gönder ({bugunSayi} öğrenci)</a>
      </div>
      <div style={{ fontSize: 13, color: "#555" }}>{gorunen.length} / {liste.length} öğrenci</div>

      <div className="tablo"><table>
        <thead><tr><th></th><th>Ad Soyad</th><th>Telefon</th><th>Gün</th><th>Aidat</th><th>Borç</th><th>Ödendi</th><th>Mesaj</th><th>İşlem</th></tr></thead>
        <tbody>{gorunen.map((o) => duz?.id === o.id ? (
          <tr key={o.id}><td></td>
            <td><input value={duz.ad_soyad} onChange={(e) => setDuz({ ...duz, ad_soyad: e.target.value })} /></td>
            <td><input value={duz.telefon} onChange={(e) => setDuz({ ...duz, telefon: e.target.value })} /></td>
            <td><GunSec value={duz.aidat_gunu} onChange={(g) => setDuz({ ...duz, aidat_gunu: g })} /></td>
            <td><input type="number" style={{ width: 80 }} value={duz.aidat_tutari} onChange={(e) => setDuz({ ...duz, aidat_tutari: e.target.value })} /></td>
            <td><input type="number" style={{ width: 80 }} value={duz.borc} onChange={(e) => setDuz({ ...duz, borc: e.target.value })} /></td>
            <td></td><td></td>
            <td><button onClick={kaydetDuz}>Kaydet</button> <button className="gri" onClick={() => setDuz(null)}>İptal</button></td></tr>
        ) : (
          <tr key={o.id}>
            <td><input type="checkbox" style={{ width: "auto" }} checked={secili.has(o.id)} onChange={() => toggle(o.id)} /></td>
            <td>{o.ad_soyad}</td><td>{o.telefon}</td><td>{o.aidat_gunu}</td><td>{o.aidat_tutari}</td><td>{o.borc}</td>
            <td className={o.odendi ? "evet" : "hayir"}>{o.odendi ? "Evet" : "Hayır"}</td>
            <td className={o.mesaj_istemiyor ? "hayir" : ""}>{o.mesaj_istemiyor ? "Kapalı" : "Açık"}</td>
            <td>
              <button className={o.odendi ? "gri" : ""} onClick={() => odemeDegis(o)}>{o.odendi ? "Hayır yap" : "Ödendi"}</button>{" "}
              <button className="gri" onClick={() => setDuz({ ...o })}>Düzenle</button>{" "}
              <button className="gri" onClick={() => mesajDegis(o)}>{o.mesaj_istemiyor ? "Mesajı aç" : "Mesaj istemiyor"}</button>{" "}
              <button className="kirmizi" onClick={() => sil(o)}>Sil</button>
            </td></tr>))}
        </tbody></table></div>
    </div>
  </>);
}
