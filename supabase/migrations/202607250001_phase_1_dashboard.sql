create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email text not null,
  display_name text not null,
  role text not null check (role in ('customer_admin', 'customer_viewer', 'support_analyst', 'platform_admin')),
  created_at timestamptz not null default now()
);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_at timestamptz not null,
  uptime numeric(5,2) not null check (uptime between 0 and 100),
  response_time numeric(10,2) not null check (response_time >= 0),
  error_rate numeric(5,2) not null check (error_rate between 0 and 100),
  transaction_volume numeric(14,2) not null check (transaction_volume >= 0),
  availability numeric(5,2) not null check (availability between 0 and 100),
  incidents integer not null check (incidents >= 0)
);

create index performance_metrics_organization_recorded_at on public.performance_metrics (organization_id, recorded_at desc);

create table public.alert_thresholds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null check (metric in ('error_rate', 'response_time', 'availability', 'incidents')),
  operator text not null check (operator in ('gt', 'lt')),
  value numeric not null check (value >= 0),
  unique (organization_id, metric)
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.performance_metrics enable row level security;
alter table public.alert_thresholds enable row level security;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function private.current_organization_id() from public;
revoke all on function private.current_role() from public;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.current_role() to authenticated;

create policy "users read their organization" on public.organizations for select to authenticated using (
  id = private.current_organization_id()
);

create policy "users read their own profile" on public.profiles for select to authenticated using (
  id = (select auth.uid())
);

create policy "customer admins read organization profiles" on public.profiles for select to authenticated using (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
);

create policy "users read their organization metrics" on public.performance_metrics for select to authenticated using (
  organization_id = private.current_organization_id()
);

create policy "users read their organization thresholds" on public.alert_thresholds for select to authenticated using (
  organization_id = private.current_organization_id()
);

create policy "customer admins create organization thresholds" on public.alert_thresholds for insert to authenticated with check (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
);

create policy "customer admins update organization thresholds" on public.alert_thresholds for update to authenticated using (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
) with check (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
);
