begin;

create schema if not exists extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'unaccent') then
    alter extension unaccent set schema extensions;
  end if;
end $$;

grant usage on schema extensions to anon, authenticated, service_role;
grant execute on all functions in schema extensions to anon, authenticated, service_role;

alter function public.resolve_kanban_column_id(public.kanban_status)
  set search_path = public, pg_temp;

alter function public.sync_fichas_kanban_column()
  set search_path = public, pg_temp;

alter function public.reorder_kanban_columns(uuid[])
  set search_path = public, pg_temp;

alter function public.sort_kanban_cards_by_delivery_date(uuid)
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.move_kanban_card(uuid, uuid, integer)
  set search_path = public, pg_temp;

alter function public.normalize_search_text(text)
  set search_path = public, extensions, pg_temp;

alter function public.sync_fichas_busca_normalizada()
  set search_path = public, extensions, pg_temp;

drop policy if exists "authenticated users can manage app_sessions" on public.app_sessions;
drop policy if exists "authenticated users can manage app_users" on public.app_users;
drop policy if exists "authenticated users can manage catalog_items" on public.catalog_items;
drop policy if exists "authenticated users can manage clientes" on public.clientes;
drop policy if exists "authenticated users can manage ficha_imagens" on public.ficha_imagens;
drop policy if exists "authenticated users can manage ficha_itens" on public.ficha_itens;
drop policy if exists "authenticated users can manage fichas" on public.fichas;
drop policy if exists "authenticated users can manage kanban_columns" on public.kanban_columns;
drop policy if exists "authenticated users can manage produto_modelos" on public.produto_modelos;

commit;
