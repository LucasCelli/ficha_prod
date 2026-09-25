begin;

create temporary table doptex_workwear_fabrics (
  position integer primary key,
  article_code text not null,
  name text not null,
  slug text not null unique,
  composition text not null,
  width_cm numeric(7, 2) not null,
  previous_slug text
) on commit drop;

insert into doptex_workwear_fabrics (position, article_code, name, slug, composition, width_cm, previous_slug)
values
  (1, '111', 'PROFIT', 'profit', '67% poliéster 33% algodão', 160, 'profit-camisaria'),
  (2, '1112', 'PROFIT STRONG', 'profit-strong', '67% poliéster 33% algodão', 160, null),
  (3, '1659', 'PROFIT MIX', 'profit-mix', '59% poliéster 41% algodão', 150, null),
  (4, '1660', 'NATURAL FIT', 'natural-fit', '65% algodão 35% poliéster', 150, null),
  (5, '1653', 'NATURAL FIT MESCLA', 'natural-fit-mescla', '65% algodão 35% poliéster', 150, null),
  (6, '1457', 'COMFORT PLUS', 'comfort-plus', '63% algodão 37% poliéster', 160, 'comfort-plus-camisaria'),
  (7, '1675', 'COTTON PREMIUM', 'cotton-premium', '100% algodão', 150, null),
  (8, '1359', 'FUSTÃO', 'fustao', '100% algodão', 150, null),
  (9, '1658', 'CLASSIC', 'classic', '73% algodão 27% poliéster', 150, null),
  (10, '1666', 'PANAMÁ', 'panama', '67% poliéster 33% algodão', 150, null),
  (11, '1231', 'TRICOLINE AMÉLIE', 'tricoline-amelie', '77% poliéster 19% algodão 4% elastano', 135, 'tricoline-camisaria'),
  (12, '116', 'TRICOLINE IBIZA', 'tricoline-ibiza', '75% poliéster 21% algodão 4% elastano', 130, null),
  (13, '280', 'TRICOLINE CANNES', 'tricoline-cannes', '58% algodão 38% poliéster 4% elastano', 140, null),
  (14, '1665', 'DOPFIL', 'dopfil', '67% poliéster 33% algodão', 150, null),
  (15, '1673', 'BRISTOL', 'bristol', '53% poliéster 47% algodão', 150, null),
  (16, '1160', 'MICRO VICHY', 'micro-vichy', '57% poliéster 43% algodão', 150, 'micro-vichy-camisaria'),
  (17, '1194', 'MÉDIUM VICHY', 'medium-vichy', '63% poliéster 37% algodão', 150, null),
  (18, '1674', 'LONDON', 'london', '67% algodão 33% poliéster', 150, 'london-camisaria'),
  (19, '1161', 'SPAGUETI', 'spagueti', '77% algodão 23% poliéster', 150, 'spagueti-camisaria'),
  (20, '1195', 'FUSILI', 'fusili', '50% poliéster 50% algodão', 150, 'fusili-camisaria'),
  (21, '1670', 'LONDON COMFORT', 'london-comfort', '52% poliéster 30% algodão 14% poliamida 4% elastano', 140, null),
  (22, '1672', 'BARCELONA', 'barcelona', '73% poliéster 23% algodão 4% elastano', 140, 'barcelona-camisaria'),
  (23, '1671', 'SAVILLE', 'saville', '67% poliéster 29% algodão 4% elastano', 140, null),
  (24, '1681', 'TURIM', 'turim', '79% poliéster 21% viscose', 160, null),
  (25, '1682', 'RAVENA', 'ravena', '78% poliéster 22% viscose', 160, null),
  (26, '1688', 'MILANO PLUS', 'milano-plus', '74% poliéster 22% viscose 4% elastano', 140, null),
  (27, '1690', 'FIRENZE', 'firenze', '96% poliéster 4% elastano', 145, null),
  (28, '112', 'DOPWORK PESADO', 'dopwork-pesado', '100% algodão', 160, null),
  (29, '114', 'DOPWORK LIGHT', 'dopwork-light', '100% algodão', 160, null);

-- Reuse the existing rows for the eight equivalent shirting entries so their
-- stable ids and legacy aliases remain available to the application.
update public.catalog_items as item
set
  name = fabric.name,
  slug = fabric.slug,
  metadata = coalesce(item.metadata, '{}'::jsonb) || jsonb_build_object('composition', fabric.composition),
  active = true,
  sort_order = 100 + fabric.position,
  fabric_width_cm = fabric.width_cm,
  fabric_type = 'PLANO',
  updated_at = now()
from doptex_workwear_fabrics as fabric
where item.kind = 'tecido'
  and fabric.previous_slug is not null
  and item.slug = fabric.previous_slug;

insert into public.catalog_items (
  kind,
  name,
  slug,
  aliases,
  metadata,
  active,
  sort_order,
  fabric_width_cm,
  fabric_type
)
select
  'tecido'::public.catalog_item_kind,
  fabric.name,
  fabric.slug,
  '{}'::text[],
  jsonb_build_object('composition', fabric.composition),
  true,
  100 + fabric.position,
  fabric.width_cm,
  'PLANO'
from doptex_workwear_fabrics as fabric
on conflict (kind, slug) do update
set
  name = excluded.name,
  metadata = coalesce(public.catalog_items.metadata, '{}'::jsonb) || excluded.metadata,
  active = excluded.active,
  sort_order = excluded.sort_order,
  fabric_width_cm = excluded.fabric_width_cm,
  fabric_type = excluded.fabric_type,
  updated_at = now();

commit;
