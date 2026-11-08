"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Ust() {
  const [okul, setOkul] = useState(null);
  useEffect(() => {
    supabase.from("okullar").select("ad,aktif,kredi,iban").single().then(({ data }) => setOkul(data));
  }, []);
  return (
    <>
      <nav>
        <b style={{ marginRight: 10 }}>{okul?.ad || "Aidat Takip"}</b>
        <a href="/panel">Öğrenciler</a>
        <a href="/panel/log">Mesaj kaydı</a>
        <a href="/panel/ayarlar">Ayarlar</a>
        <span className="sag">
          {okul && <>Kalan mesaj: <b>{okul.kredi}</b> · </>}
          <button className="link" onClick={async () => { await supabase.auth.signOut(); location.href = "/"; }}>Çıkış</button>
        </span>
      </nav>
      {okul && !okul.aktif && <div className="kap"><div className="msg hata">Hesabınız durdurulmuş, mesajlar gönderilmiyor. Bizimle iletişime geçin.</div></div>}
      {okul?.aktif && !okul.iban && <div className="kap"><div className="msg hata">Mesajların gitmesi için <a href="/panel/ayarlar/">Ayarlar</a> sayfasından IBAN bilgilerinizi girin.</div></div>}
      {okul?.aktif && okul.iban && okul.kredi <= 0 && <div className="kap"><div className="msg hata">Mesaj krediniz bitti, yeni mesajlar gönderilmiyor. Kredi yüklemek için bizimle iletişime geçin.</div></div>}
    </>
  );
}
