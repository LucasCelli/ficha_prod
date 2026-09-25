begin;

-- Nomes de clientes passam a ser persistidos em MAIÚSCULAS.
-- A identidade (nome_normalizado/empresa_normalizada) usa lower(), então a
-- troca de caixa não altera unicidade nem busca.
create or replace function public.normalize_client_name(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.upper(pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(input, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.normalize_clientes_nome_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nome := public.normalize_client_name(new.nome);
  return new;
end;
$$;

create or replace function public.normalize_fichas_cliente_nome_snapshot_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cliente_nome_snapshot := public.normalize_client_name(new.cliente_nome_snapshot);
  return new;
end;
$$;

drop trigger if exists clientes_normalize_nome on public.clientes;
create trigger clientes_normalize_nome
before insert or update of nome on public.clientes
for each row execute function public.normalize_clientes_nome_trigger();

drop trigger if exists fichas_normalize_cliente_nome_snapshot on public.fichas;
create trigger fichas_normalize_cliente_nome_snapshot
before insert or update of cliente_nome_snapshot on public.fichas
for each row execute function public.normalize_fichas_cliente_nome_snapshot_trigger();

-- Backfill sem tocar updated_at: evita conflito de concorrência otimista em
-- fichas abertas e não reordena listagens por "atualizado recentemente".
alter table public.clientes disable trigger clientes_set_updated_at;
alter table public.fichas disable trigger fichas_set_updated_at;

update public.clientes
set nome = public.normalize_client_name(nome)
where nome is distinct from public.normalize_client_name(nome);

update public.fichas
set cliente_nome_snapshot = public.normalize_client_name(cliente_nome_snapshot)
where cliente_nome_snapshot is distinct from public.normalize_client_name(cliente_nome_snapshot);

alter table public.clientes enable trigger clientes_set_updated_at;
alter table public.fichas enable trigger fichas_set_updated_at;

commit;
