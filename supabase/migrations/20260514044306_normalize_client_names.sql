create or replace function public.normalize_name_or_company(input text)
returns text
language plpgsql
immutable
as $$
declare
  text_value text;
  words text[];
  word text;
  result_words text[] := '{}';
  lower_word text;
  upper_word text;
  clean_upper text;
  clean_word text;
  letters text;
  full_input_was_upper boolean;
  is_company boolean := false;
  word_count integer;
  index_value integer;
  connectors constant text[] := array['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'd'];
  business_suffixes constant text[] := array['ME', 'MEI', 'EPP', 'EI', 'EIRELI', 'LTDA', 'SA', 'S/A', 'S.A', 'S.A.', 'SLU', 'SS', 'S/S', 'CIA'];
  known_acronyms constant text[] := array['MJ', 'NSA', 'ABC', 'BR', 'MS', 'SP', 'RJ', 'TI', 'RH', 'IA', 'AI', 'UX', 'UI', 'API', 'SESI', 'FIEMS', 'GOV', 'SENAI'];
  business_keywords constant text[] := array[
    'mercado',
    'supermercado',
    'minimercado',
    'padaria',
    'confeitaria',
    'restaurante',
    'lanchonete',
    'bar',
    'loja',
    'comercio',
    'comércio',
    'servicos',
    'serviços',
    'consultoria',
    'tecnologia',
    'sistemas',
    'agronegocios',
    'agronegócios',
    'agro',
    'transportes',
    'construtora',
    'engenharia',
    'industria',
    'indústria',
    'distribuidora',
    'importadora',
    'exportadora',
    'confecções',
    'confeccoes',
    'malharia',
    'modas',
    'autopecas',
    'autopeças',
    'mecanica',
    'mecânica'
  ];
begin
  if input is null then
    return '';
  end if;

  text_value := btrim(regexp_replace(input, '\s+', ' ', 'g'));

  if text_value = '' then
    return '';
  end if;

  words := regexp_split_to_array(text_value, ' ');
  word_count := array_length(words, 1);
  letters := regexp_replace(text_value, '[^[:alpha:]]', '', 'g');
  full_input_was_upper := length(letters) > 0 and letters = upper(letters);

  foreach word in array words loop
    lower_word := lower(word);
    upper_word := upper(word);
    clean_upper := replace(upper_word, '.', '');

    if lower_word = any(business_keywords) or upper_word = any(business_suffixes) or clean_upper = any(business_suffixes) then
      is_company := true;
      exit;
    end if;
  end loop;

  for index_value in 1..word_count loop
    word := btrim(words[index_value]);
    lower_word := lower(word);
    upper_word := upper(word);
    clean_upper := replace(upper_word, '.', '');
    clean_word := replace(regexp_replace(word, '[^[:alnum:]/]', '', 'g'), '.', '');

    if word = '&' then
      result_words := array_append(result_words, '&');
    elsif word ~* '^([[:alnum:]]{1,5}&)+[[:alnum:]]{1,5}$' then
      result_words := array_append(result_words, upper(word));
    elsif index_value = word_count and (upper_word = any(business_suffixes) or clean_upper = any(business_suffixes)) then
      if clean_upper = 'SA' then
        result_words := array_append(result_words, 'S/A');
      else
        result_words := array_append(result_words, clean_upper);
      end if;
    elsif length(clean_word) between 2 and 5
      and (
        upper(clean_word) = any(known_acronyms)
        or (length(clean_word) <= 3 and (not full_input_was_upper or is_company) and clean_word = upper(clean_word))
      ) then
      result_words := array_append(result_words, upper(clean_word));
    elsif lower_word = any(connectors) and index_value > 1 and index_value < word_count then
      result_words := array_append(result_words, lower_word);
    else
      result_words := array_append(result_words, public.normalize_name_or_company_capitalize(word));
    end if;
  end loop;

  return array_to_string(result_words, ' ');
end;
$$;

create or replace function public.normalize_name_or_company_capitalize(input text)
returns text
language plpgsql
immutable
as $$
declare
  hyphen_parts text[];
  hyphen_part text;
  capitalized_parts text[] := '{}';
begin
  hyphen_parts := string_to_array(input, '-');

  foreach hyphen_part in array hyphen_parts loop
    if position('''' in hyphen_part) > 0 then
      capitalized_parts := array_append(capitalized_parts, public.normalize_name_or_company_capitalize_apostrophe(hyphen_part, ''''));
    elsif position('’' in hyphen_part) > 0 then
      capitalized_parts := array_append(capitalized_parts, public.normalize_name_or_company_capitalize_apostrophe(hyphen_part, '’'));
    else
      capitalized_parts := array_append(capitalized_parts, public.normalize_name_or_company_capitalize_simple(hyphen_part));
    end if;
  end loop;

  return array_to_string(capitalized_parts, '-');
end;
$$;

create or replace function public.normalize_name_or_company_capitalize_apostrophe(input text, separator text)
returns text
language plpgsql
immutable
as $$
declare
  parts text[];
  part text;
  index_value integer;
  capitalized_parts text[] := '{}';
begin
  parts := string_to_array(input, separator);

  for index_value in 1..coalesce(array_length(parts, 1), 0) loop
    part := parts[index_value];

    if index_value = 1 and length(part) = 1 then
      capitalized_parts := array_append(capitalized_parts, upper(part));
    else
      capitalized_parts := array_append(capitalized_parts, public.normalize_name_or_company_capitalize_simple(part));
    end if;
  end loop;

  return array_to_string(capitalized_parts, separator);
end;
$$;

create or replace function public.normalize_name_or_company_capitalize_simple(input text)
returns text
language sql
immutable
as $$
  select case
    when input is null or input = '' then input
    else upper(left(lower(input), 1)) || substring(lower(input) from 2)
  end;
$$;

create or replace function public.normalize_clientes_nome_trigger()
returns trigger
language plpgsql
as $$
begin
  new.nome := public.normalize_name_or_company(new.nome);
  return new;
end;
$$;

create or replace function public.normalize_fichas_cliente_nome_snapshot_trigger()
returns trigger
language plpgsql
as $$
begin
  new.cliente_nome_snapshot := public.normalize_name_or_company(new.cliente_nome_snapshot);
  return new;
end;
$$;

update public.clientes
set nome = public.normalize_name_or_company(nome)
where nome is distinct from public.normalize_name_or_company(nome);

update public.fichas
set cliente_nome_snapshot = public.normalize_name_or_company(cliente_nome_snapshot)
where cliente_nome_snapshot is distinct from public.normalize_name_or_company(cliente_nome_snapshot);

drop trigger if exists clientes_normalize_nome on public.clientes;
create trigger clientes_normalize_nome
before insert or update of nome on public.clientes
for each row execute function public.normalize_clientes_nome_trigger();

drop trigger if exists fichas_normalize_cliente_nome_snapshot on public.fichas;
create trigger fichas_normalize_cliente_nome_snapshot
before insert or update of cliente_nome_snapshot on public.fichas
for each row execute function public.normalize_fichas_cliente_nome_snapshot_trigger();
