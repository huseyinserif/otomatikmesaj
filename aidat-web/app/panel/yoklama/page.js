"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import { trTarihStr } from "../../../lib/util";
import Ust from "../../../components/Ust";

const gunEkle = (tarih, n) => { const d = new Date(tarih + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const gunAdi = (tarih) => new Date(tarih + "T00:00:00Z").toLocaleDateString("tr-TR", { weekday: "long", timeZone: "UTC" });

export default function Yoklama() {
  const oturum = useOturum();
  const [tarih, setTarih] = useState(trTarihStr());
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayit, setKayit] = useState({});   // ogrenci_id -> true (geldi) / false (gelmedi); yoksa işaretlenmemiş
  const [grup, setGrup] = useState("");
  const [q, setQ] = useState("");
  const [abone, setAbone] = useState(true);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    if (!oturum) return;
    supabase.from("okullar").select("aktif,abonelik_bitis").single()
      .then(({ data }) => setAbone(!!data && data.aktif && data.abonelik_bitis >= trTarihStr()));
    supabase.from("ogrenciler").select("id,ad_soyad,grup").order("ad_soyad").limit(5000)
      .then(({ data }) => setOgrenciler(data || []));
  }, [oturum]);

  async function yukleYoklama() {
    const { data } = await supabase.from("yoklama").select("ogrenci_id,geldi").eq("tarih", tarih).limit(5000);
    setKayit(Object.fromEntries((data || []).map((r) => [r.ogrenci_id, r.geldi])));
  }
  useEffect(() => { if (oturum) yukleYoklama(); }, [oturum, tarih]);

  const gruplar = useMemo(() => [...new Set(ogrenciler.map((o) => o.grup).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")), [ogrenciler]);
  const gorunen = ogrenciler.filter((o) =>
    (grup === "" || (grup === "__yok" ? !o.grup : o.grup === grup)) &&
    o.ad_soyad.toLowerCase().includes(q.toLowerCase()));

  // Aynı düğmeye tekrar basınca işaret kalkar
  async function isaretle(o, geldi) {
    const ayni = kayit[o.id] === geldi;
    setKayit((k) => { const y = { ...k }; if (ayni) delete y[o.id]; else y[o.id] = geldi; return y; });
    const { error } = ayni
      ? await supabase.from("yoklama").delete().eq("ogrenci_id", o.id).eq("tarih", tarih)
      : await supabase.from("yoklama").upsert({ ogrenci_id: o.id, tarih, geldi }, { onConflict: "ogrenci_id,tarih" });
    if (error) { setMesaj("Kaydedilemedi: " + error.message); yukleYoklama(); } else setMesaj("");
  }

  async function hepsiGeldi() {
    const hedef = gorunen.filter((o) => !(o.id in kayit));
    if (!hedef.length) return;
    const { error } = await supabase.from("yoklama").upsert(hedef.map((o) => ({ ogrenci_id: o.id, tarih, geldi: true })), { onConflict: "ogrenci_id,tarih" });
    if (error) return setMesaj("Kaydedilemedi: " + error.message);
    setMesaj(""); yukleYoklama();
  }

  const geldi = gorunen.filter((o) => kayit[o.id] === true).length;
  const gelmedi = gorunen.filter((o) => kayit[o.id] === false).length;
  const bos = gorunen.length - geldi - gelmedi;

  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <h2>Yoklama</h2>
      {mesaj && <div className="msg hata">{mesaj}</div>}
      {!abone && <div className="msg hata">Abonelik süreniz dolmuş, yoklama kaydı kapalı. Yenilemek için bizimle iletişime geçin.</div>}

      <div className="satir" style={{ marginBottom: 8 }}>
        <button className="gri" onClick={() => setTarih(gunEkle(tarih, -1))} aria-label="Önceki gün">‹</button>{" "}
        <input type="date" value={tarih} onChange={(e) => e.target.value && setTarih(e.target.value)} />{" "}
        <button className="gri" onClick={() => setTarih(gunEkle(tarih, 1))} aria-label="Sonraki gün">›</button>{" "}
        <button className="gri" onClick={() => setTarih(trTarihStr())}>Bugün</button>{" "}
        <b style={{ textTransform: "capitalize" }}>{gunAdi(tarih)}</b>
      </div>
      <div className="satir" style={{ marginBottom: 10 }}>
        <select value={grup} onChange={(e) => setGrup(e.target.value)}>
          <option value="">Tüm gruplar</option>
          {gruplar.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="__yok">Grubu olmayanlar</option>
        </select>{" "}
        <input placeholder="Ara" style={{ width: 160 }} value={q} onChange={(e) => setQ(e.target.value)} />{" "}
        <button onClick={hepsiGeldi} disabled={!abone || bos === 0}>İşaretlenmemiş hepsi geldi ({bos})</button>
      </div>

      <div className="stats">
        <div className="kart"><b>{geldi}</b><span>geldi</span></div>
        <div className="kart"><b>{gelmedi}</b><span>gelmedi</span></div>
        <div className="kart"><b>{bos}</b><span>işaretlenmedi</span></div>
      </div>

      {ogrenciler.length === 0 && <div className="msg">Önce Öğrenciler sayfasından öğrenci ekleyin. Gruplara ayırmak için öğrenci eklerken "Grup / sınıf" alanını doldurun.</div>}
      {gorunen.map((o) => {
        const d = kayit[o.id];
        return (
          <div className="kart" key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <b>{o.ad_soyad}</b>
              {o.grup && <><br /><span style={{ fontSize: 13, color: "var(--mut)" }}>{o.grup}</span></>}
            </div>
            <button className={d === true ? "" : "gri"} disabled={!abone} onClick={() => isaretle(o, true)} style={{ minWidth: 100 }}>✓ Geldi</button>
            <button className={d === false ? "kirmizi" : "gri"} disabled={!abone} onClick={() => isaretle(o, false)} style={{ minWidth: 100, fontWeight: d === false ? 700 : 400 }}>✗ Gelmedi</button>
          </div>
        );
      })}
    </div>
  </>);
}
