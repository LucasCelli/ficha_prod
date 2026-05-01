create type public.catalog_item_kind as enum (
  'produto',
  'tamanho',
  'tecido',
  'cor',
  'manga',
  'acabamento_manga',
  'gola',
  'acabamento_gola',
  'bolso'
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  kind public.catalog_item_kind not null,
  name text not null,
  slug text not null,
  aliases text[] not null default '{}'::text[],
  description text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_kind_slug_unique unique (kind, slug)
);

create index catalog_items_kind_active_order_idx on public.catalog_items (kind, active, sort_order, name);
create index catalog_items_aliases_gin_idx on public.catalog_items using gin (aliases);
create index catalog_items_metadata_gin_idx on public.catalog_items using gin (metadata);

create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

alter table public.catalog_items enable row level security;

create policy "authenticated users can manage catalog_items"
on public.catalog_items
for all
to authenticated
using (true)
with check (true);
