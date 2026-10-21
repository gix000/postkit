-- Long-running creations (talking videos) run in the background; the page polls this row.
create table if not exists public.jobs (
  id text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  endpoint text not null,
  cost integer not null check (cost >= 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  prompt text,
  creation_id uuid references public.creations on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_user on public.jobs (user_id, created_at desc);
alter table public.jobs enable row level security;
create policy "Own jobs are readable" on public.jobs for select using (auth.uid() = user_id);
-- Inserts and updates happen only on the server with the service role.

-- Uploaded inputs (photo, voice note) are deleted when the job finishes.
alter table public.jobs add column if not exists temp_paths text[] not null default '{}';
