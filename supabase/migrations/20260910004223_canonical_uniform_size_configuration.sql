-- O catalogo de tamanhos existente e a fonte persistida de identidade, aliases,
-- ativacao e ordem. O upsert preserva UUIDs e medidas de registros existentes.
with canonical(legacy_name, name, slug, aliases, sort_order) as (
  values
    ('XG (52)','XG','xg',array['52','G1']::text[],14),
    ('EG (54)','EG','eg',array['54','XGG','G2']::text[],15),
    ('EGG (56)','EGG','egg',array['56','XXG','G3']::text[],16),
    ('EEGG (58)','EEGG','eegg',array['58','XXGG','G4']::text[],17),
    ('ESP1 (60)','60','60',array['XLG','ESP1','G5']::text[],18),
    ('ESP2 (62)','62','62',array['XLGG','ESP2','G6']::text[],19),
    ('ESP3 (64)','64','64',array['XLGGG','ESP3','G7']::text[],20)
)
update public.catalog_items item
set name = canonical.name, slug = canonical.slug, aliases = canonical.aliases,
    sort_order = canonical.sort_order, metadata = item.metadata || '{"sizeGroup":"traditional"}'::jsonb,
    updated_at = now()
from canonical
where item.kind = 'tamanho' and upper(item.name) = canonical.legacy_name;

update public.catalog_items
set active = false,
    metadata = metadata || '{"sizeVariant":"baby-look","legacyCompatibility":true}'::jsonb,
    updated_at = now()
where kind = 'tamanho' and upper(name) like 'BABY %';

insert into public.catalog_items (kind, name, slug, aliases, metadata, active, sort_order)
values
  ('tamanho','RN','rn',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,0),
  ('tamanho','1','1',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,1),
  ('tamanho','2','2',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,2),
  ('tamanho','4','4',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,3),
  ('tamanho','6','6',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,4),
  ('tamanho','8','8',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,5),
  ('tamanho','10','10',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,6),
  ('tamanho','12','12',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,7),
  ('tamanho','14','14',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,8),
  ('tamanho','PP','pp',array['16'],'{"sizeGroup":"traditional"}'::jsonb,true,9),
  ('tamanho','P','p',array['18'],'{"sizeGroup":"traditional"}'::jsonb,true,10),
  ('tamanho','M','m',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,11),
  ('tamanho','G','g',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,12),
  ('tamanho','GG','gg',array[]::text[],'{"sizeGroup":"traditional"}'::jsonb,true,13),
  ('tamanho','XG','xg',array['52','G1'],'{"sizeGroup":"traditional"}'::jsonb,true,14),
  ('tamanho','EG','eg',array['54','XGG','G2'],'{"sizeGroup":"traditional"}'::jsonb,true,15),
  ('tamanho','EGG','egg',array['56','XXG','G3'],'{"sizeGroup":"traditional"}'::jsonb,true,16),
  ('tamanho','EEGG','eegg',array['58','XXGG','G4'],'{"sizeGroup":"traditional"}'::jsonb,true,17),
  ('tamanho','60','60',array['XLG','ESP1','G5'],'{"sizeGroup":"traditional"}'::jsonb,true,18),
  ('tamanho','62','62',array['XLGG','ESP2','G6'],'{"sizeGroup":"traditional"}'::jsonb,true,19),
  ('tamanho','64','64',array['XLGGG','ESP3','G7'],'{"sizeGroup":"traditional"}'::jsonb,true,20)
on conflict (kind, slug) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  metadata = public.catalog_items.metadata || excluded.metadata,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.reorder_catalog_sizes(p_size_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(p_size_ids) <> (select count(distinct id) from unnest(p_size_ids) as id) then
    raise exception 'A ordem contem IDs duplicados.';
  end if;
  if cardinality(p_size_ids) <> (select count(*) from public.catalog_items where kind = 'tamanho')
     or exists (select 1 from unnest(p_size_ids) as requested(id) left join public.catalog_items item on item.id = requested.id and item.kind = 'tamanho' where item.id is null) then
    raise exception 'A ordem deve conter todos os tamanhos cadastrados.';
  end if;
  update public.catalog_items item
  set sort_order = ordered.position - 1, updated_at = now()
  from unnest(p_size_ids) with ordinality as ordered(id, position)
  where item.id = ordered.id and item.kind = 'tamanho';
end;
$$;

revoke all on function public.reorder_catalog_sizes(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_catalog_sizes(uuid[]) to service_role;
