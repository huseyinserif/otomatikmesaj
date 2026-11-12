
-- ===== Yoklama ve grup =====
alter table public.ogrenciler add column if not exists grup text;

create table if not exists public.yoklama (
  id bigint generated always as identity primary key,
  okul_id uuid not null references public.okullar(id) on delete cascade default auth.uid(),
  ogrenci_id bigint not null references public.ogrenciler(id) on delete cascade,
  tarih date not null,
  geldi boolean not null,
  unique (ogrenci_id, tarih)
);
create index if not exists yoklama_okul_tarih on public.yoklama(okul_id, tarih);
alter table public.yoklama enable row level security;

drop policy if exists yoklama_oku on public.yoklama;
drop policy if exists yoklama_ekle on public.yoklama;
drop policy if exists yoklama_guncelle on public.yoklama;
drop policy if exists yoklama_sil on public.yoklama;
create policy yoklama_oku on public.yoklama for select using (okul_id = auth.uid());
create policy yoklama_ekle on public.yoklama for insert with check (
  okul_id = auth.uid() and abonelik_var()
  and exists (select 1 from public.ogrenciler o where o.id = yoklama.ogrenci_id and o.okul_id = auth.uid()));
create policy yoklama_guncelle on public.yoklama for update
  using (okul_id = auth.uid() and abonelik_var())
  with check (okul_id = auth.uid() and abonelik_var()
  and exists (select 1 from public.ogrenciler o where o.id = yoklama.ogrenci_id and o.okul_id = auth.uid()));
create policy yoklama_sil on public.yoklama for delete using (okul_id = auth.uid() and abonelik_var());
