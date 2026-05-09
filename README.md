# Ficha Prod

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

## Como continuar

1. Ler `AGENTS.md`.
2. Ler `TODO.md`.
3. Consultar `registro-alteracoes.md` para o historico recente.
