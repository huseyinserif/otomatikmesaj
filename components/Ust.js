"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Ust() {
  const [okul, setOkul] = useState(null);
  useEffect(() => {
    supabase.from("okullar").select("ad,aktif,abonelik_bitis,iban").single().then(({ data }) => setOkul(data));
  }, []);
  const bugun = new Date().toISOString().slice(0, 10);
  const bitti = okul && okul.abonelik_bitis < bugun;
  return (
    <>
      <nav>
        <b style={{ marginRight: 10 }}>{okul?.ad || "Aidat Takip"}</b>
        <a href="/panel">Öğrenciler</a>
        <a href="/panel/bugun">Bugün</a>
        <a href="/panel/log">Mesaj kaydı</a>
        <a href="/panel/ayarlar">Ayarlar</a>
        <span className="sag">
          {okul && <>Abonelik: {okul.abonelik_bitis} · </>}
          <button className="link" onClick={async () => { await supabase.auth.signOut(); location.href = "/"; }}>Çıkış</button>
        </span>
      </nav>
      {okul && !okul.aktif && <div className="kap"><div className="msg hata">Hesabınız durdurulmuş. Bizimle iletişime geçin.</div></div>}
      {okul?.aktif && bitti && <div className="kap"><div className="msg hata">Abonelik süreniz doldu, öğrenci ekleme ve mesaj gönderme kapalı. Yenilemek için bizimle iletişime geçin.</div></div>}
      {okul?.aktif && !bitti && !okul.iban && <div className="kap"><div className="msg hata">Mesaja yazılması için <a href="/panel/ayarlar/">Ayarlar</a> sayfasından IBAN bilgilerinizi girin.</div></div>}
    </>
  );
}
