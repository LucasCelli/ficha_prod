create type public.catalog_print_section as enum ('produto', 'personalizacao');
create type public.catalog_print_review_status as enum ('revisada', 'ignorada');

create table public.catalog_print_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Priscila Confecções & Uniformes',
  title text not null default 'Catálogo de Produtos e Personalizações',
  subtitle text,
  logo_url text,
  cover_image_url text,
  whatsapp text,
  instagram text,
  email text,
  address text,
  footer_text text,
  latest_publication_id uuid,
  updated_at timestamptz not null default now()
);

create table public.catalog_print_categories (
  id uuid primary key default gen_random_uuid(),
  section public.catalog_print_section not null,
  name text not null check (btrim(name) <> ''),
  slug text not null,
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_print_categories_section_slug_unique unique (section, slug)
);

create table public.catalog_print_entries (
  id uuid primary key default gen_random_uuid(),
  source_ficha_id uuid references public.fichas(id) on delete set null,
  section public.catalog_print_section not null,
  category_id uuid not null references public.catalog_print_categories(id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text,
  highlights text[] not null default '{}'::text[],
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_print_entry_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.catalog_print_entries(id) on delete cascade,
  source_ficha_image_id uuid references public.ficha_imagens(id) on delete set null,
  url text not null,
  public_id text,
  alt_text text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.catalog_print_ficha_reviews (
  ficha_id uuid primary key references public.fichas(id) on delete cascade,
  status public.catalog_print_review_status not null,
  ignored_reason text,
  reviewed_by_user_id uuid references public.app_users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  constraint catalog_print_review_reason_check check (
    (status = 'ignorada' and btrim(coalesce(ignored_reason, '')) <> '') or
    (status = 'revisada' and ignored_reason is null)
  )
);

create table public.catalog_print_publications (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  checksum text not null,
  file_size bigint not null check (file_size > 0),
  page_count integer not null check (page_count > 0),
  entry_count integer not null check (entry_count > 0),
  generated_by_user_id uuid references public.app_users(id) on delete set null,
  generated_at timestamptz not null default now()
);

alter table public.catalog_print_settings
  add constraint catalog_print_settings_latest_publication_fkey
  foreign key (latest_publication_id) references public.catalog_print_publications(id) on delete set null;

create index catalog_print_categories_order_idx on public.catalog_print_categories(section, active, sort_order, name);
create index catalog_print_entries_order_idx on public.catalog_print_entries(section, category_id, active, sort_order, title);
create index catalog_print_entries_source_idx on public.catalog_print_entries(source_ficha_id) where source_ficha_id is not null;
create index catalog_print_entry_images_order_idx on public.catalog_print_entry_images(entry_id, sort_order);
create index catalog_print_publications_generated_idx on public.catalog_print_publications(generated_at desc);

create trigger catalog_print_settings_set_updated_at before update on public.catalog_print_settings
for each row execute function public.set_updated_at();
create trigger catalog_print_categories_set_updated_at before update on public.catalog_print_categories
for each row execute function public.set_updated_at();
create trigger catalog_print_entries_set_updated_at before update on public.catalog_print_entries
for each row execute function public.set_updated_at();

alter table public.catalog_print_settings enable row level security;
alter table public.catalog_print_categories enable row level security;
alter table public.catalog_print_entries enable row level security;
alter table public.catalog_print_entry_images enable row level security;
alter table public.catalog_print_ficha_reviews enable row level security;
alter table public.catalog_print_publications enable row level security;

insert into public.catalog_print_settings (id, logo_url) values (1, '/priscila_logo.svg');
insert into public.catalog_print_categories (section, name, slug, sort_order) values
  ('produto', 'Uniformes', 'uniformes', 1),
  ('personalizacao', 'Personalizações', 'personalizacoes', 1);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo-impresso', 'catalogo-impresso', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
