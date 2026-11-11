-- SIFIRDAN kurulum (yeni bir Supabase projesi için). Mevcut veritabanında guncelle.sql kullan.
create table okullar (
  id uuid primary key references auth.users(id) on delete cascade,
  ad text default 'Yeni Okul',
  email text,
  abonelik_bitis date not null default (current_date + 14),   -- 14 gün ücretsiz deneme
  aktif boolean not null default true,
  iban text,
  alici text
);

create table ogrenciler (
  id bigint generated always as identity primary key,
  okul_id uuid not null references okullar(id) on delete cascade default auth.uid(),
  ad_soyad text not null,
  telefon text not null,
  aidat_gunu int not null check (aidat_gunu between 1 and 30),
  aidat_tutari int not null check (aidat_tutari > 0),
  odendi boolean not null default false,
  borc int not null default 0,
  created_at timestamptz default now()
);
create index on ogrenciler(okul_id, aidat_gunu);

create table mesaj_log (
  id bigint generated always as identity primary key,
  okul_id uuid not null references okullar(id) on delete cascade default auth.uid(),
  ogrenci_id bigint,
  ad_soyad text,
  tarih date not null,
  tutar int,
  sonuc text not null,
  detay text,
  created_at timestamptz default now()
);
create index on mesaj_log(okul_id, tarih);

create function public.yeni_okul() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.okullar(id, email, ad)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Yeni Okul'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.yeni_okul();

create table yoneticiler (email text primary key);
alter table yoneticiler enable row level security;
insert into yoneticiler(email) values ('keleshusein3@gmail.com');

create function public.yonetici_mi() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from yoneticiler where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create function public.abonelik_var() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from okullar where id = auth.uid() and aktif and abonelik_bitis >= current_date);
$$;

alter table okullar enable row level security;
alter table ogrenciler enable row level security;
alter table mesaj_log enable row level security;
create policy okul_oku on okullar for select using (id = auth.uid());
create policy okul_guncelle on okullar for update using (id = auth.uid()) with check (id = auth.uid());
create policy ogr_oku on ogrenciler for select using (okul_id = auth.uid());
create policy ogr_yaz on ogrenciler for insert with check (okul_id = auth.uid() and abonelik_var());
create policy ogr_guncelle on ogrenciler for update
  using (okul_id = auth.uid() and abonelik_var()) with check (okul_id = auth.uid() and abonelik_var());
create policy ogr_sil on ogrenciler for delete using (okul_id = auth.uid() and abonelik_var());
create policy log_oku on mesaj_log for select using (okul_id = auth.uid());
create policy log_ekle on mesaj_log for insert with check (okul_id = auth.uid() and abonelik_var());

revoke update on public.okullar from anon, authenticated;
grant update (ad, iban, alici) on public.okullar to authenticated;

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
create function public.admin_uzat(p_id uuid, p_gun int) returns void
language sql security definer set search_path = public as $$
  update okullar set abonelik_bitis = greatest(abonelik_bitis, current_date) + p_gun
  where id = p_id and yonetici_mi();
$$;
create function public.admin_durum(p_id uuid, p_aktif boolean) returns void
language sql security definer set search_path = public as $$
  update okullar set aktif = p_aktif where id = p_id and yonetici_mi();
$$;

-- ===== Yeni özellikler: mesaj şablonu, mesaj istemeyen veli, geri alma, ödeme geçmişi =====
alter table public.okullar add column if not exists mesaj_sablonu text;
alter table public.ogrenciler add column if not exists mesaj_istemiyor boolean not null default false;
alter table public.mesaj_log add column if not exists onceki_borc int;
alter table public.mesaj_log add column if not exists onceki_odendi boolean;

create table if not exists public.odemeler (
  id bigint generated always as identity primary key,
  okul_id uuid not null references public.okullar(id) on delete cascade default auth.uid(),
  ogrenci_id bigint,
  ad_soyad text,
  tarih date not null default current_date,
  tutar int not null,
  created_at timestamptz default now()
);
create index if not exists odemeler_okul_tarih on public.odemeler(okul_id, tarih);
alter table public.odemeler enable row level security;
drop policy if exists odeme_oku on public.odemeler;
drop policy if exists odeme_ekle on public.odemeler;
drop policy if exists odeme_sil on public.odemeler;
create policy odeme_oku on public.odemeler for select using (okul_id = auth.uid());
create policy odeme_ekle on public.odemeler for insert with check (okul_id = auth.uid() and abonelik_var());
create policy odeme_sil on public.odemeler for delete using (okul_id = auth.uid() and abonelik_var());

-- okul sadece kendi adını / IBAN'ını / hesap sahibini / mesaj şablonunu değiştirebilir
revoke update on public.okullar from anon, authenticated;
grant update (ad, iban, alici, mesaj_sablonu) on public.okullar to authenticated;
-- mesaj kaydında sadece "sonuç" alanı değiştirilebilir (geri alma için)
revoke update on public.mesaj_log from anon, authenticated;
grant update (sonuc) on public.mesaj_log to authenticated;
drop policy if exists log_guncelle on public.mesaj_log;
create policy log_guncelle on public.mesaj_log for update
  using (okul_id = auth.uid() and abonelik_var()) with check (okul_id = auth.uid() and abonelik_var());
