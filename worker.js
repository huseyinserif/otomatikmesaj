// Cloudflare Worker: /api/calistir + günlük zamanlayıcı. Diğer her şey statik siteden (out/) gelir.
import { createClient } from "@supabase/supabase-js";
import { okulIsle, tumIsle, ortakWa } from "./lib/gonder.js";

const yeniDb = (env) => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Panelden "Şimdi gönder": giriş yapmış okulun kendi mesajları
    if (url.pathname === "/api/calistir" && request.method === "POST") {
      const admin = yeniDb(env);
      const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
      const { data: { user } } = await admin.auth.getUser(token);
      if (!user) return new Response("Yetkisiz", { status: 401 });
      const butce = Number(env.ISTEK_LIMITI || 45) - 2;
      return Response.json(await okulIsle(admin, user.id, Math.floor((butce - 6) / 2), ortakWa(env)));
    }

    if (url.pathname.startsWith("/api/")) return new Response("Bulunamadı", { status: 404 });
    return env.ASSETS.fetch(request);
  },

  // wrangler.jsonc > triggers: UTC 07:00-09:50 arası 10 dakikada bir (Türkiye 10:00-12:50)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tumIsle(yeniDb(env), ortakWa(env), Number(env.ISTEK_LIMITI || 45)));
  },
};
