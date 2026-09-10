# Ficha Prod

## Seleção de entidades

Use `Combobox` quando a opção vem do banco, precisa de pesquisa, possui um ID diferente do texto exibido ou requer informação secundária. O `value` deve ser o ID estável; `label` e `description` são somente apresentação. O seletor de clientes em fichas usa `clientes.id`, mostra nome + Empresa/Instituição e mantém o texto digitado sem convertê-lo em cadastro.

Listas pequenas e estáticas continuam usando `CustomSelect`. `CustomDatalist` permanece adequado para sugestões livres de catálogo, nas quais o texto é o próprio valor e não a identidade de uma entidade.

Aplicacao Next.js App Router para operacao de fichas tecnicas em Next.js + TypeScript + Supabase + Vercel.

## Stack atual

- Next.js 16 + React 19
- TypeScript
- Supabase/Postgres
- Vercel
- Cloudinary
- Plus Jakarta Sans
- `lucide-react`

## Comandos principais

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run supabase:check
npm run prod:check
```

## Estrutura do projeto

```text
src/app/                rotas, layouts e route handlers
src/features/           modulos de dominio e UI por feature
src/components/ui/      primitivos compartilhados
src/lib/                utilitarios server/domain
src/styles/             globals e tokens
src/lib/supabase/       clientes e tipos do Supabase
supabase/               migrations e artefatos de banco
public/                 assets estaticos atuais
```

## Documentacao ativa na raiz

- `README.md`
  - ponto de entrada do repositorio
  - stack, comandos e mapa rapido dos docs
- `AGENTS.md`
  - regras de implementacao, UX, tokens, acessibilidade e continuidade
- `TODO.md`
  - backlog vivo de features, refinos e decisoes futuras
- `registro-alteracoes.md`
  - diario de execucao com arquivos alterados, validacoes, decisoes e caveats

## Consolidacao aplicada

- O antigo `CHECKLIST_HOMOLOGACAO_NEXT.md` foi absorvido pelo plano principal na Fase 9.
- O antigo `plugins-recomendados.md` foi absorvido pelo plano principal na secao de bibliotecas/adocao.
- A regra daqui para frente e manter docs operacionais em poucos arquivos vivos, em vez de abrir um `.md` novo para cada frente.

## Estado atual da migracao

- A base Next/Supabase cobre os fluxos centrais do app e ja foi publicada em producao.
- O runtime Express e os assets HTML/CSS/JS legados foram removidos do checkout ativo.
- A migracao foi encerrada. Novas features e refinos entram no `TODO.md`.

## Convencoes de interface

- Nao use o atributo HTML nativo `title` para explicar controles, icones ou conteudo truncado.
- Prefira sempre o componente compartilhado `Tooltip` de `@/components/ui`, mantendo tambem um nome acessivel com `label`, `aria-label` ou `aria-labelledby`.
- Propriedades `title` que representam titulos reais de pagina, modal, painel, metadados ou dados de dominio continuam validas.

## Regra de domínio de tamanhos

- Identidade, aliases, ativação e ordem são configurados nos itens `tamanho` de `catalog_items`.
- Todo código que resolve, compara, ordena ou apresenta tamanhos deve consumir `src/lib/uniform-sizes.ts`; listas e heurísticas locais de tamanhos não são permitidas.
- Baby Look é uma variante do mesmo tamanho canônico, não outro tamanho. Labels como `XG (52)` são apenas apresentação e nunca identidade persistida.

## Padrao de drag and drop

- O projeto usa `@dnd-kit/react` 0.5 e `@dnd-kit/dom` 0.5. Nao adicionar outra biblioteca de DnD sem justificativa arquitetural.
- Listas ordenaveis usam `DragDropProvider` e `useSortable`. A mesma identidade persistente deve alimentar `key` e `id`; indice, posicao e texto editavel nunca sao IDs.
- O sortable otimista atualiza `source.index` durante o arraste. No `onDragEnd`, valide `source` com `isSortable` e aplique `source.initialIndex -> source.index`; `source.id/target.id` nao determina a posicao final nessa API.
- A lista renderizada e a unica fonte de verdade. Filtros devem traduzir movimentos por ID, e persistencia/cache nao podem restaurar uma ordem antiga sobre uma interacao mais recente.
- Preserve os recursos padrao de mouse, toque e teclado. Sensores, colisao, modifiers e overlay so devem ser customizados quando a superficie realmente exigir.
- Nao estabilize DnD com `setTimeout`, remount por `key`, efeitos em cascata, ordenacao silenciosa ou estado duplicado.

## Como continuar

1. Ler `AGENTS.md`.
2. Ler `TODO.md`.
3. Consultar `registro-alteracoes.md` para o historico recente.
