create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  order_index integer not null check (order_index >= 0),
  is_system boolean not null default false,
  color_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kanban_columns_slug_unique unique (slug)
);

create index kanban_columns_order_index_idx on public.kanban_columns (order_index);

create trigger kanban_columns_set_updated_at
before update on public.kanban_columns
for each row execute function public.set_updated_at();

insert into public.kanban_columns (slug, name, order_index, is_system, color_token)
values
  ('pendente', 'Preparando Arte', 0, true, 'warning'),
  ('exportando', 'Exportado/Arte Separada', 1, true, 'primary'),
  ('fila_impressao', 'Impresso/Fotolito Impresso', 2, true, 'info'),
  ('sublimando', 'Sublimando/Na Estamparia', 3, true, 'danger'),
  ('na_costura', 'Costura/Em Revisão', 4, true, 'success')
on conflict (slug) do nothing;

alter table public.fichas
  add column if not exists kanban_column_id uuid references public.kanban_columns(id) on delete restrict,
  add column if not exists kanban_ordem integer not null default 0 check (kanban_ordem >= 0),
  add column if not exists is_manual_card boolean not null default false,
  add column if not exists kanban_status_updated_at timestamptz not null default now();

create or replace function public.resolve_kanban_column_id(legacy_status public.kanban_status)
returns uuid
language sql
stable
as $$
  select id
  from public.kanban_columns
  where slug = case legacy_status
    when 'exportando' then 'exportando'
    when 'fila_impressao' then 'fila_impressao'
    when 'sublimando' then 'sublimando'
    when 'na_costura' then 'na_costura'
    else 'pendente'
  end
  limit 1
$$;

create or replace function public.sync_fichas_kanban_column()
returns trigger
language plpgsql
as $$
begin
  if new.kanban_column_id is null then
    new.kanban_column_id := public.resolve_kanban_column_id(coalesce(new.kanban_status, 'pendente'::public.kanban_status));
  end if;

  if new.kanban_status_updated_at is null then
    new.kanban_status_updated_at := coalesce(new.updated_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.reorder_kanban_columns(p_column_ids uuid[])
returns void
language plpgsql
as $$
declare
  current_id uuid;
  next_index integer := 0;
begin
  foreach current_id in array p_column_ids
  loop
    update public.kanban_columns
    set order_index = next_index
    where id = current_id;

    next_index := next_index + 1;
  end loop;
end;
$$;

create or replace function public.sort_kanban_cards_by_delivery_date(p_kanban_column_id uuid)
returns void
language plpgsql
as $$
begin
  with ranked as (
    select
      id,
      row_number() over (
        order by
          data_entrega asc,
          coalesce(kanban_status_updated_at, updated_at, created_at) asc,
          created_at asc,
          id asc
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
as $$
declare
  source_column_id uuid;
  source_order integer;
  target_slug text;
  clamped_target integer;
begin
  select kanban_column_id, kanban_ordem
  into source_column_id, source_order
  from public.fichas
  where id = p_ficha_id
  for update;

  if source_column_id is null then
    raise exception 'Ficha % não encontrada para mover no kanban.', p_ficha_id;
  end if;

  select slug into target_slug
  from public.kanban_columns
  where id = p_kanban_column_id;

  if target_slug is null then
    raise exception 'Coluna % não encontrada.', p_kanban_column_id;
  end if;

  if source_column_id = p_kanban_column_id then
    update public.fichas
    set kanban_ordem = kanban_ordem - 1
    where kanban_column_id = source_column_id
      and status = 'pendente'
      and kanban_ordem > source_order
      and kanban_ordem <= p_target_index;

    update public.fichas
    set kanban_ordem = kanban_ordem + 1
    where kanban_column_id = source_column_id
      and status = 'pendente'
      and kanban_ordem >= p_target_index
      and kanban_ordem < source_order;
  else
    update public.fichas
    set kanban_ordem = kanban_ordem - 1
    where kanban_column_id = source_column_id
      and status = 'pendente'
      and kanban_ordem > source_order;
  end if;

  select greatest(
    0,
    least(
      p_target_index,
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
  set kanban_ordem = kanban_ordem + 1
  where kanban_column_id = p_kanban_column_id
    and status = 'pendente'
    and id <> p_ficha_id
    and kanban_ordem >= clamped_target;

  update public.fichas
  set
    kanban_column_id = p_kanban_column_id,
    kanban_ordem = clamped_target,
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
end;
$$;

drop trigger if exists fichas_sync_kanban_column on public.fichas;

create trigger fichas_sync_kanban_column
before insert or update on public.fichas
for each row execute function public.sync_fichas_kanban_column();

update public.fichas
set
  kanban_status_updated_at = coalesce(kanban_status_updated_at, updated_at, created_at, now()),
  is_manual_card = coalesce(is_manual_card, false),
  kanban_column_id = coalesce(kanban_column_id, public.resolve_kanban_column_id(kanban_status));

with ranked as (
  select
    f.id,
    row_number() over (
      partition by f.kanban_column_id
      order by
        f.data_entrega asc,
        coalesce(f.kanban_status_updated_at, f.updated_at, f.created_at) asc,
        f.created_at asc,
        f.id asc
    ) - 1 as next_order
  from public.fichas f
  where f.status <> 'entregue'
)
update public.fichas as target
set kanban_ordem = ranked.next_order
from ranked
where ranked.id = target.id;

update public.fichas
set kanban_ordem = 0
where status = 'entregue';

alter table public.fichas
  alter column kanban_column_id set not null;

create index if not exists fichas_kanban_column_id_idx on public.fichas (kanban_column_id);
create index if not exists fichas_kanban_column_order_idx on public.fichas (kanban_column_id, kanban_ordem);
create index if not exists fichas_manual_card_idx on public.fichas (is_manual_card);
create index if not exists fichas_kanban_status_updated_at_idx on public.fichas (kanban_status_updated_at);

alter table public.kanban_columns enable row level security;

create policy "authenticated users can manage kanban_columns"
on public.kanban_columns
for all
to authenticated
using (true)
with check (true);
