import { createClient } from "@supabase/supabase-js";
import { okulIsle, trTarih } from "../../lib/gonder.js";

// Panelden "Şimdi gönder": giriş yapmış okulun kendi mesajları
export async function onRequestPost({ request, env }) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } });
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return new Response("Yetkisiz", { status: 401 });

  const { tarih } = trTarih();
  const { data: okul } = await admin.from("okullar").select("aktif,abonelik_bitis").eq("id", user.id).single();
  if (!okul?.aktif || okul.abonelik_bitis < tarih)
    return Response.json({ hata: "Abonelik süresi dolmuş" }, { status: 403 });

  const butce = Number(env.ISTEK_LIMITI || 45) - 2;
  return Response.json(await okulIsle(admin, user.id, Math.floor((butce - 4) / 2)));
}
