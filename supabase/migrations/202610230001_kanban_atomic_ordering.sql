-- Mantem a ordem logica do Kanban densa e atomica entre fichas e cards manuais.
-- Os dois tipos vivem em tabelas distintas, mas formam uma unica lista por coluna.

with cards as materialized (
  select f.id, false as is_manual, f.kanban_column_id, f.kanban_ordem
  from public.fichas as f
  where f.status = 'pendente'

  union all

  select m.id, true, m.kanban_column_id, m.kanban_ordem
  from public.kanban_manual_cards as m
),
ranked as materialized (
  select
    id,
    is_manual,
    (row_number() over (
      partition by kanban_column_id
      order by kanban_ordem, is_manual, id
    ) - 1)::integer as next_order
  from cards
),
updated_fichas as (
  update public.fichas as ficha
  set kanban_ordem = ranked.next_order
  from ranked
  where not ranked.is_manual
    and ficha.id = ranked.id
  returning ficha.id
)
update public.kanban_manual_cards as manual
set kanban_ordem = ranked.next_order
from ranked
where ranked.is_manual
  and manual.id = ranked.id;

drop function if exists public.move_kanban_card(uuid, uuid, integer);

create function public.move_kanban_card(
  p_ficha_id uuid,
  p_kanban_column_id uuid,
  p_target_index integer default 0,
  p_previous_card_id uuid default null,
  p_next_card_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_anchor_order integer;
  v_clamped_target integer;
  v_is_manual boolean := false;
  v_source_column_id uuid;
  v_source_order integer;
  v_target_count integer;
  v_target_slug text;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  select ficha.kanban_column_id, ficha.kanban_ordem
  into v_source_column_id, v_source_order
  from public.fichas as ficha
  where ficha.id = p_ficha_id
    and ficha.status = 'pendente'
  for update;

  if not found then
    select manual.kanban_column_id, manual.kanban_ordem
    into v_source_column_id, v_source_order
    from public.kanban_manual_cards as manual
    where manual.id = p_ficha_id
    for update;
    v_is_manual := found;
  end if;

  if v_source_column_id is null then
    raise exception 'Open card not found.';
  end if;

  select column_row.slug
  into v_target_slug
  from public.kanban_columns as column_row
  where column_row.id = p_kanban_column_id;

  if v_target_slug is null then
    raise exception 'Kanban column not found.';
  end if;

  -- Repara previamente somente as colunas participantes. Isso torna o
  -- deslocamento previsivel mesmo se existirem lacunas de dados antigos.
  with cards as materialized (
    select ficha.id, false as is_manual, ficha.kanban_column_id, ficha.kanban_ordem
    from public.fichas as ficha
    where ficha.status = 'pendente'
      and ficha.kanban_column_id = any(array[v_source_column_id, p_kanban_column_id])

    union all

    select manual.id, true, manual.kanban_column_id, manual.kanban_ordem
    from public.kanban_manual_cards as manual
    where manual.kanban_column_id = any(array[v_source_column_id, p_kanban_column_id])
  ),
  ranked as materialized (
    select
      id,
      is_manual,
      (row_number() over (
        partition by kanban_column_id
        order by kanban_ordem, is_manual, id
      ) - 1)::integer as next_order
    from cards
  ),
  updated_fichas as (
    update public.fichas as ficha
    set kanban_ordem = ranked.next_order
    from ranked
    where not ranked.is_manual
      and ficha.id = ranked.id
    returning ficha.id
  )
  update public.kanban_manual_cards as manual
  set kanban_ordem = ranked.next_order
  from ranked
  where ranked.is_manual
    and manual.id = ranked.id;

  if v_is_manual then
    select manual.kanban_ordem
    into v_source_order
    from public.kanban_manual_cards as manual
    where manual.id = p_ficha_id;
  else
    select ficha.kanban_ordem
    into v_source_order
    from public.fichas as ficha
    where ficha.id = p_ficha_id;
  end if;

  -- Primeiro fecha a lacuna de origem. As ancoras sao resolvidas depois,
  -- portanto representam corretamente tambem uma lista filtrada no cliente.
  update public.fichas
  set kanban_ordem = kanban_ordem - 1
  where status = 'pendente'
    and kanban_column_id = v_source_column_id
    and kanban_ordem > v_source_order
    and id <> p_ficha_id;

  update public.kanban_manual_cards
  set kanban_ordem = kanban_ordem - 1
  where kanban_column_id = v_source_column_id
    and kanban_ordem > v_source_order
    and id <> p_ficha_id;

  select count(*)::integer
  into v_target_count
  from (
    select ficha.id
    from public.fichas as ficha
    where ficha.status = 'pendente'
      and ficha.kanban_column_id = p_kanban_column_id
      and ficha.id <> p_ficha_id

    union all

    select manual.id
    from public.kanban_manual_cards as manual
    where manual.kanban_column_id = p_kanban_column_id
      and manual.id <> p_ficha_id
  ) as target_cards;

  v_anchor_order := null;
  if p_next_card_id is not null and p_next_card_id <> p_ficha_id then
    select anchor.card_order
    into v_anchor_order
    from (
      select ficha.kanban_ordem as card_order
      from public.fichas as ficha
      where ficha.id = p_next_card_id
        and ficha.status = 'pendente'
        and ficha.kanban_column_id = p_kanban_column_id

      union all

      select manual.kanban_ordem
      from public.kanban_manual_cards as manual
      where manual.id = p_next_card_id
        and manual.kanban_column_id = p_kanban_column_id
    ) as anchor
    limit 1;
  end if;

  if v_anchor_order is not null then
    v_clamped_target := v_anchor_order;
  else
    if p_previous_card_id is not null and p_previous_card_id <> p_ficha_id then
      select anchor.card_order + 1
      into v_anchor_order
      from (
        select ficha.kanban_ordem as card_order
        from public.fichas as ficha
        where ficha.id = p_previous_card_id
          and ficha.status = 'pendente'
          and ficha.kanban_column_id = p_kanban_column_id

        union all

        select manual.kanban_ordem
        from public.kanban_manual_cards as manual
        where manual.id = p_previous_card_id
          and manual.kanban_column_id = p_kanban_column_id
      ) as anchor
      limit 1;
    end if;

    v_clamped_target := coalesce(v_anchor_order, p_target_index, 0);
  end if;

  v_clamped_target := greatest(0, least(v_clamped_target, v_target_count));

  update public.fichas
  set kanban_ordem = kanban_ordem + 1
  where status = 'pendente'
    and kanban_column_id = p_kanban_column_id
    and kanban_ordem >= v_clamped_target
    and id <> p_ficha_id;

  update public.kanban_manual_cards
  set kanban_ordem = kanban_ordem + 1
  where kanban_column_id = p_kanban_column_id
    and kanban_ordem >= v_clamped_target
    and id <> p_ficha_id;

  if v_is_manual then
    update public.kanban_manual_cards
    set
      kanban_column_id = p_kanban_column_id,
      kanban_ordem = v_clamped_target,
      updated_at = now()
    where id = p_ficha_id;
  else
    update public.fichas
    set
      kanban_column_id = p_kanban_column_id,
      kanban_ordem = v_clamped_target,
      kanban_status_updated_at = now(),
      kanban_status = case v_target_slug
        when 'pendente' then 'pendente'::public.kanban_status
        when 'exportando' then 'exportando'::public.kanban_status
        when 'fila_impressao' then 'fila_impressao'::public.kanban_status
        when 'sublimando' then 'sublimando'::public.kanban_status
        when 'na_costura' then 'na_costura'::public.kanban_status
        else kanban_status
      end
    where id = p_ficha_id;
  end if;
end;
$$;

create or replace function public.sort_kanban_cards_by_delivery_date(p_kanban_column_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  if not exists (select 1 from public.kanban_columns where id = p_kanban_column_id) then
    raise exception 'Kanban column not found.';
  end if;

  with cards as materialized (
    select ficha.id, false as is_manual, ficha.data_entrega, ficha.kanban_ordem
    from public.fichas as ficha
    where ficha.status = 'pendente'
      and ficha.kanban_column_id = p_kanban_column_id

    union all

    select manual.id, true, manual.data_entrega, manual.kanban_ordem
    from public.kanban_manual_cards as manual
    where manual.kanban_column_id = p_kanban_column_id
  ),
  ranked as materialized (
    select
      id,
      is_manual,
      (row_number() over (
        order by data_entrega asc nulls last, kanban_ordem, is_manual, id
      ) - 1)::integer as next_order
    from cards
  ),
  updated_fichas as (
    update public.fichas as ficha
    set kanban_ordem = ranked.next_order
    from ranked
    where not ranked.is_manual
      and ficha.id = ranked.id
    returning ficha.id
  )
  update public.kanban_manual_cards as manual
  set kanban_ordem = ranked.next_order
  from ranked
  where ranked.is_manual
    and manual.id = ranked.id;
end;
$$;

create or replace function public.sort_all_kanban_cards_by_delivery_date()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  with cards as materialized (
    select
      ficha.id,
      false as is_manual,
      ficha.kanban_column_id,
      ficha.data_entrega,
      ficha.kanban_ordem
    from public.fichas as ficha
    where ficha.status = 'pendente'

    union all

    select
      manual.id,
      true,
      manual.kanban_column_id,
      manual.data_entrega,
      manual.kanban_ordem
    from public.kanban_manual_cards as manual
  ),
  ranked as materialized (
    select
      id,
      is_manual,
      (row_number() over (
        partition by kanban_column_id
        order by data_entrega asc nulls last, kanban_ordem, is_manual, id
      ) - 1)::integer as next_order
    from cards
  ),
  updated_fichas as (
    update public.fichas as ficha
    set kanban_ordem = ranked.next_order
    from ranked
    where not ranked.is_manual
      and ficha.id = ranked.id
    returning ficha.id
  )
  update public.kanban_manual_cards as manual
  set kanban_ordem = ranked.next_order
  from ranked
  where ranked.is_manual
    and manual.id = ranked.id;
end;
$$;

create or replace function public.set_ficha_delivery_status_atomic(
  p_ficha_id uuid,
  p_actor_id uuid,
  p_delivered boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_column_id uuid;
  v_current_status public.ficha_status;
  v_next_order integer;
  v_target_status public.ficha_status;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  if not exists (select 1 from public.app_users where id = p_actor_id and active) then
    raise exception 'Active application user not found.';
  end if;

  select status, kanban_column_id
  into v_current_status, v_column_id
  from public.fichas
  where id = p_ficha_id
  for update;

  if v_current_status is null then
    raise exception 'Ficha not found.';
  end if;

  v_target_status := case
    when p_delivered then 'entregue'::public.ficha_status
    else 'pendente'::public.ficha_status
  end;

  if v_current_status = v_target_status then
    return;
  end if;

  if p_delivered then
    update public.fichas
    set delivered_at = now(), status = 'entregue'
    where id = p_ficha_id;
  else
    select coalesce(max(card_order) + 1, 0)
    into v_next_order
    from (
      select ficha.kanban_ordem as card_order
      from public.fichas as ficha
      where ficha.kanban_column_id = v_column_id
        and ficha.status = 'pendente'

      union all

      select manual.kanban_ordem
      from public.kanban_manual_cards as manual
      where manual.kanban_column_id = v_column_id
    ) as cards;

    update public.fichas
    set delivered_at = null, kanban_ordem = v_next_order, status = 'pendente'
    where id = p_ficha_id;
  end if;

  insert into public.ficha_status_events (ficha_id, changed_by_user_id, from_status, to_status)
  values (p_ficha_id, p_actor_id, v_current_status, v_target_status);

  if p_delivered then
    with cards as materialized (
      select ficha.id, false as is_manual, ficha.kanban_ordem
      from public.fichas as ficha
      where ficha.kanban_column_id = v_column_id
        and ficha.status = 'pendente'

      union all

      select manual.id, true, manual.kanban_ordem
      from public.kanban_manual_cards as manual
      where manual.kanban_column_id = v_column_id
    ),
    ranked as materialized (
      select
        id,
        is_manual,
        (row_number() over (order by kanban_ordem, is_manual, id) - 1)::integer as next_order
      from cards
    ),
    updated_fichas as (
      update public.fichas as ficha
      set kanban_ordem = ranked.next_order
      from ranked
      where not ranked.is_manual
        and ficha.id = ranked.id
      returning ficha.id
    )
    update public.kanban_manual_cards as manual
    set kanban_ordem = ranked.next_order
    from ranked
    where ranked.is_manual
      and manual.id = ranked.id;
  end if;
end;
$$;

create or replace function public.assign_ficha_kanban_order_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'pendente' and new.kanban_column_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

    select coalesce(max(card_order) + 1, 0)
    into new.kanban_ordem
    from (
      select ficha.kanban_ordem as card_order
      from public.fichas as ficha
      where ficha.status = 'pendente'
        and ficha.kanban_column_id = new.kanban_column_id

      union all

      select manual.kanban_ordem
      from public.kanban_manual_cards as manual
      where manual.kanban_column_id = new.kanban_column_id
    ) as cards;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_fichas_assign_kanban_order on public.fichas;
create trigger zz_fichas_assign_kanban_order
before insert on public.fichas
for each row execute function public.assign_ficha_kanban_order_on_insert();

create or replace function public.resequence_kanban_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  with cards as materialized (
    select ficha.id, false as is_manual, ficha.kanban_ordem
    from public.fichas as ficha
    where ficha.status = 'pendente'
      and ficha.kanban_column_id = old.kanban_column_id

    union all

    select manual.id, true, manual.kanban_ordem
    from public.kanban_manual_cards as manual
    where manual.kanban_column_id = old.kanban_column_id
  ),
  ranked as materialized (
    select
      id,
      is_manual,
      (row_number() over (order by kanban_ordem, is_manual, id) - 1)::integer as next_order
    from cards
  ),
  updated_fichas as (
    update public.fichas as ficha
    set kanban_ordem = ranked.next_order
    from ranked
    where not ranked.is_manual
      and ficha.id = ranked.id
    returning ficha.id
  )
  update public.kanban_manual_cards as manual
  set kanban_ordem = ranked.next_order
  from ranked
  where ranked.is_manual
    and manual.id = ranked.id;

  return old;
end;
$$;

drop trigger if exists fichas_resequence_kanban_after_delete on public.fichas;
create trigger fichas_resequence_kanban_after_delete
after delete on public.fichas
for each row
when (old.status = 'pendente')
execute function public.resequence_kanban_after_delete();

drop trigger if exists manual_cards_resequence_kanban_after_delete on public.kanban_manual_cards;
create trigger manual_cards_resequence_kanban_after_delete
after delete on public.kanban_manual_cards
for each row execute function public.resequence_kanban_after_delete();

create or replace function public.delete_manual_kanban_card(p_card_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  delete from public.kanban_manual_cards where id = p_card_id;
  if not found then
    raise exception 'Manual card not found.';
  end if;
end;
$$;

revoke execute on function public.move_kanban_card(uuid, uuid, integer, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.sort_kanban_cards_by_delivery_date(uuid) from public, anon, authenticated;
revoke execute on function public.sort_all_kanban_cards_by_delivery_date() from public, anon, authenticated;
revoke execute on function public.set_ficha_delivery_status_atomic(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.delete_manual_kanban_card(uuid) from public, anon, authenticated;

grant execute on function public.move_kanban_card(uuid, uuid, integer, uuid, uuid) to service_role;
grant execute on function public.sort_kanban_cards_by_delivery_date(uuid) to service_role;
grant execute on function public.sort_all_kanban_cards_by_delivery_date() to service_role;
grant execute on function public.set_ficha_delivery_status_atomic(uuid, uuid, boolean) to service_role;
grant execute on function public.delete_manual_kanban_card(uuid) to service_role;
