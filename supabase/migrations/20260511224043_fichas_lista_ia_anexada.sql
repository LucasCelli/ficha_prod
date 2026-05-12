alter table public.fichas
add column if not exists lista_ia_anexada boolean generated always as (lista_ia is not null) stored;

comment on column public.fichas.lista_ia_anexada is 'Indicador leve para listar fichas que ja possuem lista IA vinculada sem carregar o JSON completo.';
