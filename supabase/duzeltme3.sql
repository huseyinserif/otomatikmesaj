-- Ortak WhatsApp + mesaj kredisi sistemi. Supabase > SQL Editor'de bir kez çalıştır.
alter table public.okullar add column if not exists iban text;
alter table public.okullar add column if not exists alici text;
alter table public.okullar add column if not exists kredi int not null default 20;

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
    exists(select 1 from okul_gizli g where g.okul_id = k.id
       and g.wa_token is not null and g.wa_phone_id is not null)
  from okullar k where yonetici_mi() order by k.kredi;
$$;

create or replace function public.admin_kredi(p_id uuid, p_adet int) returns void
language sql security definer set search_path = public as $$
  update okullar set kredi = greatest(0, kredi + p_adet) where id = p_id and yonetici_mi();
$$;

revoke update on public.okullar from anon, authenticated;
grant update (ad, iban, alici) on public.okullar to authenticated;
drop policy if exists okul_guncelle on public.okullar;
create policy okul_guncelle on public.okullar for update using (id = auth.uid()) with check (id = auth.uid());
