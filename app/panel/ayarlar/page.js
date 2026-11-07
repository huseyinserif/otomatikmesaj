"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import Ust from "../../../components/Ust";

export default function Ayarlar() {
  const oturum = useOturum();
  const [f, setF] = useState({ ad: "", wa_token: "", wa_phone_id: "", sablon_adi: "aidat_hatirlatma" });
  const [tokenVar, setTokenVar] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const h = () => ({ Authorization: `Bearer ${oturum.access_token}`, "Content-Type": "application/json" });

  useEffect(() => {
    if (!oturum) return;
    supabase.from("okullar").select("ad").single().then(({ data }) => data && setF((x) => ({ ...x, ad: data.ad || "" })));
    fetch("/api/ayarlar", { headers: h() }).then((r) => r.json()).then((d) => {
      setTokenVar(d.token_var);
      setF((x) => ({ ...x, wa_phone_id: d.phone_id, sablon_adi: d.sablon_adi }));
    });
  }, [oturum]);

  async function kaydet(e) {
    e.preventDefault();
    const r = await fetch("/api/ayarlar", { method: "POST", headers: h(), body: JSON.stringify(f) });
    setMesaj(r.ok ? "Kaydedildi" : "Kaydedilemedi");
    if (r.ok && f.wa_token) { setTokenVar(true); setF({ ...f, wa_token: "" }); }
  }
  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <div className="kart">
        <h2>Ayarlar</h2>
        {mesaj && <div className="msg">{mesaj}</div>}
        <form onSubmit={kaydet}>
          Okul adı<input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
          <h2 style={{ marginTop: 18 }}>WhatsApp bağlantısı</h2>
          <div className="msg">
            WhatsApp durumu: <b>{tokenVar && f.wa_phone_id ? "Bağlı" : "Henüz bağlı değil"}</b>.
            Bu bilgileri Meta (developers.facebook.com) hesabınızdan alırsınız. Kurulum için bizimle iletişime geçebilirsiniz.
          </div>
          Phone Number ID<input value={f.wa_phone_id} onChange={(e) => setF({ ...f, wa_phone_id: e.target.value })} />
          Erişim jetonu (token) {tokenVar && "(kayıtlı, değiştirmek için yenisini yazın)"}
          <input type="password" value={f.wa_token} onChange={(e) => setF({ ...f, wa_token: e.target.value })} autoComplete="off" />
          Onaylı şablon adı<input value={f.sablon_adi} onChange={(e) => setF({ ...f, sablon_adi: e.target.value })} />
          <button>Kaydet</button>
        </form>
      </div>
    </div>
  </>);
}
