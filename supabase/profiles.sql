create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  appearance jsonb not null
);
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
create policy "Users read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
