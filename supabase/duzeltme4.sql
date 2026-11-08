-- Okul başına ayrı WhatsApp numarası (Phone Number ID) atama. Supabase > SQL Editor'de bir kere çalıştır.
drop function if exists public.admin_liste();
create function public.admin_liste()
returns table(id uuid, ad text, email text, kredi int, aktif boolean, ogrenci bigint,
              bu_ay_mesaj bigint, iban_var boolean, kendi_numara boolean)
language sql security definer stable set search_path = public as $$
  select k.id, k.ad, k.email, k.kredi, k.aktif,
    (select count(*) from ogrenciler o where o.okul_id = k.id),
    (select count(*) from mesaj_log m where m.okul_id = k.id and m.sonuc = 'gitti'
       and m.tarih >= date_trunc('month', current_date)::date),
    coalesce(k.iban, '') <> '',
    exists(select 1 from okul_gizli g where g.okul_id = k.id and g.wa_phone_id is not null)
  from okullar k where yonetici_mi() order by k.kredi;
$$;

create or replace function public.admin_numara(p_id uuid, p_phone_id text) returns void
language sql security definer set search_path = public as $$
  update okul_gizli set wa_phone_id = nullif(trim(p_phone_id), ''), wa_token = null
  where okul_id = p_id and yonetici_mi();
$$;
