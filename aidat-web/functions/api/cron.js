import { createClient } from "@supabase/supabase-js";
import { tumIsle } from "../../lib/gonder.js";

// Supabase zamanlayıcısı bunu çağırır (supabase/cron.sql)
export async function onRequestGet({ request, env }) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`)
    return new Response("Yetkisiz", { status: 401 });
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } });
  return Response.json(await tumIsle(admin, Number(env.ISTEK_LIMITI || 45)));
}
