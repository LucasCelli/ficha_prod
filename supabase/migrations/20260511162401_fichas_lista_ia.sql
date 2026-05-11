alter table public.fichas
add column if not exists lista_ia jsonb;

comment on column public.fichas.lista_ia is 'Lista de nomes/uniformes organizada pela IA e revisada pelo operador, vinculada à ficha para consulta, reexportação e auditoria.';
