-- Welcome credits: once per person, not once per email.
-- New accounts no longer get credits from the sign-up trigger. The server claims them on the
-- first visit, and refuses when the email is a throwaway inbox or the device already got them.

create table if not exists public.welcome_claims (
  user_id uuid primary key references public.profiles on delete cascade,
  device_id text,
  ip text,
  email_domain text,
  granted boolean not null,
  reason text,            -- null when granted; 'disposable' or 'device' when refused
  created_at timestamptz not null default now()
);
create index if not exists welcome_claims_device on public.welcome_claims (device_id) where granted;
create index if not exists welcome_claims_recent on public.welcome_claims (created_at desc);
alter table public.welcome_claims enable row level security;
-- No policies: only the server (service role) reads or writes this table.

-- Accounts that already received the old sign-up bonus count as claimed.
insert into public.welcome_claims (user_id, granted, reason, created_at)
select l.user_id, true, 'legacy', min(l.created_at) from public.credit_ledger l
where l.reason = 'welcome'
group by l.user_id
on conflict (user_id) do nothing;

-- Sign-up trigger: profile only, no credits.
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Claims the welcome credits once. Returns the credits given (0 when refused or already claimed).
create or replace function public.claim_welcome(p_user uuid, p_device text, p_ip text, p_domain text, p_disposable boolean, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  -- One claim at a time per device, so two quick sign-ups can't both slip through.
  perform pg_advisory_xact_lock(hashtext('welcome:' || coalesce(p_device, p_user::text)));
  if exists (select 1 from public.welcome_claims where user_id = p_user) then return 0; end if;
  if exists (select 1 from public.credit_ledger where user_id = p_user and reason = 'welcome') then return 0; end if;

  if p_disposable then
    v_reason := 'disposable';
  elsif p_device is not null and exists (select 1 from public.welcome_claims where device_id = p_device and granted) then
    v_reason := 'device';
  end if;

  insert into public.welcome_claims (user_id, device_id, ip, email_domain, granted, reason)
  values (p_user, p_device, p_ip, p_domain, v_reason is null, v_reason);
  if v_reason is not null then return 0; end if;

  insert into public.credit_ledger (user_id, delta, reason) values (p_user, p_amount, 'welcome');
  return p_amount;
end;
$$;
revoke execute on function public.claim_welcome(uuid, text, text, text, boolean, integer) from public, anon, authenticated;

-- Owner report: free credits given and refused, and networks with several new accounts.
create or replace function public.welcome_report(p_days integer default 7)
returns json language sql stable security definer set search_path = public, auth as $$
  select json_build_object(
    'granted', (select count(*) from public.welcome_claims where granted and reason is null and created_at > now() - make_interval(days => p_days)),
    'disposable', (select count(*) from public.welcome_claims where reason = 'disposable' and created_at > now() - make_interval(days => p_days)),
    'device', (select count(*) from public.welcome_claims where reason = 'device' and created_at > now() - make_interval(days => p_days)),
    'clusters', coalesce((
      select json_agg(c order by c.accounts desc, c.last_at desc) from (
        select w.ip, count(*)::int as accounts, max(w.created_at) as last_at,
               array_agg(coalesce(u.email, '?') order by w.created_at desc) as emails
        from public.welcome_claims w left join auth.users u on u.id = w.user_id
        where w.ip is not null and w.reason is distinct from 'legacy'
          and w.created_at > now() - make_interval(days => p_days)
        group by w.ip, date_trunc('day', w.created_at)
        having count(*) >= 3
      ) c
    ), '[]'::json)
  );
$$;
revoke execute on function public.welcome_report(integer) from public, anon, authenticated;
grant execute on function public.claim_welcome(uuid, text, text, text, boolean, integer) to service_role;
grant execute on function public.welcome_report(integer) to service_role;
