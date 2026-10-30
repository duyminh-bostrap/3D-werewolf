create table if not exists public.friend_entries (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  room_code text,
  note text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (owner_id, id)
);
alter table public.friend_entries enable row level security;
grant select, insert, update, delete on public.friend_entries to authenticated;
drop policy if exists "Own friends" on public.friend_entries;
create policy "Own friends" on public.friend_entries for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
-- Retire the old public-access contact table without deleting its data.
do $$ begin
  if to_regclass('public.friends') is not null then
    execute 'revoke all on public.friends from anon, authenticated';
    execute 'alter table public.friends enable row level security';
    execute 'drop policy if exists "friends are readable" on public.friends';
    execute 'drop policy if exists "friends are writable" on public.friends';
    execute 'drop policy if exists "friends are updatable" on public.friends';
    execute 'drop policy if exists "friends are deletable" on public.friends';
  end if;
end $$;
