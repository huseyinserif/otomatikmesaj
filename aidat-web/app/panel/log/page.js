"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import Ust from "../../../components/Ust";

export default function Log() {
  const oturum = useOturum();
  const [liste, setListe] = useState([]);
  const [sadeceHata, setSH] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function yukle() {
    const { data } = await supabase.from("mesaj_log").select("*").order("id", { ascending: false }).limit(500);
    setListe(data || []);
  }
  useEffect(() => { if (oturum) yukle(); }, [oturum]);

  // Her öğrencinin en son "gitti" kaydı (sadece o geri alınabilir, yoksa sonraki mesajın borcu bozulur)
  const sonKayit = {};
  for (const l of liste) if (l.sonuc === "gitti" && !(l.ogrenci_id in sonKayit)) sonKayit[l.ogrenci_id] = l.id;

  async function geriAl(l) {
    if (!confirm(`${l.ad_soyad} için bu mesaj geri alınsın mı? Borç ve ödendi durumu önceki hâline döner, öğrenci tekrar gönderilebilir olur.`)) return;
    const { error } = await supabase.from("mesaj_log").update({ sonuc: "geri_alindi" }).eq("id", l.id);
    if (error) return setMesaj("Geri alınamadı: " + error.message);
    await supabase.from("ogrenciler").update({ borc: l.onceki_borc, odendi: !!l.onceki_odendi }).eq("id", l.ogrenci_id);
    setMesaj("Geri alındı.");
    yukle();
  }

  if (!oturum) return null;
  const g = sadeceHata ? liste.filter((l) => l.sonuc !== "gitti") : liste;
  return (<>
    <Ust />
    <div className="kap">
      <h2>Mesaj kaydı</h2>
      {mesaj && <div className="msg">{mesaj}</div>}
      <label><input type="checkbox" style={{ width: "auto" }} checked={sadeceHata} onChange={(e) => setSH(e.target.checked)} /> Sadece gitmeyenler / geri alınanlar</label>
      <div className="tablo"><table>
        <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Tutar</th><th>Durum</th><th>Detay</th><th></th></tr></thead>
        <tbody>{g.map((l) => (
          <tr key={l.id}><td>{l.tarih}</td><td>{l.ad_soyad}</td><td>{l.tutar}</td>
            <td className={l.sonuc === "gitti" ? "evet" : "hayir"}>{l.sonuc === "geri_alindi" ? "geri alındı" : l.sonuc}</td>
            <td style={{ whiteSpace: "normal" }}>{l.detay}</td>
            <td>{l.sonuc === "gitti" && sonKayit[l.ogrenci_id] === l.id && l.onceki_borc != null &&
              <button className="gri" onClick={() => geriAl(l)}>Geri al</button>}</td></tr>))}
        </tbody></table></div>
    </div>
  </>);
}
