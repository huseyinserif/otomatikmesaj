// SUNUCU tarafı (Cloudflare Pages Functions): WhatsApp gönderimi ve aidat mantığı
import { AYLAR } from "./util.js";

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

export function trTarih() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  const sonGun = new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate();
  return { tarih: `${p.year}-${p.month}-${p.day}`, gun: +p.day, ay: AYLAR[+p.month], sonGun };
}

async function waGonder(gizli, telefon, ad, ay, tutar) {
  if (!gizli?.wa_token || !gizli?.wa_phone_id) return [false, "WhatsApp bilgileri girilmemiş"];
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${gizli.wa_phone_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${gizli.wa_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: telefon, type: "template",
        template: {
          name: gizli.sablon_adi || "aidat_hatirlatma", language: { code: "tr" },
          components: [{ type: "body", parameters: [
            { type: "text", text: ad }, { type: "text", text: ay }, { type: "text", text: String(tutar) },
          ] }],
        },
      }),
    });
    if (r.ok) return [true, "ok"];
    return [false, (await r.text()).slice(0, 300)];
  } catch (e) {
    return [false, String(e).slice(0, 300)];
  }
}

// Bir okulun bugünkü mesajlarını gönderir (en fazla maxGonderim kişiye).
// Bugün gitmiş olana tekrar atmaz; bugün 2 kez hata almış olanı bırakır.
export async function okulIsle(admin, okulId, maxGonderim = 1e9) {
  const { tarih, gun, ay, sonGun } = trTarih();
  const ogrSorgu = admin.from("ogrenciler").select("*").eq("okul_id", okulId);
  const [{ data: gizli }, { data: ogrs }, { data: loglar }] = await Promise.all([
    admin.from("okul_gizli").select("*").eq("okul_id", okulId).single(),
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
  const bu = bekleyen.slice(0, maxGonderim);

  let g = 0, h = 0;
  const satirlar = [];
  for (const o of bu) {
    const toplam = o.odendi ? o.aidat_tutari : (o.borc || 0) + o.aidat_tutari;
    const [ok, detay] = await waGonder(gizli, o.telefon, o.ad_soyad, ay, toplam);
    if (ok) {
      await admin.from("ogrenciler").update({ odendi: false, borc: toplam }).eq("id", o.id);
      g++;
    } else h++;
    satirlar.push({ okul_id: okulId, ogrenci_id: o.id, ad_soyad: o.ad_soyad, tarih,
      tutar: toplam, sonuc: ok ? "gitti" : "HATA", detay });
    await bekle(100);
  }
  if (satirlar.length) await admin.from("mesaj_log").insert(satirlar);
  return { gitti: g, hata: h, kalan: bekleyen.length - bu.length,
           kullanilan: 3 + g * 2 + h + (satirlar.length ? 1 : 0) };
}

// Tüm okullar: Cloudflare'in istek başına dış bağlantı limitine göre parça parça çalışır.
// butce: ücretsiz planda 50, ücretli planda 1000 (güvenli pay bırakılır)
export async function tumIsle(admin, butce = 45) {
  const { tarih, gun, sonGun } = trTarih();
  const bq = admin.from("ogrenciler").select("okul_id");
  const { data: bugunku } = await (gun === sonGun ? bq.gte("aidat_gunu", gun) : bq.eq("aidat_gunu", gun)).limit(20000);
  const ids = [...new Set((bugunku || []).map((x) => x.okul_id))];
  if (!ids.length) return {};
  const { data: okullar } = await admin.from("okullar").select("id").in("id", ids)
    .eq("aktif", true).gte("abonelik_bitis", tarih);
  butce -= 2;
  const sonuc = {};
  for (const o of okullar || []) {
    if (butce < 8) { sonuc[o.id] = { siradaki_calismada: true }; continue; }
    const r = await okulIsle(admin, o.id, Math.floor((butce - 4) / 2));
    butce -= r.kullanilan;
    sonuc[o.id] = r;
  }
  return sonuc;
}
