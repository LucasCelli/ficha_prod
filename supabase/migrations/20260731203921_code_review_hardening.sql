begin;

-- Consolidate the rich-text source. New writes keep only the sanitized
-- observacoes field; observacoes_html remains nullable for schema compatibility.
update public.fichas
set
  observacoes = coalesce(nullif(observacoes, ''), observacoes_html),
  observacoes_html = null
where observacoes_html is not null;

create or replace function public.clear_legacy_ficha_observations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.observacoes_html := null;
  return new;
end;
$$;

drop trigger if exists fichas_clear_legacy_observations on public.fichas;
create trigger fichas_clear_legacy_observations
before insert or update of observacoes, observacoes_html on public.fichas
for each row execute function public.clear_legacy_ficha_observations();

revoke execute on function public.clear_legacy_ficha_observations() from public, anon, authenticated;

-- Preserve the public RPC contract while adding database-side limits around the
-- previously applied atomic implementation.
alter function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb)
rename to save_ficha_atomic_unchecked;

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
  v_key text;
  v_result uuid;
begin
  if jsonb_typeof(p_ficha) <> 'object' then
    raise exception 'Ficha payload is invalid.';
  end if;

  if jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0
    or jsonb_array_length(p_itens) > 200
  then
    raise exception 'Items payload is invalid.';
  end if;

  if jsonb_typeof(p_imagens) <> 'array' or jsonb_array_length(p_imagens) > 4 then
    raise exception 'Images payload is invalid.';
  end if;

  foreach v_key in array array[
    'cliente_nome_snapshot',
    'vendedor'
  ]
  loop
    if char_length(coalesce(p_ficha->>v_key, '')) > 200 then
      raise exception 'Ficha field % exceeds its limit.', v_key;
    end if;
  end loop;

  foreach v_key in array array[
    'acabamento_gola', 'acabamento_manga', 'abertura_lateral', 'arte',
    'bolso', 'cliente_auxiliar', 'composicao', 'cor_abertura_lateral',
    'cor_acabamento_manga', 'cor_botao', 'cor_detalhe_gola', 'cor_gola',
    'cor_material', 'cor_pe_de_gola_externo', 'cor_pe_de_gola_interno',
    'cor_peitilho_externo', 'cor_peitilho_interno', 'cor_reforco',
    'cor_sublimacao', 'etiqueta', 'faixa', 'faixa_cor', 'faixa_local',
    'filete', 'filete_cor', 'filete_local', 'gola', 'largura_gola',
    'largura_manga', 'manga', 'material', 'numero_venda', 'reforco_gola'
  ]
  loop
    if char_length(coalesce(p_ficha->>v_key, '')) > 500 then
      raise exception 'Ficha field % exceeds its limit.', v_key;
    end if;
  end loop;

  if char_length(coalesce(p_ficha->>'observacoes', '')) > 20000 then
    raise exception 'Observations exceed their limit.';
  end if;

  if char_length(coalesce(p_ficha->>'lista_nomes_raw', '')) > 100000 then
    raise exception 'Raw name list exceeds its limit.';
  end if;

  select public.save_ficha_atomic_unchecked(
    p_ficha_id,
    p_actor_id,
    p_ficha,
    p_itens,
    p_imagens
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.save_ficha_atomic_unchecked(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
revoke execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb)
to service_role;

create index if not exists fichas_open_kanban_order_idx
on public.fichas (kanban_column_id, kanban_ordem, id)
where status = 'pendente';

create index if not exists fichas_open_delivery_idx
on public.fichas (data_entrega, kanban_column_id)
where status = 'pendente';

create index if not exists fichas_open_material_idx
on public.fichas (lower(material))
where status = 'pendente' and material is not null;

create index if not exists fichas_open_arte_idx
on public.fichas (lower(arte))
where status = 'pendente' and arte is not null;

create or replace function public.get_kanban_board_cards(
  p_search text default null,
  p_week_start date default null,
  p_week_end date default null,
  p_material text default null,
  p_arte text default null
)
returns table (
  arte text,
  cliente_auxiliar text,
  cliente_nome_snapshot text,
  data_entrega date,
  evento boolean,
  id uuid,
  is_manual_card boolean,
  item_quantity bigint,
  kanban_column_id uuid,
  kanban_ordem integer,
  kanban_status public.kanban_status,
  material text,
  numero_venda text,
  status public.ficha_status,
  thumb_url text,
  vendedor text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    ficha.arte,
    ficha.cliente_auxiliar,
    ficha.cliente_nome_snapshot,
    ficha.data_entrega,
    ficha.evento,
    ficha.id,
    ficha.is_manual_card,
    coalesce(items.item_quantity, 0)::bigint,
    ficha.kanban_column_id,
    ficha.kanban_ordem,
    ficha.kanban_status,
    ficha.material,
    ficha.numero_venda,
    ficha.status,
    image.url,
    ficha.vendedor
  from public.fichas as ficha
  left join lateral (
    select sum(coalesce(item.quantidade, 0)) as item_quantity
    from public.ficha_itens as item
    where item.ficha_id = ficha.id
  ) as items on true
  left join lateral (
    select ficha_image.url
    from public.ficha_imagens as ficha_image
    where ficha_image.ficha_id = ficha.id
    order by ficha_image.ordem, ficha_image.id
    limit 1
  ) as image on true
  where ficha.status = 'pendente'
    and (p_week_start is null or ficha.data_entrega >= p_week_start)
    and (p_week_end is null or ficha.data_entrega <= p_week_end)
    and (nullif(btrim(p_material), '') is null or lower(ficha.material) = lower(btrim(p_material)))
    and (nullif(btrim(p_arte), '') is null or lower(ficha.arte) = lower(btrim(p_arte)))
    and (
      nullif(btrim(p_search), '') is null
      or concat_ws(
        ' ',
        ficha.cliente_nome_snapshot,
        ficha.cliente_auxiliar,
        ficha.numero_venda,
        ficha.material,
        ficha.arte,
        ficha.vendedor
      ) ilike '%' || btrim(p_search) || '%'
    )
  order by ficha.kanban_ordem, ficha.id;
$$;

revoke execute on function public.get_kanban_board_cards(text, date, date, text, text)
from public, anon, authenticated;
grant execute on function public.get_kanban_board_cards(text, date, date, text, text)
to service_role;

create or replace function public.cleanup_application_retention()
returns table (
  audit_deleted bigint,
  sessions_deleted bigint,
  login_limits_deleted bigint,
  operation_limits_deleted bigint
)
language sql
security definer
set search_path = ''
as $$
  with deleted_audit as (
    delete from public.app_login_failure_events
    where occurred_at < now() - interval '90 days'
    returning 1
  ),
  deleted_sessions as (
    delete from public.app_sessions
    where last_seen_at < now() - interval '7 days'
       or expires_at < now() - interval '7 days'
    returning 1
  ),
  deleted_login_limits as (
    delete from public.app_login_rate_limits
    where updated_at < now() - interval '7 days'
      and (blocked_until is null or blocked_until < now())
    returning 1
  ),
  deleted_operation_limits as (
    delete from public.app_operation_rate_limits
    where updated_at < now() - interval '7 days'
    returning 1
  )
  select
    (select count(*) from deleted_audit),
    (select count(*) from deleted_sessions),
    (select count(*) from deleted_login_limits),
    (select count(*) from deleted_operation_limits);
$$;

revoke execute on function public.cleanup_application_retention()
from public, anon, authenticated;
grant execute on function public.cleanup_application_retention()
to service_role;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'ficha-prod-application-retention',
  '17 3 * * *',
  'select public.cleanup_application_retention()'
);

commit;
