-- PostKit Hub — Supabase schema
-- Run once in Supabase → SQL editor.

-- Profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users edit their own profile" on public.profiles for update using (auth.uid() = id);

-- Give every new account a profile with a username derived from the email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-zA-Z0-9-]', '', 'g'));
begin
  if length(base) < 2 then base := 'user'; end if;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    left(base, 30) || '-' || substr(replace(new.id::text, '-', ''), 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Repos (community models and datasets) -------------------------------
create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('model', 'dataset')),
  slug text not null check (slug ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$'),
  description text,
  task text,
  license text,
  readme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, slug)
);

create index if not exists repos_kind_created on public.repos (kind, created_at desc);

alter table public.repos enable row level security;
create policy "Repos are public" on public.repos for select using (true);
create policy "Owners create repos" on public.repos for insert with check (auth.uid() = owner_id);
create policy "Owners update repos" on public.repos for update using (auth.uid() = owner_id);
create policy "Owners delete repos" on public.repos for delete using (auth.uid() = owner_id);

-- Saves (a user's bookmarked models/datasets, from the Hub or the community)
-- ref examples: "hf:model:meta-llama/Llama-3.1-8B", "pk:<repo uuid>"
create table if not exists public.saves (
  user_id uuid not null references public.profiles on delete cascade,
  ref text not null,
  kind text not null check (kind in ('model', 'dataset')),
  label text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ref)
);

alter table public.saves enable row level security;
create policy "Saves are public" on public.saves for select using (true);
create policy "Users add their saves" on public.saves for insert with check (auth.uid() = user_id);
create policy "Users remove their saves" on public.saves for delete using (auth.uid() = user_id);

-- Storage: files for community repos live at repos/<owner uuid>/<repo uuid>/<path>
insert into storage.buckets (id, name, public)
values ('repos', 'repos', true)
on conflict (id) do nothing;

create policy "Repo files are public" on storage.objects for select
  using (bucket_id = 'repos');
create policy "Owners upload repo files" on storage.objects for insert
  with check (bucket_id = 'repos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners replace repo files" on storage.objects for update
  using (bucket_id = 'repos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners delete repo files" on storage.objects for delete
  using (bucket_id = 'repos' and (storage.foldername(name))[1] = auth.uid()::text);
