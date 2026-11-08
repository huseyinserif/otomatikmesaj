// SUNUCU tarafı (Cloudflare Worker): WhatsApp gönderimi, aidat mantığı, kredi düşme
import { AYLAR } from "./util.js";

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const temiz = (t) => String(t ?? "").replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();

export function trTarih() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  const sonGun = new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate();
  return { tarih: `${p.year}-${p.month}-${p.day}`, gun: +p.day, ay: AYLAR[+p.month], sonGun };
}

// Ortak (platform) WhatsApp bilgileri Cloudflare ortam değişkenlerinden gelir
export function ortakWa(env) {
  return { token: env.WA_TOKEN, phone_id: env.WA_PHONE_ID, sablon: env.WA_SABLON || "aidat_hatirlatma" };
}

async function waGonder(wa, telefon, parametreler) {
  if (!wa?.token || !wa?.phone_id) return [false, "WhatsApp bağlantısı kurulmamış"];
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${wa.phone_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${wa.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: telefon, type: "template",
        template: {
          name: wa.sablon, language: { code: "tr" },
          components: [{ type: "body", parameters: parametreler.map((t) => ({ type: "text", text: temiz(t) })) }],
        },
      }),
    });
    if (r.ok) return [true, "ok"];
    return [false, (await r.text()).slice(0, 300)];
  } catch (e) {
    return [false, String(e).slice(0, 300)];
  }
}

// Bir okulun bugünkü mesajlarını gönderir. Her başarılı mesaj 1 kredi harcar.
export async function okulIsle(admin, okulId, maxGonderim, kuresel) {
  const { tarih, gun, ay, sonGun } = trTarih();
  const ogrSorgu = admin.from("ogrenciler").select("*").eq("okul_id", okulId);
  const [{ data: okul }, { data: gizli }, { data: ogrs }, { data: loglar }] = await Promise.all([
    admin.from("okullar").select("ad,iban,alici,kredi,aktif").eq("id", okulId).single(),
    admin.from("okul_gizli").select("*").eq("okul_id", okulId).maybeSingle(),
    // ayın son günüyse, o güne denk gelmeyen 29-30'lar da bugün gider
    gun === sonGun ? ogrSorgu.gte("aidat_gunu", gun) : ogrSorgu.eq("aidat_gunu", gun),
    admin.from("mesaj_log").select("ogrenci_id,sonuc").eq("okul_id", okulId).eq("tarih", tarih),
  ]);

  const gitti = new Set(), hataSay = {};
  for (const l of loglar || []) {
    if (l.sonuc === "gitti") gitti.add(l.ogrenci_id);
    else hataSay[l.ogrenci_id] = (hataSay[l.ogrenci_id] || 0) + 1;
  }
  const bekleyen = (ogrs || []).filter((o) => !gitti.has(o.id) && (hataSay[o.id] || 0) < 2);
  const bos = (neden) => ({ gitti: 0, hata: 0, kalan: bekleyen.length, neden, kullanilan: 4 });

  if (!okul?.aktif) return bos("Hesap durdurulmuş");
  if (!bekleyen.length) return bos(undefined);
  if (!okul.iban) return bos("IBAN girilmemiş (Ayarlar sayfasından girin)");
  if ((okul.kredi || 0) <= 0) return bos("Mesaj krediniz bitti");

  // Token HER ZAMAN senin ortak token'ın. Okulun kendi numarası (Phone Number ID) tanımlıysa mesaj ondan gider,
  // yoksa ortak numaradan. (Okulun kendi token'ı tanımlıysa o kullanılır, bu eski/ileri seçenek.)
  const wa = {
    token: gizli?.wa_token || kuresel.token,
    phone_id: gizli?.wa_phone_id || kuresel.phone_id,
    sablon: gizli?.wa_token ? (gizli.sablon_adi || kuresel.sablon) : kuresel.sablon,
  };

  const bu = bekleyen.slice(0, Math.min(maxGonderim, okul.kredi));
  let g = 0, h = 0;
  const satirlar = [];
  for (const o of bu) {
    const toplam = o.odendi ? o.aidat_tutari : (o.borc || 0) + o.aidat_tutari;
    const [ok, detay] = await waGonder(wa, o.telefon, [
      o.ad_soyad, ay, toplam, okul.ad, okul.iban, okul.alici || okul.ad,
    ]);
    if (ok) {
      await admin.from("ogrenciler").update({ odendi: false, borc: toplam }).eq("id", o.id);
      g++;
    } else h++;
    satirlar.push({ okul_id: okulId, ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih,
      tutar: toplam, sonuc: ok ? "gitti" : "HATA", detay });
    await bekle(100);
  }
  if (satirlar.length) await admin.from("mesaj_log").insert(satirlar);
  if (g > 0) await admin.from("okullar").update({ kredi: Math.max(0, okul.kredi - g) }).eq("id", okulId);
  return { gitti: g, hata: h, kalan: bekleyen.length - bu.length,
           kullanilan: 4 + g * 2 + h + (satirlar.length ? 1 : 0) + (g ? 1 : 0) };
}

// Tüm okullar: Cloudflare'in istek başına dış bağlantı limitine göre parça parça çalışır.
export async function tumIsle(admin, kuresel, butce = 45) {
  const { gun, sonGun } = trTarih();
  const bq = admin.from("ogrenciler").select("okul_id");
  const { data: bugunku } = await (gun === sonGun ? bq.gte("aidat_gunu", gun) : bq.eq("aidat_gunu", gun)).limit(20000);
  const ids = [...new Set((bugunku || []).map((x) => x.okul_id))];
  if (!ids.length) return {};
  const { data: okullar } = await admin.from("okullar").select("id").in("id", ids)
    .eq("aktif", true).gt("kredi", 0);
  butce -= 2;
  const sonuc = {};
  for (const o of okullar || []) {
    if (butce < 10) { sonuc[o.id] = { siradaki_calismada: true }; continue; }
    const r = await okulIsle(admin, o.id, Math.floor((butce - 6) / 2), kuresel);
    butce -= r.kullanilan;
    sonuc[o.id] = r;
  }
  return sonuc;
}
