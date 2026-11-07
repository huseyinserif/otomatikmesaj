-- Supabase > SQL Editor'e yapıştırıp çalıştır

create table okullar (
  id uuid primary key references auth.users(id) on delete cascade,
  ad text default 'Yeni Okul',
  email text,
  abonelik_bitis date not null default (current_date + 14),  -- 14 gün deneme
  aktif boolean not null default true
);

-- WhatsApp bilgileri: SADECE sunucu (service role) görür, panelden okunamaz
create table okul_gizli (
  okul_id uuid primary key references okullar(id) on delete cascade,
  wa_token text,
  wa_phone_id text,
  sablon_adi text default 'aidat_hatirlatma'
);

create table ogrenciler (
  id bigint generated always as identity primary key,
  okul_id uuid not null references okullar(id) on delete cascade default auth.uid(),
  ad_soyad text not null,
  telefon text not null,
  aidat_gunu int not null check (aidat_gunu between 1 and 28),
  aidat_tutari int not null check (aidat_tutari > 0),
  odendi boolean not null default false,
  borc int not null default 0,
  created_at timestamptz default now()
);
create index on ogrenciler(okul_id, aidat_gunu);

create table mesaj_log (
  id bigint generated always as identity primary key,
  okul_id uuid not null references okullar(id) on delete cascade,
  ogrenci_id bigint,
  ad_soyad text,
  tarih date not null,
  tutar int,
  sonuc text not null,   -- 'gitti' | 'HATA'
  detay text,
  created_at timestamptz default now()
);
create index on mesaj_log(okul_id, tarih);

-- Yeni kullanıcı (okul) açılınca otomatik okullar satırı oluştur
create function yeni_okul() returns trigger language plpgsql security definer as $$
begin
  insert into okullar(id, email, ad) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Yeni Okul'));
  insert into okul_gizli(okul_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function yeni_okul();

-- Güvenlik: herkes sadece kendi okulunun verisini görür
alter table okullar enable row level security;
alter table okul_gizli enable row level security;   -- politika yok = panelden erişim yok
alter table ogrenciler enable row level security;
alter table mesaj_log enable row level security;

create policy okul_oku on okullar for select using (id = auth.uid());
create policy ogr_hepsi on ogrenciler for all
  using (okul_id = auth.uid()) with check (okul_id = auth.uid());
create policy log_oku on mesaj_log for select using (okul_id = auth.uid());

-- ============ YÖNETİCİ (admin.html için) ============
create table yoneticiler (email text primary key);
alter table yoneticiler enable row level security;   -- politika yok: sadece fonksiyonlar okur
insert into yoneticiler(email) values ('keleshusein3@gmail.com');

create function yonetici_mi() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from yoneticiler
                where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create function admin_liste()
returns table(id uuid, ad text, email text, abonelik_bitis date, aktif boolean,
              ogrenci bigint, bu_ay_mesaj bigint, wa_bagli boolean)
language sql security definer stable set search_path = public as $$
  select k.id, k.ad, k.email, k.abonelik_bitis, k.aktif,
    (select count(*) from ogrenciler o where o.okul_id = k.id),
    (select count(*) from mesaj_log m where m.okul_id = k.id and m.sonuc = 'gitti'
       and m.tarih >= date_trunc('month', current_date)::date),
    exists(select 1 from okul_gizli g where g.okul_id = k.id
       and g.wa_token is not null and g.wa_phone_id is not null)
  from okullar k
  where yonetici_mi()
  order by k.abonelik_bitis;
$$;

create function admin_uzat(p_id uuid, p_gun int) returns void
language sql security definer set search_path = public as $$
  update okullar set abonelik_bitis = greatest(abonelik_bitis, current_date) + p_gun
  where id = p_id and yonetici_mi();
$$;

create function admin_durum(p_id uuid, p_aktif boolean) returns void
language sql security definer set search_path = public as $$
  update okullar set aktif = p_aktif where id = p_id and yonetici_mi();
$$;
