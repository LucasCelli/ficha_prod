begin;

create table if not exists public.app_login_rate_limits (
  attempt_key text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_login_rate_limits_attempt_key_not_blank check (btrim(attempt_key) <> '')
);

create index if not exists app_login_rate_limits_updated_at_idx
on public.app_login_rate_limits (updated_at);

alter table public.app_login_rate_limits enable row level security;

revoke all on table public.app_login_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.app_login_rate_limits to service_role;

create or replace function public.consume_login_attempt(p_attempt_keys text[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempt_key text;
  v_blocked_until timestamptz;
  v_failed_count integer;
  v_retry_after integer := 0;
  v_threshold integer;
  v_window_started_at timestamptz;
begin
  if coalesce(array_length(p_attempt_keys, 1), 0) = 0 then
    raise exception 'At least one login attempt key is required.';
  end if;

  for v_attempt_key in
    select distinct btrim(value)
    from unnest(p_attempt_keys) as input(value)
    where btrim(value) <> ''
    order by 1
  loop
    insert into public.app_login_rate_limits (attempt_key)
    values (v_attempt_key)
    on conflict (attempt_key) do nothing;

    select blocked_until
    into v_blocked_until
    from public.app_login_rate_limits
    where attempt_key = v_attempt_key
    for update;

    if v_blocked_until is not null and v_blocked_until > now() then
      v_retry_after := greatest(
        v_retry_after,
        ceil(extract(epoch from (v_blocked_until - now())))::integer
      );
    end if;
  end loop;

  if v_retry_after > 0 then
    return v_retry_after;
  end if;

  for v_attempt_key in
    select distinct btrim(value)
    from unnest(p_attempt_keys) as input(value)
    where btrim(value) <> ''
    order by 1
  loop
    select failed_count, window_started_at
    into v_failed_count, v_window_started_at
    from public.app_login_rate_limits
    where attempt_key = v_attempt_key;

    v_threshold := case when v_attempt_key like 'account:%' then 15 else 5 end;

    if v_window_started_at <= now() - interval '15 minutes' then
      v_failed_count := 1;
      v_window_started_at := now();
    else
      v_failed_count := v_failed_count + 1;
    end if;

    v_blocked_until := null;
    if v_failed_count > v_threshold then
      v_blocked_until := now() + make_interval(
        secs => least(900, (power(2, greatest(0, v_failed_count - v_threshold - 1))::integer * 60))
      );
      v_retry_after := greatest(
        v_retry_after,
        ceil(extract(epoch from (v_blocked_until - now())))::integer
      );
    end if;

    update public.app_login_rate_limits
    set
      blocked_until = v_blocked_until,
      failed_count = v_failed_count,
      updated_at = now(),
      window_started_at = v_window_started_at
    where attempt_key = v_attempt_key;
  end loop;

  return v_retry_after;
end;
$$;
create or replace function public.clear_login_attempts(p_attempt_keys text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.app_login_rate_limits
  where attempt_key = any(p_attempt_keys);
$$;

revoke execute on function public.consume_login_attempt(text[]) from public, anon, authenticated;
revoke execute on function public.clear_login_attempts(text[]) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text[]) to service_role;
grant execute on function public.clear_login_attempts(text[]) to service_role;

create table if not exists public.app_operation_rate_limits (
  quota_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_operation_rate_limits_quota_key_not_blank check (btrim(quota_key) <> '')
);

create index if not exists app_operation_rate_limits_updated_at_idx
on public.app_operation_rate_limits (updated_at);

alter table public.app_operation_rate_limits enable row level security;

revoke all on table public.app_operation_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.app_operation_rate_limits to service_role;

create or replace function public.consume_operation_quota(
  p_quota_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_count integer;
  v_window_started_at timestamptz;
begin
  if btrim(coalesce(p_quota_key, '')) = '' then
    raise exception 'Quota key is required.';
  end if;

  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Quota configuration is invalid.';
  end if;

  insert into public.app_operation_rate_limits (quota_key)
  values (btrim(p_quota_key))
  on conflict (quota_key) do nothing;

  select request_count, window_started_at
  into v_request_count, v_window_started_at
  from public.app_operation_rate_limits
  where quota_key = btrim(p_quota_key)
  for update;

  if v_window_started_at <= now() - pg_catalog.make_interval(secs => p_window_seconds) then
    v_request_count := 1;
    v_window_started_at := now();
  else
    v_request_count := v_request_count + 1;
  end if;

  update public.app_operation_rate_limits
  set
    request_count = v_request_count,
    updated_at = now(),
    window_started_at = v_window_started_at
  where quota_key = btrim(p_quota_key);

  if v_request_count > p_limit then
    return greatest(
      1,
      ceil(extract(epoch from (v_window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - now())))::integer
    );
  end if;

  return 0;
end;
$$;

revoke execute on function public.consume_operation_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_operation_quota(text, integer, integer) to service_role;
create or replace function public.refresh_cliente_ficha_stats()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_cliente_ids uuid[];
begin
  if tg_op = 'INSERT' then
    v_cliente_ids := array[new.cliente_id];
  elsif tg_op = 'DELETE' then
    v_cliente_ids := array[old.cliente_id];
  else
    v_cliente_ids := array[old.cliente_id, new.cliente_id];
  end if;

  for v_cliente_id in
    select distinct value
    from unnest(v_cliente_ids) as ids(value)
    where value is not null
    order by value
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('cliente-stats:' || v_cliente_id::text, 0)
    );

    update public.clientes as cliente
    set
      primeira_ficha = stats.primeira_ficha,
      total_fichas = stats.total_fichas,
      ultima_ficha = stats.ultima_ficha
    from (
      select
        min(ficha.data_entrega) as primeira_ficha,
        count(*)::integer as total_fichas,
        max(ficha.data_entrega) as ultima_ficha
      from public.fichas as ficha
      where ficha.cliente_id = v_cliente_id
    ) as stats
    where cliente.id = v_cliente_id;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.refresh_cliente_ficha_stats() from public, anon, authenticated;

DROP TRIGGER IF EXISTS fichas_refresh_cliente_stats_insert_delete ON public.fichas;
create trigger fichas_refresh_cliente_stats_insert_delete
after insert or delete on public.fichas
for each row execute function public.refresh_cliente_ficha_stats();

DROP TRIGGER IF EXISTS fichas_refresh_cliente_stats_update ON public.fichas;
create trigger fichas_refresh_cliente_stats_update
after update of cliente_id, data_entrega on public.fichas
for each row
when (old.cliente_id is distinct from new.cliente_id or old.data_entrega is distinct from new.data_entrega)
execute function public.refresh_cliente_ficha_stats();

update public.clientes as cliente
set
  primeira_ficha = stats.primeira_ficha,
  total_fichas = stats.total_fichas,
  ultima_ficha = stats.ultima_ficha
from (
  select
    cliente_base.id,
    min(ficha.data_entrega) as primeira_ficha,
    count(ficha.id)::integer as total_fichas,
    max(ficha.data_entrega) as ultima_ficha
  from public.clientes as cliente_base
  left join public.fichas as ficha on ficha.cliente_id = cliente_base.id
  group by cliente_base.id
) as stats
where cliente.id = stats.id;

create or replace function public.save_ficha_atomic(
  p_ficha_id uuid,
  p_actor_id uuid,
  p_ficha jsonb,
  p_itens jsonb,
  p_imagens jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_cliente_nome text := btrim(p_ficha->>'cliente_nome_snapshot');
  v_default_kanban_column_id uuid;
  v_ficha_id uuid := p_ficha_id;
  v_kanban_ordem integer;
  v_item jsonb;
  v_image jsonb;
  v_ordem bigint;
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);

  if not exists (
    select 1
    from public.app_users
    where id = p_actor_id and active
  ) then
    raise exception 'Active application user not found.';
  end if;

  if v_cliente_nome is null or v_cliente_nome = '' then
    raise exception 'Client name is required.';
  end if;

  if p_ficha->>'data_entrega' is null then
    raise exception 'Delivery date is required.';
  end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'At least one item is required.';
  end if;

  if jsonb_typeof(p_imagens) <> 'array' or jsonb_array_length(p_imagens) > 4 then
    raise exception 'Images payload is invalid.';
  end if;

  if v_ficha_id is not null then
    perform 1
    from public.fichas
    where id = v_ficha_id
    for update;

    if not found then
      raise exception 'Ficha not found.';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cliente-name:' || pg_catalog.lower(v_cliente_nome), 0)
  );

  insert into public.clientes (nome)
  values (v_cliente_nome)
  on conflict (nome_normalizado) do nothing;

  select id
  into v_cliente_id
  from public.clientes
  where nome_normalizado = pg_catalog.lower(v_cliente_nome);

  if v_cliente_id is null then
    raise exception 'Client could not be resolved.';
  end if;

  if v_ficha_id is null then
    select id
    into v_default_kanban_column_id
    from public.kanban_columns
    order by (slug = 'pendente') desc, order_index asc
    limit 1;

    if v_default_kanban_column_id is null then
      raise exception 'Default Kanban column not found.';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('kanban-card-order', 0)
    );

    select coalesce(max(kanban_ordem) + 1, 0)
    into v_kanban_ordem
    from public.fichas
    where kanban_column_id = v_default_kanban_column_id
      and status = 'pendente';

    insert into public.fichas (
      acabamento_gola,
      acabamento_manga,
      abertura_lateral,
      arte,
      bolso,
      cliente_auxiliar,
      cliente_id,
      cliente_nome_snapshot,
      com_nomes,
      composicao,
      cor_abertura_lateral,
      cor_acabamento_manga,
      cor_botao,
      cor_detalhe_gola,
      cor_gola,
      cor_material,
      cor_pe_de_gola_externo,
      cor_pe_de_gola_interno,
      cor_peitilho_externo,
      cor_peitilho_interno,
      cor_reforco,
      cor_sublimacao,
      created_by_user_id,
      data_entrega,
      data_inicio,
      etiqueta,
      evento,
      faixa,
      faixa_cor,
      faixa_local,
      filete,
      filete_cor,
      filete_local,
      gola,
      kanban_column_id,
      kanban_ordem,
      kanban_status,
      kanban_status_updated_at,
      largura_gola,
      largura_manga,
      lista_nomes_raw,
      manga,
      material,
      numero_venda,
      observacoes,
      reforco_gola,
      status,
      vendedor
    )
    values (
      nullif(p_ficha->>'acabamento_gola', ''),
      nullif(p_ficha->>'acabamento_manga', ''),
      nullif(p_ficha->>'abertura_lateral', ''),
      nullif(p_ficha->>'arte', ''),
      nullif(p_ficha->>'bolso', ''),
      nullif(p_ficha->>'cliente_auxiliar', ''),
      v_cliente_id,
      v_cliente_nome,
      nullif(p_ficha->>'com_nomes', '')::smallint,
      nullif(p_ficha->>'composicao', ''),
      nullif(p_ficha->>'cor_abertura_lateral', ''),
      nullif(p_ficha->>'cor_acabamento_manga', ''),
      nullif(p_ficha->>'cor_botao', ''),
      nullif(p_ficha->>'cor_detalhe_gola', ''),
      nullif(p_ficha->>'cor_gola', ''),
      nullif(p_ficha->>'cor_material', ''),
      nullif(p_ficha->>'cor_pe_de_gola_externo', ''),
      nullif(p_ficha->>'cor_pe_de_gola_interno', ''),
      nullif(p_ficha->>'cor_peitilho_externo', ''),
      nullif(p_ficha->>'cor_peitilho_interno', ''),
      nullif(p_ficha->>'cor_reforco', ''),
      nullif(p_ficha->>'cor_sublimacao', ''),
      p_actor_id,
      (p_ficha->>'data_entrega')::date,
      nullif(p_ficha->>'data_inicio', '')::date,
      nullif(p_ficha->>'etiqueta', ''),
      coalesce((p_ficha->>'evento')::boolean, false),
      nullif(p_ficha->>'faixa', ''),
      nullif(p_ficha->>'faixa_cor', ''),
      nullif(p_ficha->>'faixa_local', ''),
      nullif(p_ficha->>'filete', ''),
      nullif(p_ficha->>'filete_cor', ''),
      nullif(p_ficha->>'filete_local', ''),
      nullif(p_ficha->>'gola', ''),
      v_default_kanban_column_id,
      v_kanban_ordem,
      'pendente',
      now(),
      nullif(p_ficha->>'largura_gola', ''),
      nullif(p_ficha->>'largura_manga', ''),
      nullif(p_ficha->>'lista_nomes_raw', ''),
      nullif(p_ficha->>'manga', ''),
      nullif(p_ficha->>'material', ''),
      nullif(p_ficha->>'numero_venda', ''),
      nullif(p_ficha->>'observacoes', ''),
      nullif(p_ficha->>'reforco_gola', ''),
      'pendente',
      nullif(p_ficha->>'vendedor', '')
    )
    returning id into v_ficha_id;
  else
    update public.fichas
    set
      acabamento_gola = nullif(p_ficha->>'acabamento_gola', ''),
      acabamento_manga = nullif(p_ficha->>'acabamento_manga', ''),
      abertura_lateral = nullif(p_ficha->>'abertura_lateral', ''),
      arte = nullif(p_ficha->>'arte', ''),
      bolso = nullif(p_ficha->>'bolso', ''),
      cliente_auxiliar = nullif(p_ficha->>'cliente_auxiliar', ''),
      cliente_id = v_cliente_id,
      cliente_nome_snapshot = v_cliente_nome,
      com_nomes = nullif(p_ficha->>'com_nomes', '')::smallint,
      composicao = nullif(p_ficha->>'composicao', ''),
      cor_abertura_lateral = nullif(p_ficha->>'cor_abertura_lateral', ''),
      cor_acabamento_manga = nullif(p_ficha->>'cor_acabamento_manga', ''),
      cor_botao = nullif(p_ficha->>'cor_botao', ''),
      cor_detalhe_gola = nullif(p_ficha->>'cor_detalhe_gola', ''),
      cor_gola = nullif(p_ficha->>'cor_gola', ''),
      cor_material = nullif(p_ficha->>'cor_material', ''),
      cor_pe_de_gola_externo = nullif(p_ficha->>'cor_pe_de_gola_externo', ''),
      cor_pe_de_gola_interno = nullif(p_ficha->>'cor_pe_de_gola_interno', ''),
      cor_peitilho_externo = nullif(p_ficha->>'cor_peitilho_externo', ''),
      cor_peitilho_interno = nullif(p_ficha->>'cor_peitilho_interno', ''),
      cor_reforco = nullif(p_ficha->>'cor_reforco', ''),
      cor_sublimacao = nullif(p_ficha->>'cor_sublimacao', ''),
      data_entrega = (p_ficha->>'data_entrega')::date,
      data_inicio = nullif(p_ficha->>'data_inicio', '')::date,
      etiqueta = nullif(p_ficha->>'etiqueta', ''),
      evento = coalesce((p_ficha->>'evento')::boolean, false),
      faixa = nullif(p_ficha->>'faixa', ''),
      faixa_cor = nullif(p_ficha->>'faixa_cor', ''),
      faixa_local = nullif(p_ficha->>'faixa_local', ''),
      filete = nullif(p_ficha->>'filete', ''),
      filete_cor = nullif(p_ficha->>'filete_cor', ''),
      filete_local = nullif(p_ficha->>'filete_local', ''),
      gola = nullif(p_ficha->>'gola', ''),
      largura_gola = nullif(p_ficha->>'largura_gola', ''),
      largura_manga = nullif(p_ficha->>'largura_manga', ''),
      lista_nomes_raw = nullif(p_ficha->>'lista_nomes_raw', ''),
      manga = nullif(p_ficha->>'manga', ''),
      material = nullif(p_ficha->>'material', ''),
      numero_venda = nullif(p_ficha->>'numero_venda', ''),
      observacoes = nullif(p_ficha->>'observacoes', ''),
      reforco_gola = nullif(p_ficha->>'reforco_gola', ''),
      vendedor = nullif(p_ficha->>'vendedor', '')
    where id = v_ficha_id;
  end if;

  delete from public.ficha_itens where ficha_id = v_ficha_id;

  for v_item, v_ordem in
    select value, ordinality
    from jsonb_array_elements(p_itens) with ordinality as item(value, ordinality)
  loop
    insert into public.ficha_itens (
      descricao,
      detalhes_produto,
      ficha_id,
      ordem,
      produto,
      quantidade,
      tamanho
    )
    values (
      nullif(v_item->>'produto', ''),
      nullif(v_item->>'detalhes_produto', ''),
      v_ficha_id,
      (v_ordem - 1)::integer,
      nullif(v_item->>'produto', ''),
      (v_item->>'quantidade')::integer,
      nullif(v_item->>'tamanho', '')
    );
  end loop;

  delete from public.ficha_imagens where ficha_id = v_ficha_id;

  for v_image, v_ordem in
    select value, ordinality
    from jsonb_array_elements(p_imagens) with ordinality as image(value, ordinality)
  loop
    insert into public.ficha_imagens (
      alt_text,
      bytes,
      dados,
      ficha_id,
      height,
      ordem,
      storage_path,
      url,
      width
    )
    values (
      nullif(v_image->>'alt_text', ''),
      nullif(v_image->>'bytes', '')::integer,
      jsonb_build_object('publicId', v_image->>'public_id'),
      v_ficha_id,
      nullif(v_image->>'height', '')::integer,
      (v_ordem - 1)::integer,
      v_image->>'public_id',
      v_image->>'url',
      nullif(v_image->>'width', '')::integer
    );
  end loop;

  return v_ficha_id;
end;
$$;

revoke execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb) to service_role;

create index if not exists ficha_imagens_storage_path_idx
on public.ficha_imagens (storage_path)
where storage_path is not null;

commit;
