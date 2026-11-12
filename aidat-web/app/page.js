"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Ana() {
  const router = useRouter();
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [bar, setBar] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem("gizlilik_ok")) setBar(true); } catch { setBar(true); }
    // Giriş hatası varsa (Google/Supabase adrese hata yazar) ekrana göster
    const p = new URLSearchParams(location.hash.replace(/^#/, "") || location.search);
    const hata = p.get("error_description") || p.get("error");
    if (hata) setMesaj("Giriş hatası: " + hata);
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/panel"); });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => { if (s) router.replace("/panel"); });
    return () => l.subscription.unsubscribe();
  }, [router]);

  function barKapat() {
    try { localStorage.setItem("gizlilik_ok", "1"); } catch {}
    setBar(false);
  }

  async function googleIleGir() {
    setBekle(true); setMesaj("");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google", options: { redirectTo: `${location.origin}/panel/`, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Giriş adresi oluşturulamadı (Supabase ayarlarını kontrol edin)");
      location.href = data.url;
    } catch (e) {
      setMesaj("Giriş başlatılamadı: " + (e.message || e));
      setBekle(false);
    }
  }

  return (
    <div className="kap" style={{ paddingBottom: bar ? 90 : 16 }}>
      <div className="hero">
        <div>
          <h1>Aidat mesajlarını tek tek yazmayın.</h1>
          <p style={{ margin: "14px 0" }}>Öğrencilerinizi bir kez girin. Aidat günü gelince mesajlar hazır olur, siz sadece WhatsApp'ta Gönder'e basarsınız. Mesaj kendi numaranızdan gider. Ödemeyenin borcu bir sonraki mesaja kendiliğinden eklenir.</p>
        </div>
        <div className="kart">
          <h2>Başlayın</h2>
          <button className="google" onClick={googleIleGir} disabled={bekle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5zM46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-4 6.9-9.9 7-16.6zM10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1zM24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Google ile devam et
          </button>
          <p style={{ fontSize: 13, color: "var(--mut)", margin: "12px 0 0" }}>Şifre yok. 14 gün ücretsiz deneme, kart bilgisi istenmez.</p>
          {mesaj && <div className="msg">{mesaj}</div>}
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 13 }}><a href="/gizlilik/">Gizlilik Politikası</a></p>
      {bar && (
        <div className="altbar" role="region" aria-label="Gizlilik bildirimi">
          <span>Giriş yaparak <a href="/gizlilik/">Gizlilik Politikası</a>'nı okuduğunuzu ve kabul ettiğinizi onaylamış olursunuz.</span>
          <button onClick={barKapat}>Tamam</button>
        </div>
      )}
    </div>
  );
}
