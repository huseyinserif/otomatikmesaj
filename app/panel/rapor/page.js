"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!oturum || !/^\d{4}-\d{2}$/.test(ay)) return;
    const [y, m] = ay.split("-").map(Number);
    const bas = `${ay}-01`, son = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    supabase.from("odemeler").select("*").gte("tarih", bas).lt("tarih", son).order("tarih").limit(5000)
      .then(({ data }) => setOdemeler(data || []));
    supabase.from("mesaj_log").select("*").eq("sonuc", "gitti").gte("tarih", bas).lt("tarih", son).order("tarih").limit(5000)
      .then(({ data }) => setMesajlar(data || []));
  }, [oturum, ay]);

  const toplam = odemeler.reduce((t, o) => t + o.tutar, 0);

  async function ogrenciIndir() {
    const { data } = await supabase.from("ogrenciler").select("*").order("ad_soyad").limit(5000);
    csvIndir("ogrenciler.csv", ["Ad Soyad", "Telefon", "Aidat günü", "Aidat", "Borç", "Ödendi", "Mesaj"],
      (data || []).map((o) => [o.ad_soyad, o.telefon, o.aidat_gunu, o.aidat_tutari, o.borc, o.odendi ? "Evet" : "Hayır", o.mesaj_istemiyor ? "Kapalı" : "Açık"]));
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
      </div>

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
