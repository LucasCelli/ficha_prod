update public.kanban_columns
set name = case slug
  when 'pendente' then 'Preparando Arte'
  when 'exportando' then 'Exportado/Arte Separada'
  when 'fila_impressao' then 'Imprimindo/Fotolito Impresso'
  when 'sublimando' then 'Impresso/Na Estamparia'
  when 'na_costura' then 'Sublimado/Estampado'
  else name
end
where is_system = true
  and slug in ('pendente', 'exportando', 'fila_impressao', 'sublimando', 'na_costura');
