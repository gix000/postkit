-- PostKit — credits, Whish orders, creations gallery, Explore.
-- Credits are only ever added or spent by the server (service role).
-- Users can read their own balance, history, orders and creations.

-- Credit ledger --------------------------------------------------------
create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  delta integer not null,
  reason text not null,
  order_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user on public.credit_ledger (user_id, created_at desc);
alter table public.credit_ledger enable row level security;
create policy "Users read their credits" on public.credit_ledger for select using (auth.uid() = user_id);

create or replace function public.credit_balance(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = p_user;
$$;

-- Spend atomically; fails without changing anything when the balance is too low.
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user;
  if v_balance < p_amount then raise exception 'insufficient_credits'; end if;
  insert into public.credit_ledger (user_id, delta, reason) values (p_user, -p_amount, p_reason);
  return v_balance - p_amount;
end;
$$;

create or replace function public.grant_credits(p_user uuid, p_amount integer, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  insert into public.credit_ledger (user_id, delta, reason) values (p_user, p_amount, p_reason);
  return public.credit_balance(p_user);
end;
$$;

-- Orders (Whish) ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Whish externalId. Starts high so it never repeats numbers used by the old plugin store.
  number bigint generated always as identity (start with 10001) unique,
  user_id uuid not null references public.profiles on delete cascade,
  pack text not null,
  credits integer not null check (credits > 0),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payer_phone text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;
create policy "Users read their orders" on public.orders for select using (auth.uid() = user_id);

-- Marks a pending order paid and adds its credits, exactly once.
create or replace function public.fulfil_credit_order(p_order uuid, p_payer_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_credits integer;
begin
  update public.orders
     set status = 'paid', paid_at = now(), payer_phone = p_payer_phone
   where id = p_order and status = 'pending'
  returning user_id, credits into v_user, v_credits;
  if v_user is null then return false; end if;
  insert into public.credit_ledger (user_id, delta, reason, order_id) values (v_user, v_credits, 'purchase', p_order);
  return true;
end;
$$;

-- Only the server may call the credit functions.
revoke execute on function public.credit_balance(uuid) from public, anon, authenticated;
revoke execute on function public.spend_credits(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.fulfil_credit_order(uuid, text) from public, anon, authenticated;
grant execute on function public.credit_balance(uuid) to service_role;
grant execute on function public.spend_credits(uuid, integer, text) to service_role;
grant execute on function public.grant_credits(uuid, integer, text) to service_role;
grant execute on function public.fulfil_credit_order(uuid, text) to service_role;

-- Creations ------------------------------------------------------------
create table if not exists public.creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  tool text not null,
  prompt text,
  model text,
  size text,
  path text not null,
  url text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists creations_user on public.creations (user_id, created_at desc);
create index if not exists creations_public on public.creations (created_at desc) where is_public;
alter table public.creations enable row level security;
create policy "Public or own creations" on public.creations for select using (is_public or auth.uid() = user_id);
create policy "Users save creations" on public.creations for insert with check (auth.uid() = user_id);
create policy "Users share creations" on public.creations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete creations" on public.creations for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('creations', 'creations', true)
on conflict (id) do nothing;

create policy "Creation files are public" on storage.objects for select using (bucket_id = 'creations');
create policy "Users upload creation files" on storage.objects for insert
  with check (bucket_id = 'creations' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete creation files" on storage.objects for delete
  using (bucket_id = 'creations' and (storage.foldername(name))[1] = auth.uid()::text);

-- Sign-up bonus --------------------------------------------------------
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
  insert into public.credit_ledger (user_id, delta, reason) values (new.id, 10, 'welcome');
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Existing accounts get the same welcome credits once.
insert into public.credit_ledger (user_id, delta, reason)
select p.id, 10, 'welcome' from public.profiles p
where not exists (select 1 from public.credit_ledger l where l.user_id = p.id and l.reason = 'welcome');
