begin;

alter table public.catalog_items
  add column measure_front_cm numeric(7, 2),
  add column measure_back_cm numeric(7, 2),
  add column measure_short_sleeve_cm numeric(7, 2),
  add column measure_long_sleeve_cm numeric(7, 2);

alter table public.catalog_items
  add constraint catalog_items_size_measurements_scope_check check (
    kind = 'tamanho'
    or (
      measure_front_cm is null
      and measure_back_cm is null
      and measure_short_sleeve_cm is null
      and measure_long_sleeve_cm is null
    )
  ),
  add constraint catalog_items_size_measurements_complete_check check (
    (
      measure_front_cm is null
      and measure_back_cm is null
      and measure_short_sleeve_cm is null
      and measure_long_sleeve_cm is null
    )
    or (
      measure_front_cm > 0 and measure_front_cm <= 1000
      and measure_back_cm > 0 and measure_back_cm <= 1000
      and measure_short_sleeve_cm > 0 and measure_short_sleeve_cm <= 1000
      and measure_long_sleeve_cm > 0 and measure_long_sleeve_cm <= 1000
    )
  );

comment on column public.catalog_items.measure_front_cm is 'Comprimento da frente, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_back_cm is 'Comprimento das costas, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_short_sleeve_cm is 'Comprimento da manga curta, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_long_sleeve_cm is 'Comprimento da manga longa, em centimetros, aplicavel a itens do tipo tamanho.';

commit;
