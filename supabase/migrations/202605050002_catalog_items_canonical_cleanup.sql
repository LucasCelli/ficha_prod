begin;

delete from public.catalog_items
where kind in ('manga', 'gola', 'acabamento_manga', 'acabamento_gola', 'bolso')
  and slug in (
    'redonda',
    'v',
    'polo',
    'social',
    'padre',
    'raglan',
    'regata',
    'barra-simples',
    'punho-ribana',
    'vies-sublimado',
    'gola-pronta'
  );

insert into public.catalog_items (kind, name, slug, aliases, metadata, active, sort_order)
values
  ('gola', 'Gola Redonda', 'gola-redonda', array['redonda'], '{}'::jsonb, true, 0),
  ('gola', 'Gola V', 'gola-v', array['v'], '{}'::jsonb, true, 1),
  ('gola', 'Gola Polo', 'gola-polo', array['polo'], '{}'::jsonb, true, 2),
  ('gola', 'Gola Social', 'gola-social', array['social'], '{}'::jsonb, true, 3),
  ('gola', 'Gola Padre com Zíper', 'gola-padre-com-ziper', array['padre_ziper', 'padre'], '{}'::jsonb, true, 4),
  ('gola', 'Gola Padre Esportiva', 'gola-padre-esportiva', array['padre_esportiva'], '{}'::jsonb, true, 5),
  ('gola', 'Gola V Polo', 'gola-v-polo', array['v_polo'], '{}'::jsonb, true, 6),
  ('gola', 'Gola Canoa', 'gola-canoa', array['canoa'], '{}'::jsonb, true, 7),
  ('acabamento_manga', 'Barra', 'barra', array['barra'], '{}'::jsonb, true, 0),
  ('acabamento_manga', 'Punho', 'punho', array['punho'], '{}'::jsonb, true, 1),
  ('acabamento_manga', 'Punho de Ribana', 'punho-de-ribana', array['punho_ribana'], '{}'::jsonb, true, 2),
  ('acabamento_manga', 'Punho Sublimado', 'punho-sublimado', array['punho_vies_sublimado'], '{}'::jsonb, true, 3),
  ('acabamento_manga', 'Viés', 'vies', array['vies'], '{}'::jsonb, true, 4),
  ('acabamento_manga', 'Viés Sublimado', 'vies-sublimado', array['vies_sublimado'], '{}'::jsonb, true, 5),
  ('acabamento_gola', 'Ribana', 'ribana', array['ribana'], '{}'::jsonb, true, 0),
  ('acabamento_gola', 'Viés', 'vies', array['vies'], '{}'::jsonb, true, 1),
  ('acabamento_gola', 'Viés Sublimado', 'vies-sublimado', array['vies_sublimado'], '{}'::jsonb, true, 2),
  ('acabamento_gola', 'Ribana Sublimada', 'ribana-sublimada', array['ribana_sublimada'], '{}'::jsonb, true, 3),
  ('acabamento_gola', 'Ribana em Molde', 'ribana-em-molde', array['ribana_molde'], '{}'::jsonb, true, 4),
  ('bolso', 'Sem bolso', 'sem-bolso', '{}'::text[], '{}'::jsonb, true, 0),
  ('bolso', 'Bolso no Peito', 'bolso-no-peito', '{}'::text[], '{}'::jsonb, true, 1),
  ('bolso', '2 Bolsos na Frente', '2-bolsos-na-frente', '{}'::text[], '{}'::jsonb, true, 2),
  ('bolso', '2 Bolsos Traseiros', '2-bolsos-traseiros', '{}'::text[], '{}'::jsonb, true, 3),
  ('bolso', '1 Bolso Traseiro', '1-bolso-traseiro', '{}'::text[], '{}'::jsonb, true, 4),
  ('bolso', '2 Bolsos na Frente e 2 Atrás', '2-bolsos-na-frente-e-2-atras', '{}'::text[], '{}'::jsonb, true, 5),
  ('bolso', '2 Bolsos na Frente e 1 Atrás', '2-bolsos-na-frente-e-1-atras', '{}'::text[], '{}'::jsonb, true, 6),
  ('bolso', 'Bolsos na Frente Embutidos', 'bolsos-na-frente-embutidos', '{}'::text[], '{}'::jsonb, true, 7),
  ('bolso', 'Bolsos na Frente Externos', 'bolsos-na-frente-externos', '{}'::text[], '{}'::jsonb, true, 8)
on conflict (kind, slug) do update
set
  name = excluded.name,
  aliases = excluded.aliases,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.catalog_items
set
  aliases = case
    when metadata ? 'legacyId' then array(select distinct unnest(coalesce(aliases, '{}'::text[]) || array[metadata->>'legacyId']))
    else aliases
  end,
  updated_at = now()
where kind = 'tecido'
  and metadata ? 'legacyId';

commit;
