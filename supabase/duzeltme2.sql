-- Aidat günü sınırını 1-30 yapar. Supabase > SQL Editor'de bir kez çalıştır.
alter table public.ogrenciler drop constraint if exists ogrenciler_aidat_gunu_check;
alter table public.ogrenciler add constraint ogrenciler_aidat_gunu_check check (aidat_gunu between 1 and 30);
