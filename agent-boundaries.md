# Fronteiras de Atuacao: Claude Code e Codex

Este arquivo define a divisao pratica de trabalho no ficha_prod. A regra geral e simples: Claude Code cuida da experiencia visual; Codex cuida da logica, dados, integracoes e validacao tecnica.

## Escopo do Claude Code

Claude Code e o agente preferencial para UI, UX, componentes, design system e refinamento visual.

Pode editar, quando a tarefa for visual ou de interacao:

- `src/components/ui/`
- `src/components/ai/`, apenas apresentacao, estados visuais e composicao de controles
- `src/app/**/*.tsx`, apenas composicao de tela, copy, layout e estados visuais
- `src/features/*/*.tsx`, quando a mudanca for estrutura visual, campos, estados, acessibilidade, copy ou composicao client-side
- `src/features/fichas/ficha-form.tsx`, apenas estrutura visual, campos, estados, acessibilidade e copy
- `src/features/fichas/fichas-filter-toolbar.tsx`
- `src/features/fichas/ficha-preview.tsx`
- `src/features/fichas/ficha-print-preview-modal.tsx`
- `src/features/fichas/ficha-name-list-badge.tsx`, apenas UI do badge, modal e impressao acionada pelo modal
- `src/features/relatorios/relatorios-overview.tsx`
- `src/features/relatorios/relatorios-charts.tsx`
- `src/features/relatorios/relatorios-motion.tsx`
- `src/features/clientes/*overview.tsx`, `src/features/clientes/*toolbar.tsx`, `src/features/clientes/*detail.tsx` e formularios, apenas visual e interacao
- `src/features/catalogos/*table.tsx`, `src/features/catalogos/*overview.tsx` e formularios, apenas visual e interacao
- `src/features/usuarios/*overview.tsx` e formularios, apenas visual e interacao
- `src/styles/globals.css`, somente ajustes visuais locais e tokens ja existentes
- assets visuais em `public/`, quando a tarefa pedir ajuste visual ou uso de asset atual

Nao deve tocar sem aprovacao humana:

- `src/app/api/`
- `src/lib/supabase/`
- `src/lib/ai/`
- `src/lib/cloudinary.ts` e `src/lib/cloudinary-images.ts`
- `src/lib/dates.ts`, `src/lib/formatters.ts`, `src/lib/name-normalizer.ts`, `src/lib/navigation.ts`
- `src/features/*/actions.ts`
- `src/features/*/data.ts`
- `src/features/*/schema.ts`
- `src/features/*/types.ts`
- `src/features/*/form-state.ts`
- `src/features/fichas/print-*.ts`, `src/features/fichas/operational-pdf.ts`, `src/features/fichas/legacy-import*.ts`, `src/features/fichas/observacoes-autofill.ts`
- `src/features/quadro-producao/api.ts`, `data.ts`, `schema.ts`, `search-params.ts` e `config.ts`
- `scripts/`
- `supabase/`
- `tests/`
- arquivos de configuracao, dependencias e ambiente

## Escopo do Codex

Codex e o agente preferencial para backend, banco de dados, APIs, autenticacao, validacoes, integracoes, scripts, testes e documentacao tecnica diretamente ligada a mudanca.

Pode editar:

- `src/app/api/`
- `src/app/**/*.ts`, quando a mudanca for rota tecnica, metadata, redirect, auth ou integracao
- `src/lib/supabase/`
- `src/lib/ai/`
- `src/lib/cloudinary.ts` e `src/lib/cloudinary-images.ts`
- `src/lib/dates.ts`
- `src/lib/formatters.ts`
- `src/lib/name-normalizer.ts`
- `src/lib/navigation.ts`
- `src/lib/fluid-dnd-event-target-guard.ts`
- `src/features/*/actions.ts`
- `src/features/*/data.ts`
- `src/features/*/schema.ts`
- `src/features/*/types.ts`
- `src/features/*/form-state.ts`
- `src/features/fichas/ficha-form-seed.ts`
- `src/features/fichas/ficha-draft-storage.ts`
- `src/features/fichas/form-options.ts`
- `src/features/fichas/print-*.ts`
- `src/features/fichas/operational-pdf.ts`
- `src/features/fichas/legacy-import*.ts`
- `src/features/fichas/observacoes-autofill.ts`
- `src/features/quadro-producao/api.ts`, `data.ts`, `schema.ts`, `search-params.ts` e `config.ts`
- `src/features/relatorios/data.ts`, `relatorio-pdf.ts` e rotas de exportacao
- `scripts/`
- `supabase/migrations/`
- `supabase/seed.sql`, se existir ou for criado com aprovacao humana
- `tests/`
- `README.md`, `TODO.md` e `registro-alteracoes.md`, quando a mudanca tecnica exigir registro

Nao deve tocar sem aprovacao humana:

- refinamento visual amplo em `src/components/ui/` e `src/styles/globals.css`
- redesign de telas, reorganizacao de navegacao ou nova linguagem visual
- copy decorativa, animacoes e ajustes de espacamento puramente visuais
- assets visuais em `public/`, salvo quando a tarefa for integracao tecnica de asset existente
- componentes `.tsx` quando a mudanca for apenas estetica e nao houver contrato tecnico envolvido

## Arquivos Compartilhados com Aprovacao Humana

Alterar estes arquivos exige aprovacao humana explicita, porque afeta os dois lados ou muda contrato do projeto:

- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`, se existir
- `playwright.config.js`
- `vercel.json`
- `.env`, `.env.local`, `.env.example`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.vercelignore`
- `.claude/settings.local.json`
- `AGENTS.md`
- `agent-boundaries.md`
- `README.md`
- `TODO.md`, quando a alteracao mudar prioridade ou escopo de produto
- `registro-alteracoes.md`, quando a alteracao corrigir historico ja registrado
- `src/styles/globals.css`, quando a mudanca alterar tokens, temas, comportamento global ou linguagem visual
- `src/components/ui/*`, quando a mudanca alterar API publica, variantes, tokens ou comportamento base
- `src/lib/supabase/database.types.ts`
- `supabase/migrations/*`
- `src/features/*/schema.ts`
- `src/features/*/types.ts`
- `src/features/fichas/data/legacy-catalog-fallback.json`
- `tests/visual/pages.spec.js` e snapshots visuais

## Regras Anti-Conflito

- Antes de editar, cada agente deve conferir `git status --short` e nao sobrescrever arquivos ja modificados pelo outro agente ou pelo usuario.
- Se um arquivo ja estiver modificado e for necessario mexer nele, leia o diff atual e aplique apenas uma alteracao pequena e compativel.
- Nao formatar arquivos inteiros quando a tarefa pede mudanca pontual.
- Nao fazer substituicoes em massa em areas fora do escopo do agente.
- Nao rodar migrations, seeds, `npm install` ou comandos de deploy sem aprovacao humana explicita.
- Nao rodar `npm run build`, `npm run typecheck`, `npm run lint` ou testes visuais se houver `next dev` ativo do usuario sem autorizacao explicita.
- Quando uma mudanca exigir UI e backend, dividir em duas etapas claras: contrato/dados primeiro com Codex; composicao visual depois com Claude Code.
- Se a correcao visual exigir mudar schema, API, migration, query, action ou validacao, parar e pedir aprovacao humana antes de atravessar a fronteira.
- Se a correcao tecnica exigir alterar componente base, tema global ou padrao visual, parar e pedir aprovacao humana antes de atravessar a fronteira.
- Nao recriar rotas legadas (`/dashboard`, `/controle`) por inercia. Se precisar consultar comportamento antigo, usar `main` ou commit pre-migracao como referencia externa.

## Mudancas Fora de Escopo

Se a tarefa revelar um problema fora do escopo do agente, o agente deve registrar o achado de forma curta, explicar o impacto e parar antes de editar. So pode prosseguir com autorizacao humana explicita.

Excecao: correcoes minimas de compilacao causadas pela propria mudanca do agente podem ser feitas no mesmo ciclo, desde que nao alterem arquitetura, visual global, schema, migration, dependencias ou contrato salvo.

## Regras Especiais

- `package.json` e `package-lock.json`: qualquer alteracao de dependencia, script ou versao exige aprovacao humana. Preferir bibliotecas ja existentes.
- Supabase: apenas Codex deve criar ou editar migrations, sempre com SQL idempotente e compatibilidade com o fluxo atual de validacao.
- Schemas e tipos: mudancas em `schema.ts`, `types.ts` e `src/lib/supabase/database.types.ts` sao contrato compartilhado; exigir aprovacao humana quando afetarem UI, API, banco ou dados salvos.
- Datas operacionais: qualquer data de negocio nova ou alterada deve usar `src/lib/dates.ts` e timezone `America/Cuiaba`.
- Tokens e tema: `src/styles/globals.css` e os primitivos em `src/components/ui/` sao territorio visual compartilhado. Claude Code pode propor; mudancas globais exigem aprovacao humana.
- Arquivos de configuracao: `next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.js`, `vercel.json`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.vercelignore` e `.claude/settings.local.json` exigem aprovacao humana.
- Arquivos derivados: nao editar manualmente artefatos gerados por build, cache, snapshots ou exportacoes locais. Gerar pelo comando apropriado quando combinado.
- Impressao e PDF: manter separacao entre previa em modal, impressao individual e PDF operacional filtrado.
- Feedback no App Router: usar `sonner` direto; nao reintroduzir provider ou shim custom.

## Regra de Ouro

Quando houver duvida real sobre a fronteira, faca a menor leitura possivel, descreva o risco e peca aprovacao humana antes de editar. O objetivo e evitar conflito, nao criar fila de espera para mudancas obvias.
