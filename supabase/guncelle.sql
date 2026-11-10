-- MEVCUT veritabanını son hale getirir. Supabase > SQL Editor'de BİR KERE çalıştır (tekrar çalıştırmak zararsız).
alter table public.okullar add column if not exists email text;
alter table public.okullar add column if not exists iban text;
alter table public.okullar add column if not exists alici text;
alter table public.mesaj_log alter column okul_id set default auth.uid();

-- aidat günü 1-30
alter table public.ogrenciler drop constraint if exists ogrenciler_aidat_gunu_check;
alter table public.ogrenciler add constraint ogrenciler_aidat_gunu_check check (aidat_gunu between 1 and 30);

-- yeni kayıtta okul satırı açan kural (okul_gizli artık yok)
create or replace function public.yeni_okul() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.okullar(id, email, ad)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Yeni Okul'));
  return new;
end $$;

-- eski özellikler kalktı (kredi, QR modu, WhatsApp API bilgileri)
drop function if exists public.admin_liste();
drop function if exists public.admin_kredi(uuid, int);
drop function if exists public.admin_mod(uuid, text);
drop function if exists public.admin_numara(uuid, text);
alter table public.okullar drop column if exists kredi;
alter table public.okullar drop column if exists gonderim;
drop table if exists public.okul_gizli;

-- abonelik kontrolü
create or replace function public.abonelik_var() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from okullar where id = auth.uid() and aktif and abonelik_bitis >= current_date);
$$;

-- abonelik bitince okul verisini görebilir ama ekleyip değiştiremez, mesaj kaydı tutamaz
drop policy if exists ogr_hepsi on public.ogrenciler;
drop policy if exists ogr_oku on public.ogrenciler;
drop policy if exists ogr_yaz on public.ogrenciler;
drop policy if exists ogr_guncelle on public.ogrenciler;
drop policy if exists ogr_sil on public.ogrenciler;
create policy ogr_oku on public.ogrenciler for select using (okul_id = auth.uid());
create policy ogr_yaz on public.ogrenciler for insert with check (okul_id = auth.uid() and abonelik_var());
create policy ogr_guncelle on public.ogrenciler for update
  using (okul_id = auth.uid() and abonelik_var()) with check (okul_id = auth.uid() and abonelik_var());
create policy ogr_sil on public.ogrenciler for delete using (okul_id = auth.uid() and abonelik_var());
drop policy if exists log_ekle on public.mesaj_log;
create policy log_ekle on public.mesaj_log for insert with check (okul_id = auth.uid() and abonelik_var());

-- yönetici paneli
create function public.admin_liste()
returns table(id uuid, ad text, email text, abonelik_bitis date, aktif boolean, ogrenci bigint,
              bu_ay_mesaj bigint, iban_var boolean)
language sql security definer stable set search_path = public as $$
  select k.id, k.ad, k.email, k.abonelik_bitis, k.aktif,
    (select count(*) from ogrenciler o where o.okul_id = k.id),
    (select count(*) from mesaj_log m where m.okul_id = k.id and m.sonuc = 'gitti'
       and m.tarih >= date_trunc('month', current_date)::date),
    coalesce(k.iban, '') <> ''
  from okullar k where yonetici_mi() order by k.abonelik_bitis;
$$;

-- okul sadece kendi adını / IBAN'ını / hesap sahibini değiştirebilir
revoke update on public.okullar from anon, authenticated;
grant update (ad, iban, alici) on public.okullar to authenticated;
drop policy if exists okul_guncelle on public.okullar;
create policy okul_guncelle on public.okullar for update using (id = auth.uid()) with check (id = auth.uid());
