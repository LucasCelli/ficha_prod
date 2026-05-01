create type public.app_user_role as enum (
  'superadmin',
  'operador'
);

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text generated always as (lower(btrim(username))) stored,
  display_name text not null,
  role public.app_user_role not null default 'operador',
  pin_salt text not null,
  pin_hash text not null,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_username_normalized_unique unique (username_normalized),
  constraint app_users_username_not_blank check (btrim(username) <> ''),
  constraint app_users_display_name_not_blank check (btrim(display_name) <> ''),
  constraint app_users_pin_salt_not_blank check (btrim(pin_salt) <> ''),
  constraint app_users_pin_hash_not_blank check (btrim(pin_hash) <> '')
);

create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint app_sessions_token_hash_not_blank check (btrim(token_hash) <> '')
);

create index app_users_active_role_idx on public.app_users (active, role);
create index app_sessions_user_id_idx on public.app_sessions (user_id);
create index app_sessions_expires_at_idx on public.app_sessions (expires_at);

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

create policy "authenticated users can manage app_users"
on public.app_users
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage app_sessions"
on public.app_sessions
for all
to authenticated
using (true)
with check (true);
