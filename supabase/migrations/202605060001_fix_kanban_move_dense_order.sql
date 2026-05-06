create or replace function public.move_kanban_card(
  p_ficha_id uuid,
  p_kanban_column_id uuid,
  p_target_index integer default 0
)
returns void
language plpgsql
as $$
declare
  source_column_id uuid;
  target_slug text;
  clamped_target integer;
begin
  select kanban_column_id
  into source_column_id
  from public.fichas
  where id = p_ficha_id
  for update;

  if source_column_id is null then
    raise exception 'Ficha % não encontrada para mover no kanban.', p_ficha_id;
  end if;

  select slug
  into target_slug
  from public.kanban_columns
  where id = p_kanban_column_id;

  if target_slug is null then
    raise exception 'Coluna % não encontrada.', p_kanban_column_id;
  end if;

  select greatest(
    0,
    least(
      coalesce(p_target_index, 0),
      coalesce((
        select count(*)
        from public.fichas
        where kanban_column_id = p_kanban_column_id
          and status = 'pendente'
          and id <> p_ficha_id
      ), 0)
    )
  )
  into clamped_target;

  update public.fichas
  set
    kanban_column_id = p_kanban_column_id,
    kanban_ordem = 0,
    kanban_status_updated_at = now(),
    kanban_status = case target_slug
      when 'pendente' then 'pendente'::public.kanban_status
      when 'exportando' then 'exportando'::public.kanban_status
      when 'fila_impressao' then 'fila_impressao'::public.kanban_status
      when 'sublimando' then 'sublimando'::public.kanban_status
      when 'na_costura' then 'na_costura'::public.kanban_status
      else kanban_status
    end
  where id = p_ficha_id;

  if source_column_id <> p_kanban_column_id then
    with source_ranked as (
      select
        id,
        row_number() over (
          order by kanban_ordem asc, data_entrega asc, id asc
        ) - 1 as next_order
      from public.fichas
      where kanban_column_id = source_column_id
        and status = 'pendente'
    )
    update public.fichas as target
    set kanban_ordem = source_ranked.next_order
    from source_ranked
    where source_ranked.id = target.id;
  end if;

  with target_existing as (
    select
      id,
      row_number() over (
        order by kanban_ordem asc, data_entrega asc, id asc
      ) - 1 as dense_index
    from public.fichas
    where kanban_column_id = p_kanban_column_id
      and status = 'pendente'
      and id <> p_ficha_id
  ),
  target_ranked as (
    select
      ordered.id,
      row_number() over (
        order by ordered.sort_index asc, ordered.is_moved desc, ordered.id asc
      ) - 1 as next_order
    from (
      select
        id,
        case
          when dense_index >= clamped_target then dense_index + 1
          else dense_index
        end as sort_index,
        0 as is_moved
      from target_existing

      union all

      select
        p_ficha_id as id,
        clamped_target as sort_index,
        1 as is_moved
    ) as ordered
  )
  update public.fichas as target
  set kanban_ordem = target_ranked.next_order
  from target_ranked
  where target_ranked.id = target.id;
end;
$$;

with ranked as (
  select
    id,
    row_number() over (
      partition by kanban_column_id
      order by kanban_ordem asc, data_entrega asc, id asc
    ) - 1 as next_order
  from public.fichas
  where status = 'pendente'
)
update public.fichas as target
set kanban_ordem = ranked.next_order
from ranked
where ranked.id = target.id;
