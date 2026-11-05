insert into public.catalog_items (kind, name, slug, aliases, metadata, active, sort_order)
values
  ('personalizacao', 'Sem Personalização', 'sem-personalizacao', array['sem_personalizacao'], '{"canonicalValue":"sem_personalizacao"}'::jsonb, true, 1),
  ('personalizacao', 'Sublimação', 'sublimacao', array['sublimacao'], '{"canonicalValue":"sublimacao"}'::jsonb, true, 2),
  ('personalizacao', 'Serigrafia', 'serigrafia', array['serigrafia'], '{"canonicalValue":"serigrafia"}'::jsonb, true, 3),
  ('personalizacao', 'Bordado', 'bordado', array['bordado'], '{"canonicalValue":"bordado"}'::jsonb, true, 4),
  ('personalizacao', 'PATCH Termocolante', 'patch-termocolante', array['patch'], '{"canonicalValue":"patch"}'::jsonb, true, 5),
  ('personalizacao', 'DTF Têxtil', 'dtf-textil', array['dtf'], '{"canonicalValue":"dtf"}'::jsonb, true, 6),
  ('personalizacao', 'Transfer', 'transfer', array['transfer'], '{"canonicalValue":"transfer"}'::jsonb, true, 7),
  ('personalizacao', 'Sublimação e Serigrafia', 'sublimacao-e-serigrafia', array['sublimacao_serigrafia'], '{"canonicalValue":"sublimacao_serigrafia"}'::jsonb, true, 8),
  ('personalizacao', 'Serigrafia e DTF', 'serigrafia-e-dtf', array['serigrafia_dtf'], '{"canonicalValue":"serigrafia_dtf"}'::jsonb, true, 9),
  ('personalizacao', 'Serigrafia e Bordado', 'serigrafia-e-bordado', array['serigrafia_bordado'], '{"canonicalValue":"serigrafia_bordado"}'::jsonb, true, 10)
on conflict (kind, slug) do update
set
  name = excluded.name,
  aliases = excluded.aliases,
  metadata = excluded.metadata,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();
