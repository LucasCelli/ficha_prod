begin;

alter table public.clientes
  add column if not exists empresa text;

alter table public.clientes
  drop constraint if exists clientes_nome_normalizado_unique;

drop trigger if exists clientes_normalize_nome on public.clientes;

alter table public.clientes
  drop column if exists nome_normalizado;

alter table public.clientes
  add column nome_normalizado text generated always as (
    lower(regexp_replace(normalize(btrim(nome), NFKC), '\s+', ' ', 'g'))
  ) stored;

alter table public.clientes
  drop column if exists empresa_normalizada;

alter table public.clientes
  add column empresa_normalizada text generated always as (
    lower(regexp_replace(normalize(coalesce(btrim(empresa), ''), NFKC), '\s+', ' ', 'g'))
  ) stored;

drop index if exists public.clientes_identidade_normalizada_unique;
create unique index clientes_identidade_normalizada_unique
on public.clientes (nome_normalizado, empresa_normalizada);

create index if not exists clientes_empresa_busca_idx
on public.clientes (empresa_normalizada)
where empresa_normalizada <> '';

create or replace function public.save_cliente_atomic(
  p_cliente_id uuid,
  p_nome text,
  p_empresa text default null,
  p_telefone text default null,
  p_email text default null
)
returns public.clientes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cliente public.clientes;
  v_nome text := btrim(regexp_replace(normalize(coalesce(p_nome, ''), NFKC), '\s+', ' ', 'g'));
  v_empresa text := nullif(btrim(regexp_replace(normalize(coalesce(p_empresa, ''), NFKC), '\s+', ' ', 'g')), '');
  v_nome_normalizado text;
  v_empresa_normalizada text;
begin
  if v_nome = '' then
    raise exception using errcode = '22023', message = 'Nome é obrigatório.';
  end if;

  v_nome_normalizado := lower(v_nome);
  v_empresa_normalizada := lower(coalesce(v_empresa, ''));

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cliente-name:' || v_nome_normalizado, 0)
  );

  if v_empresa is null and exists (
    select 1 from public.clientes
    where nome_normalizado = v_nome_normalizado
      and id is distinct from p_cliente_id
  ) then
    raise exception using errcode = '23505', message = 'Já existe um cliente com este nome. Informe a Empresa/Instituição para diferenciar o cadastro.';
  end if;

  if exists (
    select 1 from public.clientes
    where nome_normalizado = v_nome_normalizado
      and empresa_normalizada = v_empresa_normalizada
      and id is distinct from p_cliente_id
  ) then
    raise exception using errcode = '23505', message = 'Já existe um cliente com este nome e esta Empresa/Instituição.';
  end if;

  if p_cliente_id is null then
    insert into public.clientes (nome, empresa, telefone, email)
    values (v_nome, v_empresa, nullif(btrim(p_telefone), ''), nullif(btrim(p_email), ''))
    returning * into v_cliente;
  else
    update public.clientes
    set nome = v_nome,
        empresa = v_empresa,
        telefone = nullif(btrim(p_telefone), ''),
        email = nullif(btrim(p_email), '')
    where id = p_cliente_id
    returning * into v_cliente;

    if v_cliente.id is null then
      raise exception using errcode = 'P0002', message = 'Cliente não encontrado.';
    end if;
  end if;

  return v_cliente;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Já existe um cliente com este nome e esta Empresa/Instituição.';
end;
$$;

revoke execute on function public.save_cliente_atomic(uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.save_cliente_atomic(uuid, text, text, text, text)
to service_role;

-- A implementação histórica da ficha criava/resolvia clientes pelo texto.
-- Substituímos apenas esse bloco dentro da função já consolidada para preservar
-- integralmente as demais garantias atômicas do fluxo.
do $$
declare
  v_definition text;
  v_legacy_start integer;
  v_legacy_end integer;
  v_new_block text := $new$
  begin
    v_cliente_id := nullif(p_ficha->>'cliente_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Selecione um cliente cadastrado ou use "Novo Cliente" para cadastrar um novo cliente.';
  end;

  select cliente.nome
  into v_cliente_nome
  from public.clientes as cliente
  where cliente.id = v_cliente_id;

  if v_cliente_id is null or v_cliente_nome is null then
    raise exception 'Selecione um cliente cadastrado ou use "Novo Cliente" para cadastrar um novo cliente.';
  end if;

  p_ficha := pg_catalog.jsonb_set(
    p_ficha,
    '{cliente_nome_snapshot}',
    pg_catalog.to_jsonb(v_cliente_nome),
    true
  );
$new$;
begin
  v_definition := pg_catalog.pg_get_functiondef(
    'public.save_ficha_atomic_unchecked(uuid,uuid,jsonb,jsonb,jsonb)'::regprocedure
  );

  v_legacy_start := pg_catalog.strpos(
    v_definition,
    '  perform pg_catalog.pg_advisory_xact_lock('
  );
  v_legacy_end := pg_catalog.strpos(
    v_definition,
    '  if v_ficha_id is null then'
  );

  if v_legacy_start = 0 or v_legacy_end = 0 or v_legacy_end <= v_legacy_start then
    raise exception 'Bloco legado de resolução de cliente não encontrado.';
  end if;

  execute pg_catalog.substr(v_definition, 1, v_legacy_start - 1)
    || v_new_block
    || pg_catalog.chr(10)
    || pg_catalog.chr(10)
    || pg_catalog.substr(v_definition, v_legacy_end);
end;
$$;

commit;
