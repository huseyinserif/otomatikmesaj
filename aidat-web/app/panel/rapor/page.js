"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import { csvIndir } from "../../../lib/csv";
import { trTarihStr } from "../../../lib/util";
import Ust from "../../../components/Ust";

export default function Rapor() {
  const oturum = useOturum();
  const [ay, setAy] = useState(trTarihStr().slice(0, 7));
  const [odemeler, setOdemeler] = useState([]);
  const [mesajlar, setMesajlar] = useState([]);
  const [yoklama, setYoklama] = useState([]);
  const [ogrenciler, setOgrenciler] = useState([]);

  useEffect(() => {
    if (!oturum || !/^\d{4}-\d{2}$/.test(ay)) return;
    const [y, m] = ay.split("-").map(Number);
    const bas = `${ay}-01`, son = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    supabase.from("odemeler").select("*").gte("tarih", bas).lt("tarih", son).order("tarih").limit(5000)
      .then(({ data }) => setOdemeler(data || []));
    supabase.from("mesaj_log").select("*").eq("sonuc", "gitti").gte("tarih", bas).lt("tarih", son).order("tarih").limit(5000)
      .then(({ data }) => setMesajlar(data || []));
    supabase.from("yoklama").select("ogrenci_id,geldi").gte("tarih", bas).lt("tarih", son).limit(20000)
      .then(({ data }) => setYoklama(data || []));
  }, [oturum, ay]);
  useEffect(() => {
    if (!oturum) return;
    supabase.from("ogrenciler").select("id,ad_soyad,grup").order("ad_soyad").limit(5000).then(({ data }) => setOgrenciler(data || []));
  }, [oturum]);

  const toplam = odemeler.reduce((t, o) => t + o.tutar, 0);

  // Yoklama özeti: öğrenci başına geldi / gelmedi
  const ozet = useMemo(() => {
    const sayac = {};
    for (const r of yoklama) { sayac[r.ogrenci_id] ??= { geldi: 0, gelmedi: 0 }; r.geldi ? sayac[r.ogrenci_id].geldi++ : sayac[r.ogrenci_id].gelmedi++; }
    return ogrenciler.filter((o) => sayac[o.id]).map((o) => {
      const { geldi, gelmedi } = sayac[o.id];
      return { ad: o.ad_soyad, grup: o.grup || "", geldi, gelmedi, oran: Math.round((geldi * 100) / (geldi + gelmedi)) };
    });
  }, [yoklama, ogrenciler]);

  async function ogrenciIndir() {
    const { data } = await supabase.from("ogrenciler").select("*").order("ad_soyad").limit(5000);
    csvIndir("ogrenciler.csv", ["Ad Soyad", "Grup", "Telefon", "Aidat günü", "Aidat", "Borç", "Ödendi", "Mesaj"],
      (data || []).map((o) => [o.ad_soyad, o.grup || "", o.telefon, o.aidat_gunu, o.aidat_tutari, o.borc, o.odendi ? "Evet" : "Hayır", o.mesaj_istemiyor ? "Kapalı" : "Açık"]));
  }

  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <h2>Rapor</h2>
      <div className="satir" style={{ marginBottom: 10 }}>
        Ay: <input type="month" value={ay} onChange={(e) => setAy(e.target.value)} />{" "}
        <button className="gri" onClick={ogrenciIndir}>Öğrenci listesini Excel'e aktar</button>
      </div>
      <div className="stats">
        <div className="kart"><b>{odemeler.length}</b><span>ödeme kaydı</span></div>
        <div className="kart"><b>{toplam} TL</b><span>alınan toplam</span></div>
        <div className="kart"><b>{mesajlar.length}</b><span>giden mesaj</span></div>
        <div className="kart"><b>{yoklama.length}</b><span>yoklama kaydı</span></div>
      </div>

      <h2 style={{ marginTop: 18 }}>Yoklama özeti</h2>
      <button className="gri" disabled={!ozet.length}
        onClick={() => csvIndir(`yoklama-${ay}.csv`, ["Öğrenci", "Grup", "Geldi", "Gelmedi", "Devam %"], ozet.map((o) => [o.ad, o.grup, o.geldi, o.gelmedi, o.oran]))}>Excel'e aktar</button>
      <div className="tablo" style={{ marginTop: 8 }}><table>
        <thead><tr><th>Öğrenci</th><th>Grup</th><th>Geldi</th><th>Gelmedi</th><th>Devam %</th></tr></thead>
        <tbody>{ozet.map((o) => <tr key={o.ad + o.grup}><td>{o.ad}</td><td>{o.grup}</td><td>{o.geldi}</td><td>{o.gelmedi}</td><td>{o.oran}</td></tr>)}</tbody>
      </table></div>

      <h2 style={{ marginTop: 18 }}>Ödemeler</h2>
      <button className="gri" disabled={!odemeler.length}
        onClick={() => csvIndir(`odemeler-${ay}.csv`, ["Tarih", "Öğrenci", "Tutar"], odemeler.map((o) => [o.tarih, o.ad_soyad, o.tutar]))}>Excel'e aktar</button>
      <div className="tablo" style={{ marginTop: 8 }}><table>
        <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Tutar</th></tr></thead>
        <tbody>{odemeler.map((o) => <tr key={o.id}><td>{o.tarih}</td><td>{o.ad_soyad}</td><td>{o.tutar}</td></tr>)}</tbody>
      </table></div>

      <h2 style={{ marginTop: 18 }}>Giden mesajlar</h2>
      <button className="gri" disabled={!mesajlar.length}
        onClick={() => csvIndir(`mesajlar-${ay}.csv`, ["Tarih", "Öğrenci", "Mesajdaki tutar"], mesajlar.map((o) => [o.tarih, o.ad_soyad, o.tutar]))}>Excel'e aktar</button>
      <div className="tablo" style={{ marginTop: 8 }}><table>
        <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Mesajdaki tutar</th></tr></thead>
        <tbody>{mesajlar.map((o) => <tr key={o.id}><td>{o.tarih}</td><td>{o.ad_soyad}</td><td>{o.tutar}</td></tr>)}</tbody>
      </table></div>
    </div>
  </>);
}
