begin;

alter table public.catalog_items
  drop constraint catalog_items_size_measurements_complete_check;

alter table public.catalog_items
  rename column measure_front_cm to measure_front_height_cm;
alter table public.catalog_items
  rename column measure_back_cm to measure_back_height_cm;
alter table public.catalog_items
  rename column measure_short_sleeve_cm to measure_short_sleeve_height_cm;
alter table public.catalog_items
  rename column measure_long_sleeve_cm to measure_long_sleeve_height_cm;

alter table public.catalog_items
  add column measure_front_width_cm numeric(7, 2),
  add column measure_back_width_cm numeric(7, 2),
  add column measure_short_sleeve_width_cm numeric(7, 2),
  add column measure_long_sleeve_width_cm numeric(7, 2);

alter table public.catalog_items
  add constraint catalog_items_size_measurements_complete_check check (
    (
      measure_front_height_cm is null
      and measure_front_width_cm is null
      and measure_back_height_cm is null
      and measure_back_width_cm is null
      and measure_short_sleeve_height_cm is null
      and measure_short_sleeve_width_cm is null
      and measure_long_sleeve_height_cm is null
      and measure_long_sleeve_width_cm is null
    )
    or (
      measure_front_height_cm > 0 and measure_front_height_cm <= 1000
      and measure_front_width_cm > 0 and measure_front_width_cm <= 1000
      and measure_back_height_cm > 0 and measure_back_height_cm <= 1000
      and measure_back_width_cm > 0 and measure_back_width_cm <= 1000
      and measure_short_sleeve_height_cm > 0 and measure_short_sleeve_height_cm <= 1000
      and measure_short_sleeve_width_cm > 0 and measure_short_sleeve_width_cm <= 1000
      and measure_long_sleeve_height_cm > 0 and measure_long_sleeve_height_cm <= 1000
      and measure_long_sleeve_width_cm > 0 and measure_long_sleeve_width_cm <= 1000
    )
  );

comment on column public.catalog_items.measure_front_height_cm is 'Altura da frente, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_front_width_cm is 'Largura da frente, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_back_height_cm is 'Altura das costas, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_back_width_cm is 'Largura das costas, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_short_sleeve_height_cm is 'Altura da manga curta, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_short_sleeve_width_cm is 'Largura da manga curta, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_long_sleeve_height_cm is 'Altura da manga longa, em centimetros, aplicavel a itens do tipo tamanho.';
comment on column public.catalog_items.measure_long_sleeve_width_cm is 'Largura da manga longa, em centimetros, aplicavel a itens do tipo tamanho.';

commit;
