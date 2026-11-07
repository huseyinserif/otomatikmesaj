"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Ust() {
  const [okul, setOkul] = useState(null);
  useEffect(() => {
    supabase.from("okullar").select("ad,abonelik_bitis,aktif").single().then(({ data }) => setOkul(data));
  }, []);
  const bugun = new Date().toISOString().slice(0, 10);
  const bitti = okul && (!okul.aktif || okul.abonelik_bitis < bugun);
  return (
    <>
      <nav>
        <b style={{ marginRight: 10 }}>{okul?.ad || "Aidat Takip"}</b>
        <a href="/panel">Öğrenciler</a>
        <a href="/panel/log">Mesaj kaydı</a>
        <a href="/panel/ayarlar">Ayarlar</a>
        <span className="sag">
          {okul && <>Abonelik: {okul.abonelik_bitis} · </>}
          <button className="link" onClick={async () => { await supabase.auth.signOut(); location.href = "/"; }}>Çıkış</button>
        </span>
      </nav>
      {bitti && <div className="kap"><div className="msg hata">
        Abonelik süreniz doldu, mesajlar gönderilmiyor. Yenilemek için bizimle iletişime geçin.
      </div></div>}
    </>
  );
}
