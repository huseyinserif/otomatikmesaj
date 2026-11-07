"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import Ust from "../../../components/Ust";

export default function Log() {
  const oturum = useOturum();
  const [liste, setListe] = useState([]);
  const [sadeceHata, setSH] = useState(false);
  useEffect(() => {
    if (!oturum) return;
    supabase.from("mesaj_log").select("*").order("id", { ascending: false }).limit(500)
      .then(({ data }) => setListe(data || []));
  }, [oturum]);
  if (!oturum) return null;
  const g = sadeceHata ? liste.filter((l) => l.sonuc !== "gitti") : liste;
  return (<>
    <Ust />
    <div className="kap">
      <h2>Mesaj kaydı</h2>
      <label><input type="checkbox" style={{ width: "auto" }} checked={sadeceHata} onChange={(e) => setSH(e.target.checked)} /> Sadece gitmeyenler</label>
      <div className="tablo"><table>
        <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Tutar</th><th>Durum</th><th>Detay</th></tr></thead>
        <tbody>{g.map((l) => (
          <tr key={l.id}><td>{l.tarih}</td><td>{l.ad_soyad}</td><td>{l.tutar}</td>
            <td className={l.sonuc === "gitti" ? "evet" : "hayir"}>{l.sonuc}</td>
            <td style={{ whiteSpace: "normal" }}>{l.detay}</td></tr>))}
        </tbody></table></div>
    </div>
  </>);
}
