create table if not exists public.kanban_manual_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  data_entrega date not null,
  evento boolean not null default false,
  arte text,
  material text,
  kanban_column_id uuid not null references public.kanban_columns(id),
  kanban_ordem integer not null default 0 check (kanban_ordem >= 0),
  created_by_user_id uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kanban_manual_cards enable row level security;

insert into public.kanban_manual_cards (
  id, title, data_entrega, evento, arte, material, kanban_column_id,
  kanban_ordem, created_by_user_id, created_at, updated_at
)
select
  id, cliente_nome_snapshot, data_entrega, evento, arte, material,
  kanban_column_id, kanban_ordem, created_by_user_id, created_at, updated_at
from public.fichas
where is_manual_card
on conflict (id) do nothing;

delete from public.fichas where is_manual_card;

create index if not exists kanban_manual_cards_column_order_idx
on public.kanban_manual_cards (kanban_column_id, kanban_ordem, id);

create or replace function public.create_manual_kanban_card_atomic(
  p_actor_id uuid, p_column_id uuid, p_title text, p_data_entrega date,
  p_evento boolean, p_arte text, p_material text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_card_id uuid; v_next_order integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));
  if not exists (select 1 from public.app_users where id = p_actor_id and active) then
    raise exception 'Active application user not found.';
  end if;
  if btrim(coalesce(p_title, '')) = '' or p_data_entrega is null then
    raise exception 'Manual card payload is invalid.';
  end if;
  if not exists (select 1 from public.kanban_columns where id = p_column_id) then
    raise exception 'Kanban column not found.';
  end if;
  select coalesce(max(card_order) + 1, 0) into v_next_order from (
    select kanban_ordem as card_order from public.fichas where kanban_column_id = p_column_id and status = 'pendente'
    union all
    select kanban_ordem from public.kanban_manual_cards where kanban_column_id = p_column_id
  ) cards;
  insert into public.kanban_manual_cards
    (title, data_entrega, evento, arte, material, kanban_column_id, kanban_ordem, created_by_user_id)
  values
    (btrim(p_title), p_data_entrega, coalesce(p_evento, false), nullif(btrim(p_arte), ''),
     nullif(btrim(p_material), ''), p_column_id, v_next_order, p_actor_id)
  returning id into v_card_id;
  return v_card_id;
end; $$;

create or replace function public.move_kanban_card(p_ficha_id uuid, p_kanban_column_id uuid, p_target_index integer default 0)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_source_column_id uuid; v_source_order integer; v_is_manual boolean := false; v_target_slug text; v_clamped_target integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));
  select kanban_column_id, kanban_ordem into v_source_column_id, v_source_order from public.fichas where id = p_ficha_id and status = 'pendente' for update;
  if v_source_column_id is null then
    select kanban_column_id, kanban_ordem into v_source_column_id, v_source_order from public.kanban_manual_cards where id = p_ficha_id for update;
    v_is_manual := v_source_column_id is not null;
  end if;
  if v_source_column_id is null then raise exception 'Open card not found.'; end if;
  select slug into v_target_slug from public.kanban_columns where id = p_kanban_column_id;
  if v_target_slug is null then raise exception 'Kanban column not found.'; end if;
  select greatest(0, least(coalesce(p_target_index, 0), count(*)::integer)) into v_clamped_target from (
    select id from public.fichas where kanban_column_id = p_kanban_column_id and status = 'pendente' and id <> p_ficha_id
    union all select id from public.kanban_manual_cards where kanban_column_id = p_kanban_column_id and id <> p_ficha_id
  ) cards;
  update public.fichas set kanban_ordem = kanban_ordem - 1
    where status = 'pendente' and kanban_column_id = v_source_column_id and kanban_ordem > v_source_order and id <> p_ficha_id;
  update public.kanban_manual_cards set kanban_ordem = kanban_ordem - 1
    where kanban_column_id = v_source_column_id and kanban_ordem > v_source_order and id <> p_ficha_id;
  update public.fichas set kanban_ordem = kanban_ordem + 1
    where status = 'pendente' and kanban_column_id = p_kanban_column_id and kanban_ordem >= v_clamped_target and id <> p_ficha_id;
  update public.kanban_manual_cards set kanban_ordem = kanban_ordem + 1
    where kanban_column_id = p_kanban_column_id and kanban_ordem >= v_clamped_target and id <> p_ficha_id;
  if v_is_manual then
    update public.kanban_manual_cards set kanban_column_id = p_kanban_column_id, kanban_ordem = 0, updated_at = now() where id = p_ficha_id;
  else
    update public.fichas set kanban_column_id = p_kanban_column_id, kanban_ordem = 0, kanban_status_updated_at = now(),
      kanban_status = case v_target_slug when 'pendente' then 'pendente'::public.kanban_status when 'exportando' then 'exportando'::public.kanban_status when 'fila_impressao' then 'fila_impressao'::public.kanban_status when 'sublimando' then 'sublimando'::public.kanban_status when 'na_costura' then 'na_costura'::public.kanban_status else kanban_status end
    where id = p_ficha_id;
  end if;
end; $$;

create or replace function public.sort_kanban_cards_by_delivery_date(p_kanban_column_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));
  with cards as (
    select id, false as manual, data_entrega, coalesce(kanban_status_updated_at, updated_at, created_at) changed_at
    from public.fichas where status='pendente' and kanban_column_id=p_kanban_column_id
    union all
    select id, true, data_entrega, updated_at from public.kanban_manual_cards where kanban_column_id=p_kanban_column_id
  ), ranked as (select id, manual, row_number() over(order by data_entrega,changed_at,id)-1 next_order from cards)
  update public.fichas f set kanban_ordem=r.next_order from ranked r where not r.manual and f.id=r.id;
  with cards as (
    select id, false as manual, data_entrega, coalesce(kanban_status_updated_at, updated_at, created_at) changed_at
    from public.fichas where status='pendente' and kanban_column_id=p_kanban_column_id
    union all
    select id, true, data_entrega, updated_at from public.kanban_manual_cards where kanban_column_id=p_kanban_column_id
  ), ranked as (select id, manual, row_number() over(order by data_entrega,changed_at,id)-1 next_order from cards)
  update public.kanban_manual_cards m set kanban_ordem=r.next_order from ranked r where r.manual and m.id=r.id;
end; $$;

create or replace function public.delete_manual_kanban_card(p_card_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.kanban_manual_cards where id = p_card_id;
  if not found then raise exception 'Manual card not found.'; end if;
end; $$;

create or replace function public.get_kanban_board_cards(p_search text default null, p_week_start date default null, p_week_end date default null, p_material text default null, p_arte text default null)
returns table (arte text, cliente_auxiliar text, cliente_nome_snapshot text, data_entrega date, evento boolean, id uuid, is_manual_card boolean, item_quantity bigint, kanban_column_id uuid, kanban_ordem integer, kanban_status public.kanban_status, material text, numero_venda text, status public.ficha_status, thumb_url text, vendedor text)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select f.arte,f.cliente_auxiliar,f.cliente_nome_snapshot,f.data_entrega,f.evento,f.id,false,coalesce((select sum(coalesce(i.quantidade,0)) from public.ficha_itens i where i.ficha_id=f.id),0)::bigint,f.kanban_column_id,f.kanban_ordem,f.kanban_status,f.material,f.numero_venda,f.status,(select im.url from public.ficha_imagens im where im.ficha_id=f.id order by im.ordem,im.id limit 1),f.vendedor
    from public.fichas f where f.status='pendente'
    union all
    select m.arte,null,m.title,m.data_entrega,m.evento,m.id,true,0::bigint,m.kanban_column_id,m.kanban_ordem,'pendente'::public.kanban_status,m.material,null,'pendente'::public.ficha_status,null,null from public.kanban_manual_cards m
  ) card
  where (p_week_start is null or card.data_entrega >= p_week_start) and (p_week_end is null or card.data_entrega <= p_week_end)
    and (nullif(btrim(p_material),'') is null or lower(card.material)=lower(btrim(p_material)))
    and (nullif(btrim(p_arte),'') is null or lower(card.arte)=lower(btrim(p_arte)))
    and (nullif(btrim(p_search),'') is null or concat_ws(' ',card.cliente_nome_snapshot,card.numero_venda,card.material,card.arte,card.vendedor) ilike '%'||btrim(p_search)||'%')
  order by card.kanban_ordem,card.id;
$$;

revoke all on public.kanban_manual_cards from public, anon, authenticated;
revoke execute on function public.delete_manual_kanban_card(uuid) from public, anon, authenticated;
grant execute on function public.delete_manual_kanban_card(uuid) to service_role;
