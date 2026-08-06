begin;

alter table public.catalog_items
  add column fabric_width_cm numeric(7, 2),
  add column fabric_type text;

update public.catalog_items
set
  fabric_width_cm = 118,
  fabric_type = 'TUBULAR'
where kind = 'tecido'
  and lower(name) = lower('Malha Fria (PV)');

alter table public.catalog_items
  add constraint catalog_items_fabric_cut_settings_scope_check check (
    kind = 'tecido'
    or (
      fabric_width_cm is null
      and fabric_type is null
    )
  ),
  add constraint catalog_items_fabric_cut_settings_complete_check check (
    (
      fabric_width_cm is null
      and fabric_type is null
    )
    or (
      fabric_width_cm > 0
      and fabric_width_cm <= 1000
      and fabric_type in ('PLANO', 'TUBULAR')
    )
  );

comment on column public.catalog_items.fabric_width_cm is 'Largura util do tecido em centimetros para o Plano de Corte.';
comment on column public.catalog_items.fabric_type is 'Formato do tecido no Plano de Corte: PLANO ou TUBULAR.';

commit;
