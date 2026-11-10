"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useOturum } from "../../../lib/useOturum";
import { AYLAR } from "../../../lib/util";
import Ust from "../../../components/Ust";

function trBugun() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { tarih: `${p.year}-${p.month}-${p.day}`, gun: +p.day, ayNo: +p.month, sonGun: new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate() };
}
const toplam = (o) => (o.odendi ? o.aidat_tutari : (o.borc || 0) + o.aidat_tutari);

export default function Bugun() {
  const oturum = useOturum();
  const t = useMemo(trBugun, []);
  const [okul, setOkul] = useState(null);
  const [liste, setListe] = useState([]);
  const [gonderilen, setGonderilen] = useState(new Set());
  const [acilan, setAcilan] = useState(new Set());
  const [islem, setIslem] = useState(null);
  const [mesaj, setMesaj] = useState("");

  async function yukle() {
    const { data: o } = await supabase.from("okullar").select("ad,iban,alici,aktif,abonelik_bitis").single();
    setOkul(o);
    const q = supabase.from("ogrenciler").select("*").order("ad_soyad");
    const { data: ogr } = await (t.gun === t.sonGun ? q.gte("aidat_gunu", t.gun) : q.eq("aidat_gunu", t.gun));
    setListe(ogr || []);
    const { data: log } = await supabase.from("mesaj_log").select("ogrenci_id").eq("tarih", t.tarih).eq("sonuc", "gitti");
    setGonderilen(new Set((log || []).map((l) => l.ogrenci_id)));
  }
  useEffect(() => { if (oturum) yukle(); }, [oturum]);

  const abone = okul && okul.aktif && okul.abonelik_bitis >= t.tarih;
  const hazir = abone && okul.iban;

  const metin = (o) =>
    `Sayın veli, ${o.ad_soyad} için ${AYLAR[t.ayNo]} ayı ödenmesi gereken toplam aidat tutarı ${toplam(o)} TL'dir.\n\n` +
    `${okul.ad}\nIBAN: ${okul.iban}\nAlıcı: ${okul.alici || okul.ad}\n\n` +
    `Açıklama kısmına öğrenci adını yazınız.`;
  const link = (o) => `https://wa.me/${o.telefon}?text=${encodeURIComponent(metin(o))}`;

  // "Gönderdim": mesaj kaydı tutulur, borç ve ödendi durumu güncellenir
  async function gonderdim(o) {
    setIslem(o.id);
    const tp = toplam(o);
    const { error } = await supabase.from("mesaj_log").insert({
      ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih: t.tarih, tutar: tp, sonuc: "gitti", detay: "WhatsApp (elle)",
    });
    if (error) { setMesaj("Kaydedilemedi: " + error.message); setIslem(null); return; }
    await supabase.from("ogrenciler").update({ odendi: false, borc: tp }).eq("id", o.id);
    setIslem(null);
    yukle();
  }

  if (!oturum) return null;
  return (<>
    <Ust />
    <div className="kap">
      <h2>Bugünün mesajları</h2>
      {mesaj && <div className="msg hata">{mesaj}</div>}
      {okul && !abone && <div className="msg hata">Abonelik süreniz dolmuş. Yenilemek için bizimle iletişime geçin.</div>}
      {okul && abone && !okul.iban && <div className="msg hata">Mesaja yazılacak IBAN için önce <a href="/panel/ayarlar/">Ayarlar</a>'dan IBAN bilgilerinizi girin.</div>}
      <div className="msg">
        {liste.length === 0 ? "Bugün aidat günü olan öğrenci yok." : <><b>{gonderilen.size} / {liste.length}</b> mesaj gönderildi.</>}
        <br /><small>Her öğrenci için <b>WhatsApp'ta aç</b>'a basın, WhatsApp'ta <b>Gönder</b>'e basın, sonra buraya dönüp <b>Gönderdim</b> deyin. Borç ve ödeme durumu o zaman güncellenir.</small>
      </div>
      {liste.map((o) => {
        const bitti = gonderilen.has(o.id), acildi = acilan.has(o.id);
        return (
          <div className="kart" key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", opacity: bitti ? 0.55 : 1 }}>
            <div style={{ flex: "1 1 220px" }}>
              <b>{o.ad_soyad}</b><br />
              <span style={{ fontSize: 13, color: "var(--mut)" }}>{o.telefon} · {toplam(o)} TL{!o.odendi && o.borc > 0 ? ` (geçmiş borç ${o.borc} dahil)` : ""}</span>
            </div>
            {bitti ? <b>Gönderildi ✓</b> : hazir ? (<>
              <a className="btn" href={link(o)} target="_blank" rel="noopener noreferrer"
                onClick={() => setAcilan(new Set(acilan).add(o.id))}>WhatsApp'ta aç</a>
              <button className={acildi ? "" : "gri"} onClick={() => gonderdim(o)} disabled={islem === o.id}>Gönderdim ✓</button>
            </>) : <span style={{ fontSize: 13, color: "var(--mut)" }}>Gönderim kapalı</span>}
          </div>
        );
      })}
    </div>
  </>);
}
