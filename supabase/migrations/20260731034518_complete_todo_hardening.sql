begin;

create table public.app_login_failure_events (
  id bigint generated always as identity primary key,
  account_key text not null,
  origin_key text not null,
  pair_key text not null,
  occurred_at timestamptz not null default now(),
  constraint app_login_failure_events_account_key check (account_key like 'account:%'),
  constraint app_login_failure_events_origin_key check (origin_key like 'origin:%'),
  constraint app_login_failure_events_pair_key check (pair_key like 'pair:%')
);

create index app_login_failure_events_occurred_at_idx
on public.app_login_failure_events (occurred_at desc);

create index app_login_failure_events_account_occurred_idx
on public.app_login_failure_events (account_key, occurred_at desc);

alter table public.app_login_failure_events enable row level security;
revoke all on table public.app_login_failure_events from public, anon, authenticated;
grant select, insert, delete on table public.app_login_failure_events to service_role;
grant usage, select on sequence public.app_login_failure_events_id_seq to service_role;

create or replace function public.record_login_failure(p_attempt_keys text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account_key text;
  v_origin_key text;
  v_pair_key text;
begin
  select
    max(value) filter (where value like 'account:%'),
    max(value) filter (where value like 'origin:%'),
    max(value) filter (where value like 'pair:%')
  into v_account_key, v_origin_key, v_pair_key
  from pg_catalog.unnest(p_attempt_keys) as input(value);

  if v_account_key is null or v_origin_key is null or v_pair_key is null then
    raise exception 'Login failure dimensions are invalid.';
  end if;

  insert into public.app_login_failure_events (account_key, origin_key, pair_key)
  values (v_account_key, v_origin_key, v_pair_key);
end;
$$;

revoke execute on function public.record_login_failure(text[]) from public, anon, authenticated;
grant execute on function public.record_login_failure(text[]) to service_role;

create or replace function public.resolve_app_session(
  p_token_hash text,
  p_seen_at timestamptz
)
returns table (
  expires_at timestamptz,
  last_seen_at timestamptz,
  user_id uuid,
  username text,
  display_name text,
  role public.app_user_role,
  active boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if btrim(coalesce(p_token_hash, '')) = '' then
    return;
  end if;

  update public.app_sessions as session
  set last_seen_at = p_seen_at
  from public.app_users as app_user
  where session.token_hash = p_token_hash
    and session.user_id = app_user.id
    and session.expires_at > p_seen_at
    and app_user.active
    and session.last_seen_at <= p_seen_at - interval '5 minutes';

  return query
  select
    session.expires_at,
    session.last_seen_at,
    app_user.id,
    app_user.username,
    app_user.display_name,
    app_user.role,
    app_user.active
  from public.app_sessions as session
  join public.app_users as app_user on app_user.id = session.user_id
  where session.token_hash = p_token_hash
    and session.expires_at > p_seen_at
    and app_user.active
  limit 1;
end;
$$;

revoke execute on function public.resolve_app_session(text, timestamptz) from public, anon, authenticated;
grant execute on function public.resolve_app_session(text, timestamptz) to service_role;

-- O produto não possui cancelamento operacional. Qualquer resíduo legado volta a pendente.
update public.fichas
set status = 'pendente'
where status::text = 'cancelado';

update public.ficha_status_events
set from_status = 'pendente'
where from_status::text = 'cancelado';

update public.ficha_status_events
set to_status = 'pendente'
where to_status::text = 'cancelado';

alter table public.fichas alter column status drop default;
alter table public.fichas alter column status type text using status::text;
alter table public.ficha_status_events alter column from_status type text using from_status::text;
alter table public.ficha_status_events alter column to_status type text using to_status::text;

drop type public.ficha_status;
create type public.ficha_status as enum ('pendente', 'entregue');

alter table public.fichas
  alter column status type public.ficha_status using status::public.ficha_status,
  alter column status set default 'pendente'::public.ficha_status;

alter table public.ficha_status_events
  alter column from_status type public.ficha_status using from_status::public.ficha_status,
  alter column to_status type public.ficha_status using to_status::public.ficha_status;

create or replace function public.reorder_kanban_columns(p_column_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_column_count integer;
  v_distinct_count integer;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-column-order', 0));

  select count(*) into v_column_count from public.kanban_columns;
  select count(distinct value) into v_distinct_count from pg_catalog.unnest(p_column_ids) as input(value);

  if coalesce(pg_catalog.array_length(p_column_ids, 1), 0) <> v_column_count
    or v_distinct_count <> v_column_count
    or exists (
      select 1
      from pg_catalog.unnest(p_column_ids) as input(value)
      left join public.kanban_columns as column_item on column_item.id = input.value
      where column_item.id is null
    ) then
    raise exception 'Kanban column order payload is incomplete.';
  end if;

  update public.kanban_columns as column_item
  set order_index = (ordered.ordinality - 1)::integer
  from pg_catalog.unnest(p_column_ids) with ordinality as ordered(id, ordinality)
  where column_item.id = ordered.id;
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

  with ranked as (
    select
      id,
      row_number() over (
        order by data_entrega, coalesce(kanban_status_updated_at, updated_at, created_at), created_at, id
      ) - 1 as next_order
    from public.fichas
    where kanban_column_id = p_kanban_column_id
      and status = 'pendente'
  )
  update public.fichas as target
  set kanban_ordem = ranked.next_order
  from ranked
  where ranked.id = target.id;
end;
$$;

create or replace function public.move_kanban_card(
  p_ficha_id uuid,
  p_kanban_column_id uuid,
  p_target_index integer default 0
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_column_id uuid;
  v_target_slug text;
  v_clamped_target integer;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  select kanban_column_id
  into v_source_column_id
  from public.fichas
  where id = p_ficha_id
    and status = 'pendente'
  for update;

  if v_source_column_id is null then
    raise exception 'Pending ficha not found.';
  end if;

  select slug
  into v_target_slug
  from public.kanban_columns
  where id = p_kanban_column_id;

  if v_target_slug is null then
    raise exception 'Kanban column not found.';
  end if;

  select greatest(
    0,
    least(
      coalesce(p_target_index, 0),
      count(*)::integer
    )
  )
  into v_clamped_target
  from public.fichas
  where kanban_column_id = p_kanban_column_id
    and status = 'pendente'
    and id <> p_ficha_id;

  update public.fichas
  set
    kanban_column_id = p_kanban_column_id,
    kanban_ordem = 0,
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

  if v_source_column_id <> p_kanban_column_id then
    with source_ranked as (
      select id, row_number() over (order by kanban_ordem, data_entrega, id) - 1 as next_order
      from public.fichas
      where kanban_column_id = v_source_column_id
        and status = 'pendente'
    )
    update public.fichas as target
    set kanban_ordem = source_ranked.next_order
    from source_ranked
    where source_ranked.id = target.id;
  end if;

  with target_existing as (
    select id, row_number() over (order by kanban_ordem, data_entrega, id) - 1 as dense_index
    from public.fichas
    where kanban_column_id = p_kanban_column_id
      and status = 'pendente'
      and id <> p_ficha_id
  ),
  target_ranked as (
    select
      ordered.id,
      row_number() over (order by ordered.sort_index, ordered.is_moved desc, ordered.id) - 1 as next_order
    from (
      select
        id,
        case when dense_index >= v_clamped_target then dense_index + 1 else dense_index end as sort_index,
        0 as is_moved
      from target_existing
      union all
      select p_ficha_id, v_clamped_target, 1
    ) as ordered
  )
  update public.fichas as target
  set kanban_ordem = target_ranked.next_order
  from target_ranked
  where target_ranked.id = target.id;
end;
$$;

create or replace function public.create_manual_kanban_card_atomic(
  p_actor_id uuid,
  p_column_id uuid,
  p_title text,
  p_data_entrega date,
  p_evento boolean,
  p_arte text,
  p_material text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_card_id uuid;
  v_legacy_status public.kanban_status;
  v_next_order integer;
  v_target_slug text;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-card-order', 0));

  if not exists (select 1 from public.app_users where id = p_actor_id and active) then
    raise exception 'Active application user not found.';
  end if;

  if btrim(coalesce(p_title, '')) = '' or p_data_entrega is null then
    raise exception 'Manual card payload is invalid.';
  end if;

  select slug
  into v_target_slug
  from public.kanban_columns
  where id = p_column_id;

  if v_target_slug is null then
    raise exception 'Kanban column not found.';
  end if;

  v_legacy_status := case v_target_slug
    when 'exportando' then 'exportando'::public.kanban_status
    when 'fila_impressao' then 'fila_impressao'::public.kanban_status
    when 'sublimando' then 'sublimando'::public.kanban_status
    when 'na_costura' then 'na_costura'::public.kanban_status
    else 'pendente'::public.kanban_status
  end;

  select coalesce(max(kanban_ordem) + 1, 0)
  into v_next_order
  from public.fichas
  where kanban_column_id = p_column_id
    and status = 'pendente';

  insert into public.fichas (
    arte,
    cliente_nome_snapshot,
    created_by_user_id,
    data_entrega,
    data_inicio,
    evento,
    insumo_status,
    is_manual_card,
    kanban_column_id,
    kanban_ordem,
    kanban_status,
    kanban_status_updated_at,
    material,
    observacoes,
    status
  )
  values (
    nullif(btrim(p_arte), ''),
    btrim(p_title),
    p_actor_id,
    p_data_entrega,
    (now() at time zone 'America/Cuiaba')::date,
    coalesce(p_evento, false),
    'tudo_ok',
    true,
    p_column_id,
    v_next_order,
    v_legacy_status,
    now(),
    nullif(btrim(p_material), ''),
    null,
    'pendente'
  )
  returning id into v_card_id;

  return v_card_id;
end;
$$;

create or replace function public.create_kanban_column_atomic(
  p_name text,
  p_base_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_column_id uuid;
  v_next_order integer;
  v_slug text;
  v_suffix integer := 2;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '10s', true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kanban-column-order', 0));

  if btrim(coalesce(p_name, '')) = '' or btrim(coalesce(p_base_slug, '')) = '' then
    raise exception 'Kanban column payload is invalid.';
  end if;

  v_slug := left(btrim(p_base_slug), 48);
  while exists (select 1 from public.kanban_columns where slug = v_slug) loop
    v_slug := left(btrim(p_base_slug), 43) || '_' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  select coalesce(max(order_index) + 1, 0)
  into v_next_order
  from public.kanban_columns;

  insert into public.kanban_columns (color_token, is_system, name, order_index, slug)
  values (null, false, btrim(p_name), v_next_order, v_slug)
  returning id into v_column_id;

  return v_column_id;
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

  v_target_status := case when p_delivered then 'entregue'::public.ficha_status else 'pendente'::public.ficha_status end;
  if v_current_status = v_target_status then
    return;
  end if;

  if p_delivered then
    update public.fichas
    set delivered_at = now(), status = 'entregue'
    where id = p_ficha_id;
  else
    select coalesce(max(kanban_ordem) + 1, 0)
    into v_next_order
    from public.fichas
    where kanban_column_id = v_column_id
      and status = 'pendente';

    update public.fichas
    set delivered_at = null, kanban_ordem = v_next_order, status = 'pendente'
    where id = p_ficha_id;
  end if;

  insert into public.ficha_status_events (ficha_id, changed_by_user_id, from_status, to_status)
  values (p_ficha_id, p_actor_id, v_current_status, v_target_status);

  if p_delivered then
    with ranked as (
      select id, row_number() over (order by kanban_ordem, data_entrega, id) - 1 as next_order
      from public.fichas
      where kanban_column_id = v_column_id
        and status = 'pendente'
    )
    update public.fichas as target
    set kanban_ordem = ranked.next_order
    from ranked
    where ranked.id = target.id;
  end if;
end;
$$;

create or replace function public.get_personal_dashboard_summary(
  p_user_id uuid,
  p_since date,
  p_previous_since date,
  p_today date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with user_fichas as (
    select
      ficha.id,
      ficha.cliente_nome_snapshot,
      ficha.created_at,
      ficha.updated_at,
      ficha.data_entrega,
      ficha.delivered_at,
      ficha.status,
      coalesce(item_totals.pieces, 0)::bigint as pieces,
      (ficha.created_at at time zone 'America/Cuiaba')::date as created_date,
      (ficha.updated_at at time zone 'America/Cuiaba')::date as updated_date,
      case
        when ficha.delivered_at is null then null
        else (ficha.delivered_at at time zone 'America/Cuiaba')::date
      end as delivered_date
    from public.fichas as ficha
    left join lateral (
      select coalesce(sum(item.quantidade), 0) as pieces
      from public.ficha_itens as item
      where item.ficha_id = ficha.id
    ) as item_totals on true
    where ficha.created_by_user_id = p_user_id
  ),
  current_fichas as (
    select *
    from user_fichas
    where (p_since is null or created_date >= p_since)
      and created_date <= p_today
  ),
  previous_fichas as (
    select *
    from user_fichas
    where p_since is not null
      and created_date >= p_previous_since
      and created_date < p_since
  ),
  daily_series as (
    select created_date, count(*)::integer as total
    from current_fichas
    group by created_date
    order by created_date
  )
  select pg_catalog.jsonb_build_object(
    'allTimeTotal', (select count(*) from user_fichas),
    'averageLeadDays', (
      select avg(delivered_date - created_date)
      from current_fichas
      where status = 'entregue' and delivered_date is not null
    ),
    'currentCount', (select count(*) from current_fichas),
    'previousCount', (select count(*) from previous_fichas),
    'metrics', pg_catalog.jsonb_build_object(
      'atrasadas', (select count(*) from current_fichas where status = 'pendente' and data_entrega < p_today),
      'entregues', (select count(*) from current_fichas where status = 'entregue'),
      'fichas', (select count(*) from current_fichas),
      'noPrazo', (
        select count(*) from current_fichas
        where status = 'entregue' and delivered_date is not null and delivered_date <= data_entrega
      ),
      'pendentes', (select count(*) from current_fichas where status = 'pendente'),
      'pieces', (select coalesce(sum(pieces), 0) from current_fichas)
    ),
    'series', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('date', created_date, 'total', total)
        order by created_date
      )
      from daily_series
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(upcoming_row) order by upcoming_row.data_entrega, upcoming_row.id)
      from (
        select id, cliente_nome_snapshot, data_entrega
        from current_fichas
        where status = 'pendente'
        order by data_entrega, id
        limit 5
      ) as upcoming_row
    ), '[]'::jsonb),
    'idle', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(idle_row) order by idle_row.updated_at, idle_row.id)
      from (
        select id, cliente_nome_snapshot, data_entrega, updated_at
        from current_fichas
        where status = 'pendente'
          and updated_date <= p_today - 7
        order by updated_at, id
        limit 5
      ) as idle_row
    ), '[]'::jsonb),
    'lastLoginAt', (select last_login_at from public.app_users where id = p_user_id)
  );
$$;

create or replace function public.get_personal_fichas_page(
  p_user_id uuid,
  p_status text,
  p_search text,
  p_today date,
  p_offset integer,
  p_limit integer
)
returns table (
  id uuid,
  cliente_nome_snapshot text,
  arte text,
  image_url text,
  numero_venda text,
  created_at timestamptz,
  updated_at timestamptz,
  data_entrega date,
  delivered_at timestamptz,
  status public.ficha_status,
  vendedor text,
  pieces bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      ficha.id,
      ficha.cliente_nome_snapshot,
      ficha.arte,
      ficha.numero_venda,
      ficha.created_at,
      ficha.updated_at,
      ficha.data_entrega,
      ficha.delivered_at,
      ficha.status,
      ficha.vendedor,
      count(*) over () as total_count
    from public.fichas as ficha
    where ficha.created_by_user_id = p_user_id
      and (
        p_status = 'todos'
        or (p_status = 'atrasado' and ficha.status = 'pendente' and ficha.data_entrega < p_today)
        or (p_status = 'pendente' and ficha.status = 'pendente')
        or (p_status = 'entregue' and ficha.status = 'entregue')
      )
      and (
        btrim(coalesce(p_search, '')) = ''
        or position(lower(btrim(p_search)) in lower(ficha.cliente_nome_snapshot)) > 0
      )
    order by ficha.created_at desc, ficha.id
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  )
  select
    filtered.id,
    filtered.cliente_nome_snapshot,
    filtered.arte,
    first_image.url,
    filtered.numero_venda,
    filtered.created_at,
    filtered.updated_at,
    filtered.data_entrega,
    filtered.delivered_at,
    filtered.status,
    filtered.vendedor,
    coalesce(item_totals.pieces, 0)::bigint,
    filtered.total_count
  from filtered
  left join lateral (
    select image.url
    from public.ficha_imagens as image
    where image.ficha_id = filtered.id
    order by image.ordem, image.id
    limit 1
  ) as first_image on true
  left join lateral (
    select coalesce(sum(item.quantidade), 0) as pieces
    from public.ficha_itens as item
    where item.ficha_id = filtered.id
  ) as item_totals on true
  order by filtered.created_at desc, filtered.id;
$$;

create or replace function public.get_report_summary(
  p_start date,
  p_end date,
  p_previous_start date,
  p_previous_end date,
  p_delivery_year_start date,
  p_delivery_year_end date,
  p_status text,
  p_evento boolean
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with current_fichas as (
    select ficha.*
    from public.fichas as ficha
    where ficha.data_inicio between p_start and p_end
      and (p_status is null or ficha.status::text = p_status)
      and (p_evento is null or ficha.evento = p_evento)
  ),
  previous_fichas as (
    select ficha.*
    from public.fichas as ficha
    where ficha.data_inicio between p_previous_start and p_previous_end
      and (p_status is null or ficha.status::text = p_status)
      and (p_evento is null or ficha.evento = p_evento)
  ),
  current_item_totals as (
    select item.ficha_id, coalesce(sum(item.quantidade), 0)::bigint as total_itens
    from public.ficha_itens as item
    join current_fichas as ficha on ficha.id = item.ficha_id
    group by item.ficha_id
  ),
  previous_item_totals as (
    select item.ficha_id, coalesce(sum(item.quantidade), 0)::bigint as total_itens
    from public.ficha_itens as item
    join previous_fichas as ficha on ficha.id = item.ficha_id
    group by item.ficha_id
  ),
  current_with_totals as (
    select ficha.*, coalesce(item_total.total_itens, 0)::bigint as total_itens
    from current_fichas as ficha
    left join current_item_totals as item_total on item_total.ficha_id = ficha.id
  ),
  previous_with_totals as (
    select ficha.*, coalesce(item_total.total_itens, 0)::bigint as total_itens
    from previous_fichas as ficha
    left join previous_item_totals as item_total on item_total.ficha_id = ficha.id
  ),
  trend_rows as (
    select
      ficha.data_inicio as date,
      count(*)::integer as criadas,
      count(*) filter (where ficha.status = 'entregue')::integer as entregues,
      count(*) filter (where ficha.status = 'pendente')::integer as pendentes,
      coalesce(sum(ficha.total_itens), 0)::bigint as itens
    from current_with_totals as ficha
    group by ficha.data_inicio
    order by ficha.data_inicio
  ),
  client_rank as (
    select
      ficha.cliente_nome_snapshot as label,
      count(*)::integer as total_fichas,
      coalesce(sum(ficha.total_itens), 0)::bigint as total_itens
    from current_with_totals as ficha
    group by ficha.cliente_nome_snapshot
    order by total_itens desc, total_fichas desc, label
    limit 12
  ),
  material_rank as (
    select
      coalesce(nullif(btrim(ficha.material), ''), 'Não especificado') as label,
      count(*)::integer as total_fichas,
      coalesce(sum(ficha.total_itens), 0)::bigint as total_itens
    from current_with_totals as ficha
    group by coalesce(nullif(btrim(ficha.material), ''), 'Não especificado')
    order by total_itens desc, total_fichas desc, label
    limit 12
  ),
  personalization_rank as (
    select
      coalesce(nullif(btrim(lower(pg_catalog.regexp_replace(ficha.arte, '[_-]+', ' ', 'g'))), ''), 'sem personalizacao') as label,
      count(*)::integer as total_fichas,
      coalesce(sum(ficha.total_itens), 0)::bigint as total_itens
    from current_with_totals as ficha
    group by coalesce(nullif(btrim(lower(pg_catalog.regexp_replace(ficha.arte, '[_-]+', ' ', 'g'))), ''), 'sem personalizacao')
    order by total_itens desc, total_fichas desc, label
    limit 12
  ),
  seller_rank as (
    select
      coalesce(nullif(btrim(ficha.vendedor), ''), 'Sem vendedor') as label,
      count(*)::integer as total_fichas,
      coalesce(sum(ficha.total_itens), 0)::bigint as total_itens,
      count(*) filter (where ficha.status = 'entregue')::integer as entregues,
      count(*) filter (where ficha.status = 'pendente')::integer as pendentes
    from current_with_totals as ficha
    group by coalesce(nullif(btrim(ficha.vendedor), ''), 'Sem vendedor')
    order by total_fichas desc, label
    limit 12
  ),
  product_rank as (
    select
      coalesce(nullif(btrim(item.produto), ''), 'Não especificado') as label,
      count(distinct item.ficha_id)::integer as total_fichas,
      coalesce(sum(item.quantidade), 0)::bigint as total_itens
    from public.ficha_itens as item
    join current_fichas as ficha on ficha.id = item.ficha_id
    group by coalesce(nullif(btrim(item.produto), ''), 'Não especificado')
    order by total_itens desc, label
    limit 12
  ),
  size_rank as (
    select
      coalesce(nullif(btrim(item.tamanho), ''), 'Sem tamanho') as label,
      count(distinct item.ficha_id)::integer as total_fichas,
      coalesce(sum(item.quantidade), 0)::bigint as total_itens
    from public.ficha_itens as item
    join current_fichas as ficha on ficha.id = item.ficha_id
    group by coalesce(nullif(btrim(item.tamanho), ''), 'Sem tamanho')
    order by total_itens desc, label
    limit 12
  )
  select pg_catalog.jsonb_build_object(
    'current', pg_catalog.jsonb_build_object(
      'clientes', (select count(*) from public.clientes where primeira_ficha between p_start and p_end),
      'fichas', (select count(*) from current_with_totals),
      'itens', (select coalesce(sum(total_itens), 0) from current_with_totals),
      'entregues', (select count(*) from current_with_totals where status = 'entregue'),
      'pendentes', (select count(*) from current_with_totals where status = 'pendente'),
      'itensConfeccionados', (select coalesce(sum(total_itens), 0) from current_with_totals where status = 'entregue'),
      'prazoMedioEntrega', (
        select avg(coalesce((delivered_at at time zone 'America/Cuiaba')::date, data_entrega) - data_inicio)
        from current_with_totals
        where status = 'entregue'
          and data_inicio is not null
          and coalesce((delivered_at at time zone 'America/Cuiaba')::date, data_entrega) >= data_inicio
      )
    ),
    'previous', pg_catalog.jsonb_build_object(
      'clientes', (select count(*) from public.clientes where primeira_ficha between p_previous_start and p_previous_end),
      'fichas', (select count(*) from previous_with_totals),
      'itens', (select coalesce(sum(total_itens), 0) from previous_with_totals),
      'entregues', (select count(*) from previous_with_totals where status = 'entregue'),
      'pendentes', (select count(*) from previous_with_totals where status = 'pendente')
    ),
    'deliveryYearCount', (
      select count(*)
      from public.fichas as ficha
      where ficha.data_inicio between p_delivery_year_start and p_delivery_year_end
        and ficha.status = 'entregue'
        and (p_evento is null or ficha.evento = p_evento)
    ),
    'events', pg_catalog.jsonb_build_object(
      'eventos', (select count(*) from current_with_totals where evento),
      'avulsos', (select count(*) from current_with_totals where not evento)
    ),
    'trend', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(trend_rows) order by date) from trend_rows), '[]'::jsonb),
    'rankings', pg_catalog.jsonb_build_object(
      'clientes', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(client_rank) order by total_itens desc, total_fichas desc, label) from client_rank), '[]'::jsonb),
      'materiais', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(material_rank) order by total_itens desc, total_fichas desc, label) from material_rank), '[]'::jsonb),
      'personalizacoes', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(personalization_rank) order by total_itens desc, total_fichas desc, label) from personalization_rank), '[]'::jsonb),
      'produtos', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(product_rank) order by total_itens desc, label) from product_rank), '[]'::jsonb),
      'tamanhos', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(size_rank) order by total_itens desc, label) from size_rank), '[]'::jsonb),
      'vendedores', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(seller_rank) order by total_fichas desc, label) from seller_rank), '[]'::jsonb)
    )
  );
$$;

create or replace function public.get_report_details_page(
  p_start date,
  p_end date,
  p_status text,
  p_evento boolean,
  p_offset integer,
  p_limit integer
)
returns table (
  id uuid,
  cliente text,
  vendedor text,
  material text,
  quantidade bigint,
  status public.ficha_status,
  data date,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      ficha.id,
      ficha.cliente_nome_snapshot,
      ficha.vendedor,
      ficha.material,
      ficha.status,
      ficha.data_inicio,
      count(*) over () as total_count
    from public.fichas as ficha
    where ficha.data_inicio between p_start and p_end
      and (p_status is null or ficha.status::text = p_status)
      and (p_evento is null or ficha.evento = p_evento)
    order by ficha.data_inicio desc, ficha.id
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  select
    filtered.id,
    filtered.cliente_nome_snapshot,
    coalesce(nullif(btrim(filtered.vendedor), ''), 'Sem vendedor'),
    coalesce(nullif(btrim(filtered.material), ''), 'Não especificado'),
    coalesce(item_totals.quantidade, 0)::bigint,
    filtered.status,
    filtered.data_inicio,
    filtered.total_count
  from filtered
  left join lateral (
    select coalesce(sum(item.quantidade), 0) as quantidade
    from public.ficha_itens as item
    where item.ficha_id = filtered.id
  ) as item_totals on true
  order by filtered.data_inicio desc, filtered.id;
$$;

revoke execute on function public.get_report_summary(date, date, date, date, date, date, text, boolean) from public, anon, authenticated;
revoke execute on function public.get_report_details_page(date, date, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.get_report_summary(date, date, date, date, date, date, text, boolean) to service_role;
grant execute on function public.get_report_details_page(date, date, text, boolean, integer, integer) to service_role;
revoke execute on function public.get_personal_dashboard_summary(uuid, date, date, date) from public, anon, authenticated;
revoke execute on function public.get_personal_fichas_page(uuid, text, text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.get_personal_dashboard_summary(uuid, date, date, date) to service_role;
grant execute on function public.get_personal_fichas_page(uuid, text, text, date, integer, integer) to service_role;
revoke execute on function public.reorder_kanban_columns(uuid[]) from public, anon, authenticated;
revoke execute on function public.sort_kanban_cards_by_delivery_date(uuid) from public, anon, authenticated;
revoke execute on function public.move_kanban_card(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.create_manual_kanban_card_atomic(uuid, uuid, text, date, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.create_kanban_column_atomic(text, text) from public, anon, authenticated;
revoke execute on function public.set_ficha_delivery_status_atomic(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.reorder_kanban_columns(uuid[]) to service_role;
grant execute on function public.sort_kanban_cards_by_delivery_date(uuid) to service_role;
grant execute on function public.move_kanban_card(uuid, uuid, integer) to service_role;
grant execute on function public.create_manual_kanban_card_atomic(uuid, uuid, text, date, boolean, text, text) to service_role;
grant execute on function public.create_kanban_column_atomic(text, text) to service_role;
grant execute on function public.set_ficha_delivery_status_atomic(uuid, uuid, boolean) to service_role;

commit;