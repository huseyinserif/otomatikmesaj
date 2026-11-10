"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import Ust from "../../../components/Ust";

export default function Ayarlar() {
  const oturum = useOturum();
  const [f, setF] = useState({ ad: "", iban: "", alici: "" });
  const [bitis, setBitis] = useState("");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    if (!oturum) return;
    supabase.from("okullar").select("ad,iban,alici,abonelik_bitis").single().then(({ data }) => {
      if (data) { setF({ ad: data.ad || "", iban: data.iban || "", alici: data.alici || "" }); setBitis(data.abonelik_bitis); }
    });
  }, [oturum]);

  async function kaydet(e) {
    e.preventDefault();
    const iban = f.iban.replace(/\s/g, "").toUpperCase();
    if (iban && !/^TR\d{24}$/.test(iban)) return setMesaj("IBAN geçersiz: TR ile başlayan 26 karakter olmalı.");
    const { error } = await supabase.from("okullar")
      .update({ ad: f.ad.trim() || "Okul", iban, alici: f.alici.trim() }).eq("id", oturum.user.id);
    setMesaj(error ? "Kaydedilemedi: " + error.message : "Kaydedildi");
    if (!error) setF({ ...f, iban });
  }

  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <div className="kart">
        <h2>Ayarlar</h2>
        {mesaj && <div className="msg">{mesaj}</div>}
        <div className="msg">Aboneliğiniz <b>{bitis}</b> tarihine kadar geçerli.</div>
        <form onSubmit={kaydet}>
          Okul adı (velilere giden mesajda yazar)
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
          IBAN (velilere giden mesajda yazar)
          <input value={f.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" onChange={(e) => setF({ ...f, iban: e.target.value })} />
          Hesap sahibi (alıcı adı)
          <input value={f.alici} placeholder="Boş bırakırsanız okul adı yazılır" onChange={(e) => setF({ ...f, alici: e.target.value })} />
          <button>Kaydet</button>
        </form>
      </div>
    </div>
  </>);
}
