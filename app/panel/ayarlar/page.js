"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import { VARSAYILAN_SABLON, sablonDoldur } from "../../../lib/util";
import Ust from "../../../components/Ust";

export default function Ayarlar() {
  const oturum = useOturum();
  const [f, setF] = useState({ ad: "", iban: "", alici: "", sablon: VARSAYILAN_SABLON });
  const [bitis, setBitis] = useState("");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    if (!oturum) return;
    supabase.from("okullar").select("ad,iban,alici,abonelik_bitis,mesaj_sablonu").single().then(({ data }) => {
      if (data) {
        setF({ ad: data.ad || "", iban: data.iban || "", alici: data.alici || "", sablon: data.mesaj_sablonu || VARSAYILAN_SABLON });
        setBitis(data.abonelik_bitis);
      }
    });
  }, [oturum]);

  async function kaydet(e) {
    e.preventDefault();
    const iban = f.iban.replace(/\s/g, "").toUpperCase();
    if (iban && !/^TR\d{24}$/.test(iban)) return setMesaj("IBAN geçersiz: TR ile başlayan 26 karakter olmalı.");
    const sablon = f.sablon.trim();
    const { error } = await supabase.from("okullar").update({
      ad: f.ad.trim() || "Okul", iban, alici: f.alici.trim(),
      mesaj_sablonu: !sablon || sablon === VARSAYILAN_SABLON ? null : sablon,
    }).eq("id", oturum.user.id);
    setMesaj(error ? "Kaydedilemedi: " + error.message : "Kaydedildi");
    if (!error) setF({ ...f, iban });
  }

  const onizleme = sablonDoldur(f.sablon, { ad: "Ali Yılmaz", ay: "Kasım", tutar: 2000, okul: f.ad || "Okul adı", iban: f.iban || "TR00...", alici: f.alici || f.ad || "Okul adı" });

  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <div className="kart">
        <h2>Ayarlar</h2>
        {mesaj && <div className="msg">{mesaj}</div>}
        <div className="msg">Aboneliğiniz <b>{bitis}</b> tarihine kadar geçerli.</div>
        <form onSubmit={kaydet}>
          Okul adı
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
          IBAN
          <input value={f.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" onChange={(e) => setF({ ...f, iban: e.target.value })} />
          Hesap sahibi (alıcı adı)
          <input value={f.alici} placeholder="Boş bırakırsanız okul adı yazılır" onChange={(e) => setF({ ...f, alici: e.target.value })} />
          <h2 style={{ marginTop: 18 }}>Velilere giden mesaj</h2>
          <small>Kullanabileceğiniz alanlar: {"{ad}"} öğrenci, {"{ay}"} ay, {"{tutar}"} tutar, {"{okul}"}, {"{iban}"}, {"{alici}"}</small>
          <textarea rows={8} value={f.sablon} onChange={(e) => setF({ ...f, sablon: e.target.value })}
            style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "inherit", font: "inherit" }} />
          <div className="msg" style={{ whiteSpace: "pre-wrap" }}><b>Önizleme</b>{"\n"}{onizleme}</div>
          <button>Kaydet</button>{" "}
          <button type="button" className="gri" onClick={() => setF({ ...f, sablon: VARSAYILAN_SABLON })}>Varsayılan metne dön</button>
        </form>
      </div>
    </div>
  </>);
}
