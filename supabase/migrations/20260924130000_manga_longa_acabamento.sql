-- Manga "Curta e Longa": the existing acabamento/largura/cor columns hold the short
-- sleeve; these columns hold the long sleeve.
alter table public.fichas
  add column if not exists acabamento_manga_longa text,
  add column if not exists largura_manga_longa text,
  add column if not exists cor_acabamento_manga_longa text;

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
    'acabamento_gola', 'acabamento_manga', 'acabamento_manga_longa', 'abertura_lateral', 'arte',
    'bolso', 'cliente_auxiliar', 'composicao', 'cor_abertura_lateral',
    'cor_acabamento_manga', 'cor_acabamento_manga_longa', 'cor_botao', 'cor_detalhe_gola', 'cor_gola',
    'cor_material', 'cor_pe_de_gola_externo', 'cor_pe_de_gola_interno',
    'cor_peitilho_externo', 'cor_peitilho_interno', 'cor_reforco',
    'cor_sublimacao', 'etiqueta', 'faixa', 'faixa_cor', 'faixa_local',
    'filete', 'filete_cor', 'filete_local', 'gola', 'largura_gola',
    'largura_manga', 'largura_manga_longa', 'manga', 'material', 'numero_venda', 'reforco_gola'
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

  -- Same transaction as the unchecked save.
  update public.fichas
  set
    acabamento_manga_longa = nullif(p_ficha->>'acabamento_manga_longa', ''),
    largura_manga_longa = nullif(p_ficha->>'largura_manga_longa', ''),
    cor_acabamento_manga_longa = nullif(p_ficha->>'cor_acabamento_manga_longa', '')
  where id = v_result;

  return v_result;
end;
$$;

revoke execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.save_ficha_atomic(uuid, uuid, jsonb, jsonb, jsonb)
to service_role;
