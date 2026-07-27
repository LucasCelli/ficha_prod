create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

alter table public.fichas
  add column if not exists created_by_user_id uuid references public.app_users(id) on delete set null;

create index if not exists fichas_created_by_created_at_idx
  on public.fichas (created_by_user_id, created_at desc);

create table if not exists public.user_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  month date not null,
  fichas_target integer not null default 0 check (fichas_target >= 0),
  pieces_target integer not null default 0 check (pieces_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month),
  constraint user_monthly_goals_month_start check (date_trunc('month', month)::date = month)
);

create table if not exists public.ficha_status_events (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  changed_by_user_id uuid references public.app_users(id) on delete set null,
  from_status public.ficha_status,
  to_status public.ficha_status not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ficha_ownership_audit (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  previous_user_id uuid references public.app_users(id) on delete set null,
  new_user_id uuid references public.app_users(id) on delete set null,
  changed_by_user_id uuid references public.app_users(id) on delete set null,
  reason text not null default 'Atribuição administrativa',
  created_at timestamptz not null default now()
);

create index if not exists user_monthly_goals_user_month_idx on public.user_monthly_goals (user_id, month desc);
create index if not exists ficha_status_events_ficha_created_idx on public.ficha_status_events (ficha_id, created_at desc);
create index if not exists ficha_ownership_audit_ficha_created_idx on public.ficha_ownership_audit (ficha_id, created_at desc);

create trigger user_monthly_goals_set_updated_at
before update on public.user_monthly_goals
for each row execute function public.set_updated_at();

alter table public.user_monthly_goals enable row level security;
alter table public.ficha_status_events enable row level security;
alter table public.ficha_ownership_audit enable row level security;

-- First recover exact names/usernames, then accept only a unique high-confidence fuzzy match.
with exact_matches as (
  select
    f.id as ficha_id,
    u.id as user_id,
    row_number() over (partition by f.id order by u.active desc, u.id) as position
  from public.fichas f
  join public.app_users u on
    lower(regexp_replace(extensions.unaccent(f.vendedor), '[^a-z0-9]+', '', 'g')) =
      lower(regexp_replace(extensions.unaccent(u.display_name), '[^a-z0-9]+', '', 'g'))
    or lower(regexp_replace(extensions.unaccent(f.vendedor), '[^a-z0-9]+', '', 'g')) =
      lower(regexp_replace(extensions.unaccent(u.username), '[^a-z0-9]+', '', 'g'))
  where f.created_by_user_id is null and f.vendedor is not null
)
update public.fichas f
set created_by_user_id = exact_matches.user_id
from exact_matches
where f.id = exact_matches.ficha_id and exact_matches.position = 1;

with ranked as (
  select
    f.id as ficha_id,
    u.id as user_id,
    extensions.similarity(lower(extensions.unaccent(f.vendedor)), lower(extensions.unaccent(u.display_name))) as score,
    row_number() over (
      partition by f.id
      order by extensions.similarity(lower(extensions.unaccent(f.vendedor)), lower(extensions.unaccent(u.display_name))) desc
    ) as position,
    lead(extensions.similarity(lower(extensions.unaccent(f.vendedor)), lower(extensions.unaccent(u.display_name)))) over (
      partition by f.id
      order by extensions.similarity(lower(extensions.unaccent(f.vendedor)), lower(extensions.unaccent(u.display_name))) desc
    ) as next_score
  from public.fichas f
  cross join public.app_users u
  where f.created_by_user_id is null and f.vendedor is not null and u.active
)
update public.fichas f
set created_by_user_id = ranked.user_id
from ranked
where f.id = ranked.ficha_id
  and ranked.position = 1
  and ranked.score >= 0.72
  and (ranked.next_score is null or ranked.score - ranked.next_score >= 0.15);
