-- PostKit — accounts, orders, subscriptions, devices, credits
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Subscriptions (one row per user; term extends on renewal) ─
create table public.subscriptions (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  plan             text not null,
  expires_at       timestamptz not null,
  devices_allowed  int not null default 1 check (devices_allowed between 1 and 6),
  updated_at       timestamptz not null default now()
);

-- ── Orders (number is the integer externalId sent to Whish) ──
create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  number       bigint generated always as identity unique,
  user_id      uuid not null references auth.users (id) on delete cascade,
  item         text not null,
  amount       numeric(10, 2) not null check (amount > 0),
  currency     text not null default 'USD' check (currency in ('USD', 'LBP')),
  status       text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payer_phone  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_pending_idx on public.orders (status) where status = 'pending';

-- ── Devices registered by the panel ─────────────────────────
create table public.devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  device_hash   text not null,
  name          text,
  platform      text check (platform in ('win', 'mac')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (user_id, device_hash)
);

-- ── AI credits: append-only ledger ──────────────────────────
create table public.credit_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  delta       int not null,
  reason      text not null,
  order_id    uuid references public.orders (id),
  created_at  timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id);

create view public.credit_balances with (security_invoker = true) as
  select user_id, coalesce(sum(delta), 0)::int as balance
  from public.credit_ledger
  group by user_id;

-- ── Row-level security: users read their own rows ───────────
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders        enable row level security;
alter table public.devices       enable row level security;
alter table public.credit_ledger enable row level security;

create policy "own profile"       on public.profiles      for select using (auth.uid() = id);
create policy "own subscription"  on public.subscriptions for select using (auth.uid() = user_id);
create policy "own orders"        on public.orders        for select using (auth.uid() = user_id);
create policy "own devices"       on public.devices       for select using (auth.uid() = user_id);
create policy "remove own device" on public.devices       for delete using (auth.uid() = user_id);
create policy "own credits"       on public.credit_ledger for select using (auth.uid() = user_id);
-- All inserts and updates go through the service role (server code only).

-- ── Fulfil a paid order exactly once ────────────────────────
-- Returns true only for the call that flipped the order from pending to paid,
-- so duplicate Whish callbacks and page reloads can't extend a plan twice.
create or replace function public.fulfil_order(
  p_order        uuid,
  p_payer_phone  text,
  p_plan         text,
  p_days         int,
  p_credits      int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  update orders
     set status = 'paid', paid_at = now(), payer_phone = p_payer_phone
   where id = p_order and status = 'pending'
  returning user_id into v_user;

  if v_user is null then
    return false;
  end if;

  if p_days > 0 then
    insert into subscriptions (user_id, plan, expires_at)
    values (v_user, p_plan, now() + make_interval(days => p_days))
    on conflict (user_id) do update
      set plan       = excluded.plan,
          expires_at = greatest(subscriptions.expires_at, now()) + make_interval(days => p_days),
          updated_at = now();
  end if;

  if p_credits > 0 then
    insert into credit_ledger (user_id, delta, reason, order_id)
    values (v_user, p_credits, 'purchase', p_order);
  end if;

  return true;
end $$;

revoke all on function public.fulfil_order(uuid, text, text, int, int) from public, anon, authenticated;
grant execute on function public.fulfil_order(uuid, text, text, int, int) to service_role;
