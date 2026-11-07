// Cloudflare Worker: /api/* istekleri + günlük zamanlayıcı. Diğer her şey statik siteden (out/) gelir.
import { createClient } from "@supabase/supabase-js";
import { okulIsle, tumIsle, trTarih } from "./lib/gonder.js";

const yeniDb = (env) => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

async function kullanici(request, admin) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  return user;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const admin = yeniDb(env);

    // Ayarlar: token'ı ASLA geri göndermez, sadece "girilmiş mi" bilgisini verir
    if (url.pathname === "/api/ayarlar") {
      const user = await kullanici(request, admin);
      if (!user) return new Response("Yetkisiz", { status: 401 });
      if (request.method === "GET") {
        const { data: g } = await admin.from("okul_gizli").select("wa_token,wa_phone_id,sablon_adi").eq("okul_id", user.id).single();
        return Response.json({ token_var: !!g?.wa_token, phone_id: g?.wa_phone_id || "", sablon_adi: g?.sablon_adi || "aidat_hatirlatma" });
      }
      if (request.method === "POST") {
        const b = await request.json();
        if (b.ad) await admin.from("okullar").update({ ad: String(b.ad).slice(0, 100) }).eq("id", user.id);
        const g = {};
        if (b.wa_token) g.wa_token = String(b.wa_token).trim();
        if (b.wa_phone_id !== undefined) g.wa_phone_id = String(b.wa_phone_id).trim();
        if (b.sablon_adi) g.sablon_adi = String(b.sablon_adi).trim();
        if (Object.keys(g).length) await admin.from("okul_gizli").upsert({ okul_id: user.id, ...g });
        return Response.json({ ok: true });
      }
    }

    // Panelden "Şimdi gönder": giriş yapmış okulun kendi mesajları
    if (url.pathname === "/api/calistir" && request.method === "POST") {
      const user = await kullanici(request, admin);
      if (!user) return new Response("Yetkisiz", { status: 401 });
      const { tarih } = trTarih();
      const { data: okul } = await admin.from("okullar").select("aktif,abonelik_bitis").eq("id", user.id).single();
      if (!okul?.aktif || okul.abonelik_bitis < tarih)
        return Response.json({ hata: "Abonelik süresi dolmuş" }, { status: 403 });
      const butce = Number(env.ISTEK_LIMITI || 45) - 2;
      return Response.json(await okulIsle(admin, user.id, Math.floor((butce - 4) / 2)));
    }

    if (url.pathname.startsWith("/api/")) return new Response("Bulunamadı", { status: 404 });
    return env.ASSETS.fetch(request);
  },

  // wrangler.jsonc > triggers: UTC 07:00-09:50 arası 10 dakikada bir (Türkiye 10:00-12:50)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tumIsle(yeniDb(env), Number(env.ISTEK_LIMITI || 45)));
  },
};
