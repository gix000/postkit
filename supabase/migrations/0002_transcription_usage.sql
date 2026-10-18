-- Daily transcription usage per account, for the fair-use limit.

create table public.transcription_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default (now() at time zone 'utc')::date,
  seconds  int not null default 0 check (seconds >= 0),
  requests int not null default 0,
  primary key (user_id, day)
);

alter table public.transcription_usage enable row level security;
create policy "own usage" on public.transcription_usage for select using (auth.uid() = user_id);

create or replace function public.add_transcription_usage(p_user uuid, p_seconds int)
returns int
language sql security definer set search_path = public as $$
  insert into transcription_usage (user_id, day, seconds, requests)
  values (p_user, (now() at time zone 'utc')::date, greatest(p_seconds, 0), 1)
  on conflict (user_id, day) do update
    set seconds = transcription_usage.seconds + greatest(excluded.seconds, 0),
        requests = transcription_usage.requests + 1
  returning seconds;
$$;

revoke all on function public.add_transcription_usage(uuid, int) from public, anon, authenticated;
grant execute on function public.add_transcription_usage(uuid, int) to service_role;
