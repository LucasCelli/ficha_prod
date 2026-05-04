create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.normalize_search_text(input text)
returns text
language sql
stable
set search_path = public
as $$
  select trim(regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

alter table public.fichas
add column if not exists busca_normalizada text;

create or replace function public.sync_fichas_busca_normalizada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.busca_normalizada :=
    public.normalize_search_text(
      concat_ws(
        ' ',
        new.cliente_nome_snapshot,
        new.cliente_auxiliar,
        new.vendedor,
        new.numero_venda,
        new.material,
        new.arte
      )
    );

  return new;
end;
$$;

drop trigger if exists fichas_sync_busca_normalizada on public.fichas;

create trigger fichas_sync_busca_normalizada
before insert or update of cliente_nome_snapshot, cliente_auxiliar, vendedor, numero_venda, material, arte
on public.fichas
for each row
execute function public.sync_fichas_busca_normalizada();

update public.fichas
set busca_normalizada =
  public.normalize_search_text(
    concat_ws(
      ' ',
      cliente_nome_snapshot,
      cliente_auxiliar,
      vendedor,
      numero_venda,
      material,
      arte
    )
  )
where busca_normalizada is distinct from
  public.normalize_search_text(
    concat_ws(
      ' ',
      cliente_nome_snapshot,
      cliente_auxiliar,
      vendedor,
      numero_venda,
      material,
      arte
    )
  );

create index if not exists fichas_busca_normalizada_idx
on public.fichas
using gin (busca_normalizada gin_trgm_ops);
