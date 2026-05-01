create extension if not exists pgcrypto;

create type public.ficha_status as enum (
  'pendente',
  'entregue',
  'cancelado'
);

create type public.kanban_status as enum (
  'pendente',
  'exportando',
  'fila_impressao',
  'sublimando',
  'na_costura'
);

create type public.insumo_status as enum (
  'tudo_ok',
  'sem_tecido',
  'sem_tinta',
  'sem_papel',
  'pendencias'
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text generated always as (lower(btrim(nome))) stored,
  email text,
  telefone text,
  primeira_ficha date,
  ultima_ficha date,
  total_fichas integer not null default 0 check (total_fichas >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_nome_normalizado_unique unique (nome_normalizado)
);

create table public.produto_modelos (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  nome text not null,
  categoria text,
  ativo boolean not null default true,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint produto_modelos_slug_unique unique (slug)
);

create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  legacy_ficha_id bigint unique,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nome_snapshot text not null,
  cliente_auxiliar text,
  vendedor text,
  data_inicio date,
  numero_venda text,
  data_entrega date not null,
  evento boolean not null default false,
  status public.ficha_status not null default 'pendente',
  kanban_status public.kanban_status not null default 'pendente',
  insumo_status public.insumo_status not null default 'tudo_ok',
  material text,
  composicao text,
  cor_material text,
  manga text,
  acabamento_manga text,
  cor_acabamento_manga text,
  largura_manga text,
  gola text,
  acabamento_gola text,
  cor_gola text,
  largura_gola text,
  cor_peitilho_interno text,
  cor_peitilho_externo text,
  cor_pe_de_gola_interno text,
  cor_pe_de_gola_externo text,
  cor_botao text,
  abertura_lateral text,
  cor_abertura_lateral text,
  reforco_gola text,
  cor_reforco text,
  bolso text,
  filete text,
  filete_local text,
  filete_cor text,
  faixa text,
  faixa_local text,
  faixa_cor text,
  arte text,
  cor_sublimacao text,
  com_nomes smallint check (com_nomes between 0 and 3),
  observacoes text,
  observacoes_html text,
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.ficha_itens (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  produto_modelo_id uuid references public.produto_modelos(id) on delete set null,
  ordem integer not null default 0 check (ordem >= 0),
  produto text,
  descricao text,
  tamanho text,
  quantidade integer not null default 1 check (quantidade >= 0),
  detalhes text,
  detalhes_produto text,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ficha_imagens (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  ordem integer not null default 0 check (ordem >= 0),
  url text not null,
  storage_path text,
  alt_text text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes integer check (bytes is null or bytes >= 0),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index clientes_ultima_ficha_idx on public.clientes (ultima_ficha desc nulls last);
create index fichas_cliente_id_idx on public.fichas (cliente_id);
create index fichas_status_data_entrega_idx on public.fichas (status, data_entrega);
create index fichas_kanban_status_idx on public.fichas (kanban_status);
create index fichas_insumo_status_idx on public.fichas (insumo_status);
create index fichas_vendedor_idx on public.fichas (vendedor) where vendedor is not null;
create index fichas_data_inicio_idx on public.fichas (data_inicio);
create index fichas_arte_idx on public.fichas (arte) where arte is not null;
create index ficha_itens_ficha_id_ordem_idx on public.ficha_itens (ficha_id, ordem);
create index ficha_itens_produto_idx on public.ficha_itens (produto) where produto is not null;
create index ficha_imagens_ficha_id_ordem_idx on public.ficha_imagens (ficha_id, ordem);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clientes_set_updated_at
before update on public.clientes
for each row execute function public.set_updated_at();

create trigger produto_modelos_set_updated_at
before update on public.produto_modelos
for each row execute function public.set_updated_at();

create trigger fichas_set_updated_at
before update on public.fichas
for each row execute function public.set_updated_at();

alter table public.clientes enable row level security;
alter table public.produto_modelos enable row level security;
alter table public.fichas enable row level security;
alter table public.ficha_itens enable row level security;
alter table public.ficha_imagens enable row level security;

create policy "authenticated users can manage clientes"
on public.clientes
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage produto_modelos"
on public.produto_modelos
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage fichas"
on public.fichas
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage ficha_itens"
on public.ficha_itens
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage ficha_imagens"
on public.ficha_imagens
for all
to authenticated
using (true)
with check (true);
