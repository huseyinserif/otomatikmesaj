-- Google ile ilk girişte "Database error saving new user" hatasını düzeltir.
-- Supabase > SQL Editor'e yapıştırıp Run'a bas (bir kez).
create or replace function public.yeni_okul() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.okullar(id, email, ad)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Yeni Okul'));
  insert into public.okul_gizli(okul_id) values (new.id);
  return new;
end $$;
