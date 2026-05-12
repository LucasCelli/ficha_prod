alter table public.fichas
add column if not exists lista_nomes_raw text,
add column if not exists lista_nomes_raw_anexada boolean generated always as (nullif(btrim(lista_nomes_raw), '') is not null) stored;

comment on column public.fichas.lista_nomes_raw is 'Lista de nomes recebida sem organizacao pela IA, salva junto da ficha para processamento posterior.';
comment on column public.fichas.lista_nomes_raw_anexada is 'Indicador leve para listar fichas que possuem lista de nomes ainda nao organizada sem carregar o texto completo.';
