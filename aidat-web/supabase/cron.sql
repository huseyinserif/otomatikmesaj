-- Günlük otomatik gönderim. Önce: Supabase > Database > Extensions'dan "pg_cron" ve "pg_net" uzantılarını aç.
-- Sonra aşağıdaki iki yeri kendi değerinle değiştirip SQL Editor'de çalıştır:
--   SITE_ADRESIN  -> örn. aidattakip.pages.dev ya da kendi alan adın (https:// olmadan)
--   CRON_SECRET   -> Cloudflare'e girdiğin CRON_SECRET ile AYNI metin
-- Saat: UTC 07:00-09:50 arası her 10 dakikada (Türkiye 10:00-12:50). Gönderim parça parça devam eder.
select cron.schedule('aidat-gunluk', '*/10 7-9 * * *', $$
  select net.http_get(
    url := 'https://SITE_ADRESIN/api/cron',
    headers := jsonb_build_object('Authorization', 'Bearer CRON_SECRET'),
    timeout_milliseconds := 30000);
$$);

-- Durdurmak için: select cron.unschedule('aidat-gunluk');
