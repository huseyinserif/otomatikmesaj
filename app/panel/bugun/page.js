"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import { AYLAR, sablonDoldur } from "../../../lib/util";
import Ust from "../../../components/Ust";

const YARDIMCI = "http://localhost:3939";   // okulun bilgisayarında çalışan Aidat Yardımcısı

function trBugun() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { tarih: `${p.year}-${p.month}-${p.day}`, gun: +p.day, ayNo: +p.month, sonGun: new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate() };
}
const toplam = (o) => (o.odendi ? o.aidat_tutari : (o.borc || 0) + o.aidat_tutari);

export default function Bugun() {
  const oturum = useOturum();
  const t = useMemo(trBugun, []);
  const [okul, setOkul] = useState(null);
  const [liste, setListe] = useState([]);
  const [atlanan, setAtlanan] = useState(0);
  const [gonderilen, setGonderilen] = useState(new Set());
  const [secili, setSecili] = useState(new Set());
  const [acilan, setAcilan] = useState(new Set());
  const [yardimci, setYardimci] = useState(null);   // null: kontrol ediliyor, "yok": kapalı, nesne: açık
  const [yuklendi, setYuklendi] = useState(false);
  const [otomatik, setOtomatik] = useState(false);
  const [islem, setIslem] = useState(null);
  const [mesaj, setMesaj] = useState("");
  const islenen = useRef(new Set());
  const ilk = useRef(false);
  const otoYapildi = useRef(false);

  useEffect(() => { try { setOtomatik(localStorage.getItem("otomatik") === "1"); } catch {} }, []);

  async function yukle() {
    const { data: o } = await supabase.from("okullar").select("ad,iban,alici,aktif,abonelik_bitis,mesaj_sablonu").single();
    setOkul(o);
    const q = supabase.from("ogrenciler").select("*").order("ad_soyad");
    const { data: tum } = await (t.gun === t.sonGun ? q.gte("aidat_gunu", t.gun) : q.eq("aidat_gunu", t.gun));
    const ogr = (tum || []).filter((x) => !x.mesaj_istemiyor);   // mesaj istemeyen veliler listeye alınmaz
    setAtlanan((tum || []).length - ogr.length);
    setListe(ogr);
    const { data: log } = await supabase.from("mesaj_log").select("ogrenci_id").eq("tarih", t.tarih).eq("sonuc", "gitti");
    const set = new Set((log || []).map((l) => l.ogrenci_id));
    setGonderilen(set);
    if (!ilk.current) { ilk.current = true; setSecili(new Set(ogr.filter((x) => !set.has(x.id)).map((x) => x.id))); }
    setYuklendi(true);
  }
  useEffect(() => { if (oturum) yukle(); }, [oturum]);

  const abone = okul && okul.aktif && okul.abonelik_bitis >= t.tarih;
  const hazir = abone && okul.iban;

  const metin = (o) => sablonDoldur(okul.mesaj_sablonu, {
    ad: o.ad_soyad, ay: AYLAR[t.ayNo], tutar: toplam(o), okul: okul.ad, iban: okul.iban, alici: okul.alici || okul.ad,
  });
  const link = (o) => `https://wa.me/${o.telefon}?text=${encodeURIComponent(metin(o))}`;

  // Sonucu siteye işle: mesaj kaydı + borç/ödendi güncellemesi
  async function kaydet(k) {
    const { error } = await supabase.from("mesaj_log").insert({
      ogrenci_id: k.id, ad_soyad: k.ad, tarih: k.tarih, tutar: k.tutar,
      sonuc: k.durum === "gitti" ? "gitti" : "HATA", detay: k.durum === "gitti" ? "WhatsApp (yardımcı)" : k.detay,
      onceki_borc: k.ob ?? null, onceki_odendi: k.oo ?? null,
    });
    if (error) { setMesaj("Kaydedilemedi: " + error.message); return false; }
    if (k.durum === "gitti") await supabase.from("ogrenciler").update({ odendi: false, borc: k.tutar }).eq("id", k.id);
    return true;
  }

  // Yardımcıyı 3 saniyede bir kontrol et; biten mesajların sonuçlarını siteye işle
  useEffect(() => {
    if (!oturum) return;
    let dur = false;
    async function sor() {
      try {
        const r = await fetch(`${YARDIMCI}/durum`);
        const j = await r.json();
        if (dur) return;
        setYardimci(j);
        const bitenler = (j.kuyruk || []).filter((k) => (k.durum === "gitti" || k.durum === "hata") && !islenen.current.has(k.id));
        if (bitenler.length) {
          const tamam = [];
          for (const k of bitenler) {
            islenen.current.add(k.id);
            if (await kaydet(k)) tamam.push(k.id); else islenen.current.delete(k.id);
          }
          if (tamam.length) {
            await fetch(`${YARDIMCI}/onayla`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: tamam }) });
            yukle();
          }
        }
      } catch { if (!dur) setYardimci("yok"); }
    }
    sor();
    const iv = setInterval(sor, 3000);
    return () => { dur = true; clearInterval(iv); };
  }, [oturum]);

  const kuyrukHarita = useMemo(
    () => Object.fromEntries(((yardimci && yardimci !== "yok" && yardimci.kuyruk) || []).map((k) => [k.id, k])), [yardimci]);
  const bagli = yardimci && yardimci !== "yok" && yardimci.baglandi;
  const beklemede = (o) => ["bekliyor", "gonderiliyor"].includes(kuyrukHarita[o.id]?.durum);
  const secilebilir = liste.filter((o) => !gonderilen.has(o.id) && !beklemede(o));
  const seciliSayi = secilebilir.filter((o) => secili.has(o.id)).length;
  const hepsiSecili = secilebilir.length > 0 && seciliSayi === secilebilir.length;

  function hepsiniSec(v) { setSecili(v ? new Set(secilebilir.map((o) => o.id)) : new Set()); }
  function sec(id) { const s = new Set(secili); s.has(id) ? s.delete(id) : s.add(id); setSecili(s); }

  async function topluGonder(hepsi = false) {
    const items = secilebilir.filter((o) => hepsi || secili.has(o.id)).map((o) => ({
      id: o.id, ad: o.ad_soyad, telefon: o.telefon, metin: metin(o), tutar: toplam(o), ob: o.borc || 0, oo: !!o.odendi,
    }));
    if (!items.length) return;
    if (!hepsi && !confirm(`${items.length} veliye mesaj sıraya alınsın mı? Mesajlar ${yardimci.ara?.[0]}-${yardimci.ara?.[1]} saniye arayla gönderilir.`)) return;
    try {
      const r = await fetch(`${YARDIMCI}/gonder`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) });
      const j = await r.json();
      setMesaj(`${j.eklenen} mesaj sıraya alındı.`);
    } catch { setMesaj("Yardımcıya ulaşılamadı."); }
  }

  // "Sayfa açılınca otomatik gönder" açıksa: yardımcı bağlıyken bir kez, bugünün gönderilmemiş hepsini sıraya alır
  useEffect(() => {
    if (!otomatik || otoYapildi.current || !yuklendi || !bagli || !hazir || secilebilir.length === 0) return;
    otoYapildi.current = true;
    topluGonder(true);
  }, [otomatik, yuklendi, bagli, hazir, secilebilir.length]);

  function otomatikDegis(v) {
    setOtomatik(v);
    try { localStorage.setItem("otomatik", v ? "1" : "0"); } catch {}
    if (!v) otoYapildi.current = false;
  }

  // Sekme başlığında kalan sayı
  useEffect(() => {
    const n = liste.filter((o) => !gonderilen.has(o.id)).length;
    document.title = n > 0 ? `(${n}) Aidat Takip` : "Aidat Takip";
  }, [liste, gonderilen]);

  // Elle gönderim ("WhatsApp'ta aç" + "Gönderdim")
  async function gonderdim(o) {
    setIslem(o.id);
    const tp = toplam(o);
    const { error } = await supabase.from("mesaj_log").insert({
      ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih: t.tarih, tutar: tp, sonuc: "gitti", detay: "WhatsApp (elle)",
      onceki_borc: o.borc || 0, onceki_odendi: !!o.odendi,
    });
    if (error) { setMesaj("Kaydedilemedi: " + error.message); setIslem(null); return; }
    await supabase.from("ogrenciler").update({ odendi: false, borc: tp }).eq("id", o.id);
    setIslem(null);
    yukle();
  }

  // Kurulumsuz hızlı yol: sıradaki velinin WhatsApp'ını aç; "Gönderdim, sıradaki" hem kaydeder hem sonrakini açar
  function siradakiniAc(haric) {
    const s = secilebilir.find((x) => x.id !== haric && !acilan.has(x.id) && secili.has(x.id));
    if (!s) return false;
    window.open(link(s), "_blank", "noopener");
    setAcilan((a) => new Set(a).add(s.id));
    return true;
  }
  async function gonderdimSiradaki(o) {
    siradakiniAc(o.id);   // önce yeni sekmeyi aç (açılır pencere engeline takılmasın), sonra kaydı yaz
    await gonderdim(o);
  }

  if (!oturum) return null;
  const durumYazi = (k) => ({ bekliyor: "Sırada…", gonderiliyor: "Gönderiliyor…", gitti: "Gönderildi, kaydediliyor…",
    hata: "Hata: " + (k?.detay || ""), limit: k?.detay }[k?.durum]);

  return (<>
    <Ust />
    <div className="kap">
      <h2>Bugünün mesajları</h2>
      {mesaj && <div className="msg hata">{mesaj}</div>}
      {okul && !abone && <div className="msg hata">Abonelik süreniz dolmuş. Yenilemek için bizimle iletişime geçin.</div>}
      {okul && abone && !okul.iban && <div className="msg hata">Mesaja yazılacak IBAN için önce <a href="/panel/ayarlar/">Ayarlar</a>'dan IBAN bilgilerinizi girin.</div>}

      <div className="kart">
        {yardimci === null && "Aidat Yardımcısı kontrol ediliyor…"}
        {yardimci === "yok" && <>
          <b>Otomatik gönderim kapalı.</b> Aidat Yardımcısı programı bu bilgisayarda açık değil.
          <br /><small>Programı başlatırsanız tüm mesajlar tek düğmeyle gönderilir. Başlatmadan da aşağıdaki "WhatsApp'ta aç" ile tek tek gönderebilirsiniz.</small>
        </>}
        {yardimci && yardimci !== "yok" && !yardimci.baglandi && <>
          <b>WhatsApp bağlı değil.</b> Telefonda WhatsApp &gt; Bağlı cihazlar &gt; Cihaz bağla ile okutun:
          <br />{yardimci.qr ? <img src={yardimci.qr} alt="QR kod" width={220} height={220} /> : "QR hazırlanıyor…"}
        </>}
        {bagli && <>
          <b>WhatsApp bağlı ✓</b> · Bugün giden: {yardimci.limit?.bugun} / {yardimci.limit?.gunluk} ·
          Gönderim saatleri: {yardimci.pencere?.baslangic}:00-{yardimci.pencere?.bitis}:00 ·
          Mesaj arası: {yardimci.ara?.[0]}-{yardimci.ara?.[1]} sn
          {!yardimci.pencere?.acik && <><br /><small>Şu an gönderim saati dışında, mesajlar {yardimci.pencere?.baslangic}:00'da gönderilmeye başlanır.</small></>}
          <br /><label style={{ fontSize: 14 }}><input type="checkbox" style={{ width: "auto" }} checked={otomatik} onChange={(e) => otomatikDegis(e.target.checked)} />{" "}
            Bu sayfa açılınca bugünün mesajlarını <b>otomatik</b> gönder</label>
        </>}
      </div>

      <div className="msg">
        {liste.length === 0 ? "Bugün aidat günü olan öğrenci yok." : <><b>{gonderilen.size} / {liste.length}</b> mesaj gönderildi.</>}
        {atlanan > 0 && <><br /><small>{atlanan} öğrenci mesaj almak istemediği için listede yok.</small></>}
      </div>

      {liste.length > 0 && hazir && (
        <div className="satir" style={{ marginBottom: 10 }}>
          <label><input type="checkbox" style={{ width: "auto" }} checked={hepsiSecili} onChange={(e) => hepsiniSec(e.target.checked)} /> Hepsini seç</label>{" "}
          <button onClick={() => topluGonder(false)} disabled={!bagli || seciliSayi === 0}>Seçilenleri gönder ({seciliSayi})</button>{" "}
          <button className="gri" onClick={() => siradakiniAc()} disabled={seciliSayi === 0}>Sıradakini WhatsApp'ta aç ▶</button>
        </div>
      )}

      {liste.map((o) => {
        const bitti = gonderilen.has(o.id), acildi = acilan.has(o.id), k = kuyrukHarita[o.id];
        return (
          <div className="kart" key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", opacity: bitti ? 0.55 : 1 }}>
            {!bitti && hazir && <input type="checkbox" style={{ width: "auto" }} checked={secili.has(o.id)} disabled={beklemede(o)} onChange={() => sec(o.id)} />}
            <div style={{ flex: "1 1 220px" }}>
              <b>{o.ad_soyad}</b><br />
              <span style={{ fontSize: 13, color: "var(--mut)" }}>{o.telefon} · {toplam(o)} TL{!o.odendi && o.borc > 0 ? ` (geçmiş borç ${o.borc} dahil)` : ""}</span>
            </div>
            {bitti ? <b>Gönderildi ✓</b> : beklemede(o) || k?.durum === "gitti" ? <span>{durumYazi(k)}</span> : hazir ? (<>
              {k && <span style={{ fontSize: 13 }}>{durumYazi(k)}</span>}
              <a className="btn gri" href={link(o)} target="_blank" rel="noopener noreferrer"
                onClick={() => setAcilan(new Set(acilan).add(o.id))}>WhatsApp'ta aç</a>
              <button className={acildi ? "" : "gri"} onClick={() => gonderdim(o)} disabled={islem === o.id}>Gönderdim ✓</button>
              {acildi && <button onClick={() => gonderdimSiradaki(o)} disabled={islem === o.id}>Gönderdim, sıradaki ▶</button>}
            </>) : <span style={{ fontSize: 13, color: "var(--mut)" }}>Gönderim kapalı</span>}
          </div>
        );
      })}
    </div>
  </>);
}
