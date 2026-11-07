import { createClient } from "@supabase/supabase-js";

async function kullanici(request, env) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } });
  const { data: { user } } = await admin.auth.getUser(token);
  return { admin, user };
}

// Token'ı ASLA geri göndermez; sadece "girilmiş mi" bilgisini verir
export async function onRequestGet({ request, env }) {
  const { admin, user } = await kullanici(request, env);
  if (!user) return new Response("Yetkisiz", { status: 401 });
  const { data: g } = await admin.from("okul_gizli").select("wa_token,wa_phone_id,sablon_adi").eq("okul_id", user.id).single();
  return Response.json({
    token_var: !!g?.wa_token, phone_id: g?.wa_phone_id || "", sablon_adi: g?.sablon_adi || "aidat_hatirlatma",
  });
}

export async function onRequestPost({ request, env }) {
  const { admin, user } = await kullanici(request, env);
  if (!user) return new Response("Yetkisiz", { status: 401 });
  const b = await request.json();
  if (b.ad) await admin.from("okullar").update({ ad: String(b.ad).slice(0, 100) }).eq("id", user.id);
  const g = {};
  if (b.wa_token) g.wa_token = String(b.wa_token).trim();
  if (b.wa_phone_id !== undefined) g.wa_phone_id = String(b.wa_phone_id).trim();
  if (b.sablon_adi) g.sablon_adi = String(b.sablon_adi).trim();
  if (Object.keys(g).length) await admin.from("okul_gizli").upsert({ okul_id: user.id, ...g });
  return Response.json({ ok: true });
}
