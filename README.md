# Ficha Prod

Aplicacao Next.js App Router para operacao de fichas tecnicas, em migracao do legado HTML/CSS/JS para Next.js + TypeScript + Supabase + Vercel.

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
npm run cutover:check
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
public/                 legado mantido apenas como referencia funcional
```

## Documentacao ativa na raiz

- `README.md`
  - ponto de entrada do repositorio
  - stack, comandos e mapa rapido dos docs
- `AGENTS.md`
  - regras de implementacao, UX, tokens, acessibilidade e continuidade
- `plano-migracao-next-supabase.md`
  - checklist executivo vivo da migracao
  - tambem concentra homologacao pendente e trilha de adocao de bibliotecas
- `registro-migracao-next.md`
  - diario de execucao com arquivos alterados, validacoes, decisoes e caveats

## Consolidacao aplicada

- O antigo `CHECKLIST_HOMOLOGACAO_NEXT.md` foi absorvido pelo plano principal na Fase 9.
- O antigo `plugins-recomendados.md` foi absorvido pelo plano principal na secao de bibliotecas/adocao.
- A regra daqui para frente e manter docs operacionais em poucos arquivos vivos, em vez de abrir um `.md` novo para cada frente.

## Estado atual da migracao

- A base Next/Supabase ja cobre os fluxos centrais do app.
- O legado em `public/` ainda existe como referencia funcional e rollback, nao como fonte de UI nova.
- O corte final ainda depende de fechamento operacional em producao, conforme o plano principal.

## Como continuar

1. Ler `AGENTS.md`.
2. Ler `plano-migracao-next-supabase.md`.
3. Consultar `registro-migracao-next.md` para o historico recente.
4. Tratar `public/` apenas como referencia funcional quando houver duvida de paridade.
