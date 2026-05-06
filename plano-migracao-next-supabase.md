# Plano de migracao para Next.js + Supabase

Objetivo: reconstruir o sistema em Next.js usando Supabase/Postgres como base principal, sem fazer o Next carregar as paginas HTML/JS legadas atuais. O legado sera mantido apenas como referencia funcional durante a migracao e removido somente depois que a nova versao estiver validada.

## Principios da migracao

- Migrar com seguranca, em etapas pequenas e verificaveis.
- Criar telas e fluxos nativos em Next.js, sem embutir ou reaproveitar diretamente as paginas legadas.
- Organizar a nova aplicacao por modulos em `src/features/*`, com rotas em `src/app/*` e UI compartilhada em `src/components/ui/*`.
- Usar o sistema atual como referencia de comportamento, regras de negocio e comparacao visual.
- Usar o legado como referencia funcional, nao como base visual ou CSS para a nova interface.
- Desenhar a nova UI de forma moderna, modular, tokenizada e limpa, mesmo quando isso diferir do visual legado.
- Rebalancear cores nos tokens da nova UI em vez de reaproveitar a paleta legada por padrao.
- Preferir uma paleta mais vibrante inspirada na Ant Design, evitando que a UI fique amarelada.
- Manter Plus Jakarta Sans como tipografia base da aplicacao Next.
- Usar `lucide-react` como pacote de icones do novo sistema.
- Implementar e validar modo claro e modo escuro desde o inicio, sempre por tokens sem misturar superficies de um tema no outro.
- Ser rigido com consistencia visual: elementos com a mesma funcao devem usar o mesmo componente, estilo e comportamento em todos os modulos.
- Modelar dados no Supabase antes de implementar telas dependentes.
- Validar paridade funcional antes de remover qualquer arquivo legado.
- O formulario de criacao/edicao de fichas deve manter paridade funcional com o formulario legado: mesmos campos, mesmos comportamentos condicionais e feedback por toast para erros ou pendencias.
- Evitar mudancas grandes sem ponto de rollback claro.
- Registrar decisoes, riscos e pendencias neste documento.
- Registrar tambem como cada etapa foi feita e validada para facilitar continuidade em novas instancias.

## Login para testes:
- Usuário: fernanda
- PIN: 0022

## Fase 0. Preparacao e congelamento relativo do legado

**Objetivo:** entender o estado atual e definir uma base segura para comecar.

### Tarefas

- [ ] Revisar `git status --short` e separar mudancas pendentes.
- [x] Fazer inventario das paginas atuais:
  - [x] Dashboard.
  - [x] Clientes.
  - [x] Fichas.
  - [x] Relatorios.
  - [x] Configuracoes e utilitarios.
- [x] Fazer inventario dos arquivos JS principais e suas responsabilidades.
- [x] Fazer inventario dos estilos e tokens existentes.
- [x] Identificar fluxos criticos que precisam existir na nova versao.
- [ ] Definir quais bugs do legado devem ser corrigidos antes da migracao e quais serao resolvidos apenas na nova versao.
- [x] Centralizar arquivos Markdown na raiz do projeto.
- [x] Atualizar `agents.md` com regras de Vercel, Next.js, Supabase e UI.

### Criterios de aceite

- [x] Fluxos criticos listados.
- [x] Modulos legados mapeados.
- [x] Pendencias conhecidas registradas.
- [x] Nenhum arquivo legado removido nesta fase.

## Fase 1. Modelo de dados no Supabase

**Objetivo:** desenhar a estrutura de dados nova antes de construir as telas.

### Tarefas

- [x] Mapear entidades atuais:
  - [x] Usuarios.
  - [x] Clientes.
  - [x] Fichas.
  - [x] Itens de ficha.
  - [x] Personalizacoes.
  - [x] Produtos ou modelos.
  - [x] Status de producao/entrega.
  - [x] Imagens/anexos, se aplicavel.
- [x] Definir tabelas Postgres e relacionamentos.
- [x] Definir enums ou tabelas auxiliares para status e tipos de personalizacao.
- [x] Definir tabela editavel para catalogos operacionais.
- [ ] Definir campos de auditoria:
  - [x] `created_at`.
  - [x] `updated_at`.
  - [x] `delivered_at`.
  - [ ] usuario responsavel, se aplicavel.
- [x] Definir indices para consultas frequentes:
  - [x] Fichas por data.
  - [x] Fichas por status.
  - [x] Fichas por cliente.
  - [x] Fichas por tipo de personalizacao.
- [x] Definir politicas de Row Level Security.
- [x] Definir estrategia de importacao dos dados existentes.
- [x] Criar seed inicial de catalogos a partir dos dados legados, sem dependencia runtime de JSON.

### Criterios de aceite

- [x] Schema inicial documentado.
- [x] Relacionamentos revisados.
- [x] Estrategia de migracao de dados definida.
- [x] RLS planejado antes de expor dados em producao.

## Fase 2. Bootstrap do projeto Next.js

**Objetivo:** criar a base nova do app, independente das paginas legadas.

### Tarefas

- [x] Escolher estrutura do projeto:
  - [x] Novo app dentro do repo atual.
  - [ ] Ou nova raiz Next substituindo gradualmente a estrutura antiga.
- [x] Criar projeto Next.js com TypeScript.
- [x] Configurar lint e scripts de build.
- [x] Configurar variaveis de ambiente para Supabase.
- [x] Criar cliente Supabase server-side e client-side conforme necessidade.
- [x] Definir estrutura inicial:
  - [x] `src/app/`.
  - [x] `src/components/ui/`.
  - [x] `src/lib/`.
  - [x] `src/lib/supabase/`.
  - [x] `src/features/`.
  - [x] `src/styles/`.
- [x] Definir base inicial de tokens/design system da nova versao.

### Criterios de aceite

- [x] App Next roda localmente.
- [x] Build inicial passa.
- [x] Conexao com Supabase validada em ambiente de desenvolvimento.
- [x] Nenhuma pagina legada esta sendo carregada pelo Next.

## Fase 3. Autenticacao e base de navegacao

**Objetivo:** estabelecer acesso seguro e layout principal antes dos modulos.

### Tarefas

- [x] Definir fluxo de login.
- [x] Definir estrategia de auth propria usando Supabase como armazenamento server-side, sem Supabase Auth por enquanto.
- [x] Criar layout autenticado.
- [x] Criar navegacao principal.
- [x] Criar rota inicial de catalogos operacionais.
- [x] Criar estados globais de carregamento, erro e vazio.
- [x] Criar utilitario unico de notificacoes na nova versao.
- [x] Criar pagina inicial operacional, sem landing page.
- [x] Criar base de tema claro/escuro com alternancia persistida.

### Criterios de aceite

- [x] Login/logout funcionando.
- [x] Rotas protegidas.
- [x] Navegacao base funcionando em desktop e mobile.
- [x] Notificacoes centralizadas.

## Registro de continuidade

2026-04-30 · autenticacao · `supabase/migrations/202604300001_app_auth.sql`, `src/features/auth/*`, `src/app/login/page.tsx`, `src/app/layout.tsx`, `src/proxy.ts`, `src/components/ui/app-shell.tsx`, `src/components/ui/app-navigation.tsx`, `src/lib/navigation.ts`, `src/features/fichas/actions.ts`, `src/features/clientes/actions.ts`, `src/features/catalogos/actions.ts`, `src/app/catalogos/page.tsx`, `src/styles/globals.css`, `scripts/seed-auth-user.mjs`, `package.json`, `src/lib/supabase/database.types.ts` · adicionada base de login por usuario/PIN com sessao HTTP-only, logout, gate de rotas pelo proxy/layout e restricao de Catalogos para superadmin · decisao: usar sessao propria da aplicacao por enquanto, mantendo Supabase como armazenamento server-side via service role e evitando expor credenciais no cliente · caveat: Supabase CLI nao esta instalado nesta maquina, entao a migration foi criada manualmente e ainda precisa ser aplicada no banco antes de semear o primeiro usuario com `npm run seed:auth-user`.

## Fase 4. Modulo de fichas

**Objetivo:** implementar o centro operacional novo primeiro, pois ele orienta o modelo e os proximos fluxos.

### Tarefas

- [x] Criar listagem de fichas.
- [x] Criar cadastro inicial de ficha.
- [x] Criar edicao inicial de ficha.
- [x] Expandir cadastro para os campos tecnicos de base e acabamentos do legado.
- [x] Criar captura de itens/produtos da ficha com os mesmos campos e comportamentos do legado.
- [x] Implementar regras condicionais dependentes de produtos, incluindo modo regata/colete.
- [x] Implementar sugestoes automaticas por produto/material do formulario legado.
- [x] Reorganizar o formulario de ficha para seguir o fluxo visual do legado.
- [x] Implementar upload novo de imagens com Cloudinary e persistencia em `ficha_imagens`.
- [x] Criar filtros por status, data, cliente e tipo de personalizacao.
- [x] Criar controle de fichas da semana por data.
- [x] Criar controle de fichas da proxima semana por data.
- [x] Criar lista de fichas antigas pendentes.
- [x] Implementar acao de marcar ficha como entregue.
- [x] Separar visualmente por tipo de personalizacao.
- [x] Implementar PDF operacional com agrupamentos por data e personalizacao.

### Criterios de aceite

- [x] Fichas podem ser criadas, editadas e consultadas.
- [x] Atalhos de fichas da semana e da proxima semana funcionam com os filtros operacionais atuais em `/fichas`.
- [x] Fichas pendentes podem ser marcadas como entregues.
- [x] PDF confere com a tela.
- [x] Fluxo validado com dados reais ou massa de teste.

## Fase 5. Modulo de clientes

**Objetivo:** reconstruir clientes com relacao clara com fichas.

### Tarefas

- [x] Criar listagem de clientes.
- [x] Criar cadastro/edicao de cliente.
- [x] Criar detalhe do cliente com historico de fichas.
- [x] Migrar buscas e filtros importantes do legado.
- [x] Validar duplicidade, campos obrigatorios e formatos.

### Criterios de aceite

- [x] Cliente pode ser criado, editado e localizado.
- [x] Historico de fichas por cliente funciona.
- [x] Dados importados aparecem corretamente.

## Fase 6. Indicadores e atalhos operacionais

**Objetivo:** consolidar indicadores e atalhos operacionais no Next usando dados do Supabase, sem manter uma rota dedicada de dashboard se ela duplicar `/fichas` e `/relatorios`.

**Status atual:** a rota separada `/dashboard` foi descontinuada. As responsabilidades operacionais foram absorvidas principalmente por `/fichas`, `/relatorios` e pela home.

### Tarefas

- [x] Definir indicadores principais.
- [x] Criar cards ou secoes operacionais com dados reais.
- [x] Criar atalhos para fluxos frequentes.
- [x] Validar responsividade.

### Criterios de aceite

- [x] Indicadores mostram dados consistentes nas superficies ativas.
- [x] Atalhos levam aos fluxos corretos.

## Fase 7. Relatorios e PDFs

**Objetivo:** reconstruir relatorios com base no novo modelo.

### Tarefas

- [x] Mapear relatorios existentes.
- [x] Priorizar relatorios essenciais.
- [x] Criar filtros e consultas no Supabase.
- [x] Implementar geracao de PDF.
- [x] Comparar resultados com o legado.

### Criterios de aceite

- [x] Relatorios essenciais implementados.
- [x] PDFs gerados com layout consistente.
- [x] Dados conferem com consultas equivalentes.

## Polimento pre-producao

**Objetivo:** fechar paridade operacional fina antes de publicar a versao Next em producao.

### Critico

- [ ] Garantir que o formulario de criacao da ficha tenha o mesmo comportamento do formulario legado.
- [x] Implementar drag/drop das multiplas imagens, persistindo a ordem visual em `ficha_imagens.ordem`.
- [x] Implementar Ctrl+V como forma de adicionar imagem na ficha.
- [x] Implementar botao de reordenamento automatico dos produtos da ficha.
- [x] Implementar editor rico simples no campo observacoes.
- [x] Implementar botao de auto-preenchimento de observacoes com regra inicial baseada nos campos da ficha.
- [x] Confirmar puxada de dados dos catalogos/datalists nos campos de criacao e edicao das fichas.
- [ ] Portar e validar as regras completas de auto-preenchimento de observacoes contra o legado.
- [x] Implementar impressao individual da ficha com montagem propria baseada no legado, incluindo layout e dimensionamento de imagens.

### Medio

- [x] Implementar superficie dedicada de quadro de producao/Kanban quando a frente for retomada, mantendo `fichas` como dominio fonte e a UI consistente com o App Router atual.

### Leve

- [x] Configurar exportacoes PDF finais com PDF personalizado.

## Bibliotecas recomendadas para reduzir hardcode

**Objetivo:** adotar bibliotecas pequenas e bem encaixadas nas frentes pendentes, removendo implementacoes manuais de URL state, datas, toasts, tabelas, Kanban, graficos e editor rico.

### Ja confirmadas no novo stack

- [x] `lucide-react`: icones padrao da nova UI.
- [x] `zod`: schemas de validacao compartilhados entre formulario e Server Actions.
- [x] `fluid-dnd`: drag/drop de produtos, imagens e cards do quadro de producao, com ordem persistida e scroll interno nas colunas.
- [x] `react-hook-form`: base estrutural do formulario de ficha, especialmente arrays dinamicos e campos condicionais.
- [x] `sonner`: notificacoes padrao do App Router atual.

### Adotar antes do corte, se a frente correspondente for tocada

- [x] `nuqs`: substituir sincronizacao manual de filtros/search params quando a superficie pedir URL state estruturado; adotado no quadro de producao para filtros e restauracao via back/forward.
- [ ] `date-fns`: centralizar formatacao e calculo de datas, incluindo atraso e periodos em `pt-BR`.
- [ ] `sonner`: evoluir feedback assincromo com `toast.promise`, principalmente salvar ficha com imagens/upload.

### Adotar na homologacao e listagens

- [ ] `@tanstack/react-table`: substituir o table engine proprio quando sorting, filtros compostos e paginacao ficarem mais exigentes em fichas, clientes e catalogos.
- [x] `react-day-picker`: iniciar troca de inputs simples de data por seletor visual; ja usado nas datas de inicio/entrega do formulario de ficha.

### Adotar com Dashboard/Kanban

- [x] `@tanstack/react-query`: cache client-side, refetch e mutacoes otimistas; adotado no quadro de producao.
- [x] `react-resizable-panels`: paineis/colunas redimensionaveis no quadro de producao.
- [ ] `recharts`: graficos do dashboard e relatorios visuais.
- [ ] `zustand`: preferencias locais e estado interativo do Kanban quando `useState` local deixar de ser suficiente.

### Adotar na paridade fina do editor

- [ ] `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`: substituir o editor rico simples de observacoes quando for fechar a paridade fina com o legado.

### Ordem sugerida

1. `nuqs`, `date-fns`, `sonner`.
2. `@tanstack/react-table`, `react-day-picker`.
3. `@tanstack/react-query`, `recharts`, `react-resizable-panels`, `zustand`.
4. `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`.

### Decisao de uso

- Nao instalar bibliotecas sem uma superficie de migracao no mesmo ciclo.
- Cada adocao deve remover uma implementacao manual existente ou desbloquear uma frente registrada neste plano.
- Ao instalar, registrar no plano e no registro qual hardcode foi removido, quais arquivos passaram a depender da biblioteca e quais checks rodaram.

## Fase 8. Migracao de dados

**Objetivo:** levar os dados do sistema atual para o Supabase com rastreabilidade.

### Tarefas

- [x] Exportar dados atuais.
- [x] Criar script de transformacao para o novo schema.
- [x] Criar importacao em ambiente de teste.
- [x] Validar contagens por entidade.
- [x] Popular catalogos no Supabase antes da importacao completa das fichas.
- [x] Validar amostras de clientes, fichas e relatorios.
- [x] Registrar inconsistencias encontradas.
- [ ] Planejar janela de migracao final.

### Criterios de aceite

- [x] Dados importados em ambiente de teste.
- [x] Contagens e amostras validadas.
- [x] Inconsistencias conhecidas resolvidas ou documentadas.

## Fase 9. Paridade e homologacao

**Objetivo:** confirmar que a nova versao substitui o legado com seguranca.

**Escopo atual para concluir a migracao funcional:** homologar os fluxos principais ja reconstruidos, validar ambiente Vercel/Supabase/Cloudinary em producao e implantar autenticacao/perfis minimos. Paridades finas como impressao fiel ao legado e Kanban entram depois da base funcional, salvo se virarem bloqueadores operacionais.

### Tarefas

- [x] Criar checklist de paridade por modulo.
- [x] Testar fluxos principais ponta a ponta.
- [x] Testar desktop e mobile.
- [x] Validar permissoes e seguranca.
- [x] Implementar login simples por username e PIN.
- [x] Implementar perfil superadmin para cadastro de usuarios e areas administrativas como catalogos.
- [x] Bloquear rotas administrativas para usuarios comuns.
- [x] Validar variaveis e build no ambiente Vercel de producao.
- [x] Criar auditoria local repetivel de prontidao para producao.
- [x] Validar PDFs.
- [x] Validar performance basica das paginas mais usadas.
- [x] Coletar ajustes finais.

### Criterios de aceite

- [ ] Todos os fluxos criticos aprovados.
- [ ] Nenhum bloqueador conhecido para troca.
- [x] Plano de rollback definido.

### Plano de rollback

- Manter o legado preservado ate o usuario confirmar a remocao final.
- Antes da janela de corte, congelar alteracoes no legado e gerar backup/export dos dados atuais.
- Se o deploy Next falhar no corte, reverter o dominio para o deploy legado anterior e manter o legado como fonte operacional.
- Se houver divergencia de dados depois do corte, pausar escrita no Next, reabrir o legado como sistema principal e repetir a importacao incremental por `legacy_ficha_id` antes de nova tentativa.
- So remover arquivos/dependencias legadas depois de producao validada, backup preservado e aceite explicito.

## Fase 10. Corte para producao

**Objetivo:** colocar a versao Next/Supabase como sistema principal.

### Tarefas

- [ ] Congelar alteracoes no legado.
- [ ] Rodar migracao final de dados.
- [x] Validar dados importados.
- [x] Configurar ambiente de producao.
- [ ] Publicar nova versao.
- [ ] Testar fluxos criticos em producao.
- [ ] Monitorar erros iniciais.

### Criterios de aceite

- [ ] Nova versao esta em uso.
- [ ] Fluxos criticos confirmados em producao.
- [ ] Dados principais conferidos apos o corte.

## Fase 11. Remocao do legado

**Objetivo:** remover arquivos antigos somente depois da nova versao estar validada.

### Pre-condicoes obrigatorias

- [ ] Nova versao em producao e validada.
- [ ] Backup dos dados antigos preservado.
- [ ] Paridade funcional aprovada.
- [ ] Nenhum fluxo operacional depende dos arquivos legados.
- [ ] Usuario confirmou que o legado pode ser removido.

### Tarefas

- [ ] Listar arquivos e diretorios legados que serao removidos.
- [ ] Remover HTML, JS e CSS legados que nao sao mais usados.
- [ ] Remover dependencias antigas.
- [ ] Atualizar README e documentacao.
- [ ] Rodar build e checks finais.
- [ ] Revisar `git status --short`.

### Criterios de aceite

- [ ] Legado removido sem quebrar a nova versao.
- [ ] Build final passa.
- [ ] Documentacao reflete a arquitetura nova.

## Riscos e cuidados

- Migrar telas antes do modelo de dados pode gerar retrabalho.
- Apagar legado cedo demais aumenta risco de perder regra de negocio escondida.
- PDFs e relatorios precisam de comparacao com dados reais.
- Regras de status e datas precisam ser definidas com precisao antes do modulo de fichas.
- RLS mal configurado pode expor dados ou bloquear fluxos validos.

## Como continuar em novas instancias

- Comecar por `git status --short`, depois ler `agents.md`, este plano, `src/app/*`, `src/components/ui/*`, `src/features/*` e `src/lib/navigation.ts`.
- Tratar `public/*` como referencia funcional do legado; nao importar CSS legado para o Next e nao replicar layout antigo sem necessidade.
- Tratar cores legadas como parte do legado visual; criar ou ajustar tokens da nova UI conforme a melhor experiencia operacional.
- Usar azul como acao primaria, ciano para informacao, verde para sucesso, laranja para alerta e vermelho para erro, com fundos neutros frios.
- Manter Plus Jakarta Sans configurada via `next/font` no layout raiz.
- Usar icones de `lucide-react` para a nova UI; nao misturar bibliotecas de icones.
- Ao criar ou alterar UI, testar light e dark mode com contraste suficiente, sem elementos escuros no tema claro nem elementos claros no tema escuro.
- Antes de criar botao, toggle, input, tabela, badge, card, modal, paginacao ou estado visual, procurar/usar o primitivo compartilhado em `src/components/ui/*`.
- Se uma variacao for realmente necessaria, evoluir o primitivo compartilhado e seus estilos globais; nao criar classe local parecida dentro de uma feature.
- Para telas novas, criar rota em `src/app/<modulo>/page.tsx`, composicao de dominio em `src/features/<modulo>/*` e primitivos reutilizaveis em `src/components/ui/*`.
- Manter Server Components por padrao; usar `"use client"` so no menor ponto interativo, como foi feito em `src/components/ui/app-navigation.tsx` para estado ativo da navegacao.
- Centralizar navegacao em `src/lib/navigation.ts` e estilos globais/tokens em `src/styles/*`.
- O schema Supabase inicial fica em `supabase/migrations/202604280001_initial_schema.sql`; tratar `fichas.legacy_ficha_id` como ponte de importacao a partir da tabela legada `fichas`.
- Antes de criar queries da nova app, preferir as tabelas novas `clientes`, `fichas`, `ficha_itens`, `ficha_imagens` e `produto_modelos`.
- Antes de criar utilitario ou sistema visual novo, buscar duplicidade com `rg` nos caminhos `src` e `public/js`.
- Validar cada fatia com varredura de encoding nos arquivos tocados, busca por cores diretas fora dos tokens, `npm run lint`, `npm run typecheck` e `npm run build`.
- Quando houver UI, validar no navegador com DevTools e em Chromium limpo via Playwright; considerar avisos causados por extensoes do Edge somente depois de confirmar que Playwright limpo nao reproduz.
- Registrar no fim de cada etapa: arquivos principais, decisoes, comandos de verificacao e qualquer detalhe operacional que a proxima instancia precisa saber.

## Snapshot tecnico atual

- O shell operacional do Next fica em `src/components/ui/app-shell.tsx` e e aplicado no layout raiz `src/app/layout.tsx`.
- A navegacao principal e centralizada em `src/lib/navigation.ts`.
- O estado ativo da navegacao usa o menor client component possivel: `src/components/ui/app-navigation.tsx`.
- A pagina inicial `src/app/page.tsx` lista os modulos e navega com `<Link>`.
- Rotas nativas ativas ja existem para `/fichas`, `/clientes`, `/catalogos`, `/usuarios` e `/relatorios`; `/dashboard` e `/controle` foram removidas da navegacao ativa.
- Cada rota chama um overview em `src/features/<modulo>/*`, usando `src/components/ui/module-overview.tsx`.
- Primitivos compartilhados iniciais ficam em `src/components/ui/*`: `AppShell`, `AppNavigation`, `Badge`, `Button`, `Card` e `ModuleOverview`.
- Primitivos compartilhados para listagens foram iniciados em `src/components/ui/data-table.tsx` e `src/components/ui/empty-state.tsx`.
- Estilos novos estao em `src/styles/globals.css` e tokens em `src/styles/tokens/colors.css`; nao foi usado CSS legado.
- Tipografia base: Plus Jakarta Sans via `next/font/google` em `src/app/layout.tsx`.
- Paleta atual usa tokens inspirados na Ant Design, com fundo frio e cores funcionais mais vibrantes; nao deriva da paleta/CSS legado.
- Modo escuro inicial usa cookie lido em `src/app/layout.tsx` para aplicar `data-theme` no HTML e `src/components/ui/theme-toggle.tsx` para alternancia persistida.
- Ler cookie de tema no layout torna as rotas atuais dinamicas no build (`ƒ`), uma troca aceita neste momento para entregar tema persistido ja no HTML inicial.
- Estados globais do App Router usam `src/components/ui/status-panel.tsx` em `src/app/loading.tsx`, `src/app/error.tsx` e `src/app/not-found.tsx`; 404 foi validado visualmente em light/dark.
- Notificacoes da nova app usam apenas `src/components/ui/toast-provider.tsx` e o helper `src/lib/toast.ts`; o toast legado em `public/js/utils/toast.js` permanece somente para telas antigas. ToastProvider fica no centro inferior, usa icone Lucide para fechar e barra inferior de tempo na cor semantica do toast; posicao, icone e temporizador foram validados com Playwright.
- Schema Supabase inicial criado em `supabase/migrations/202604280001_initial_schema.sql` com enums de ficha, kanban e insumos; tabelas `clientes`, `produto_modelos`, `fichas`, `ficha_itens` e `ficha_imagens`; indices operacionais, trigger compartilhado de `updated_at` e RLS habilitado com politicas temporarias para usuarios autenticados.
- O schema usa `fichas` como nome de dominio principal e `legacy_ficha_id` apenas para rastrear a importacao da tabela legada `fichas`.
- Tipos manuais do schema Supabase ficam em `src/lib/supabase/database.types.ts` ate haver geracao automatica pelo CLI; os clientes Supabase leem variaveis dentro das factories para manter inicializacao preguiçosa em serverless.
- A primeira listagem nativa de fichas esta em `src/features/fichas/fichas-overview.tsx`, com loader server-side em `src/features/fichas/data.ts`; se o Supabase nao estiver configurado, a tela mostra estado vazio de configuracao em vez de falhar no build.
- A listagem de fichas usa filtros nativos por URL para `cliente`, `arte`, `status`, `dataInicio` e `dataFim`; a normalizacao fica em `src/features/fichas/data.ts` e a composicao de rota em `src/app/fichas/page.tsx`.
- A listagem tambem possui atalhos por URL em `src/features/fichas/fichas-overview.tsx`: todas, esta semana, proxima semana e antigas pendentes. Esses atalhos calculam semanas a partir da data atual no servidor.
- Quando ha dados, a listagem de fichas separa visualmente os registros por tipo de personalizacao, com resumo navegavel por grupo e uma tabela compartilhada para cada tipo.
- O PDF operacional inicial fica em `/fichas/pdf`, preserva os filtros da listagem, busca ate 500 fichas e gera um PDF server-side simples agrupado por data e tipo de personalizacao. O gerador esta em `src/features/fichas/operational-pdf.ts`.
- O cadastro inicial fica em `src/app/fichas/nova/page.tsx`, com formulario client em `src/features/fichas/ficha-form.tsx`, schema Zod em `src/features/fichas/schema.ts` e Server Action em `src/features/fichas/actions.ts`.
- A edicao inicial fica em `src/app/fichas/[id]/page.tsx`, usando o mesmo formulario de `src/features/fichas/ficha-form.tsx` e loader por ID em `src/features/fichas/data.ts`.
- A edicao de ficha carrega tambem `ficha_itens` em `src/features/fichas/data.ts`, ordenados por `ordem`, para preencher os produtos no formulario.
- A edicao de ficha carrega tambem `ficha_imagens` em `src/features/fichas/data.ts`, ordenadas por `ordem`, para preencher o painel de Arte/Imagens do Produto.
- As Server Actions de ficha validam no servidor, retornam erros serializaveis para a UI, criam ou atualizam o cliente associado e redirecionam para `/fichas` apos salvar.
- As Server Actions de ficha persistem itens em `ficha_itens`: no cadastro inserem apos criar a ficha; na edicao removem os itens anteriores e inserem a versao atual serializada pelo formulario.
- As Server Actions de ficha persistem imagens em `ficha_imagens`: no cadastro inserem as referencias enviadas ao Cloudinary; na edicao substituem a lista de referencias pela versao atual serializada pelo formulario.
- O formulario de ficha aplica sugestoes automaticas do legado: produto social/polo preenche gola quando o campo esta livre ou foi preenchido automaticamente; `Calça de Helanca` sugere Helanca; `Calça de Brim` e `Jaleco de Brim` sugerem Brim; Dry Fit e Malha Fria preenchem composicao.
- O formulario de ficha foi reorganizado para acompanhar a ordem operacional do legado: Dados do pedido, Produtos, Especificacoes tecnicas, Manga e gola, Detalhes, Arte/Personalizacao e Observacoes; a interface continua nativa Next e nao reaproveita CSS legado.
- A organizacao visual do formulario de ficha foi ajustada para quatro secoes principais como o legado: Informacoes do Cliente, Produtos, Especificacoes Tecnicas e Arte/Imagens do Produto. Dentro de Especificacoes Tecnicas ficam os subgrupos Manga e gola, Detalhes, Arte/Personalizacao e Observacoes.
- A acao de marcar como entregue fica em `src/features/fichas/ficha-status-actions.tsx` com Server Action em `src/features/fichas/actions.ts`; ela atualiza `status` para `entregue`, preenche `delivered_at`, revalida `/fichas` e volta para a listagem.
- A primeira listagem nativa de clientes fica em `src/features/clientes/clientes-overview.tsx`, com loader server-side em `src/features/clientes/data.ts`; usa busca por URL (`termo`) e link para `/fichas?cliente=...`.
- O detalhe nativo de cliente fica em `/clientes/[id]`, renderiza cadastro, resumo operacional e historico recente de fichas vinculadas por `cliente_id`; quando ainda nao ha vinculo direto, oferece busca por nome nas fichas.
- Cadastro e edicao de clientes ficam em `/clientes/novo` e `/clientes/[id]/editar`, com formulario compartilhado em `src/features/clientes/cliente-form.tsx`, validacao Zod e Server Actions em `src/features/clientes/actions.ts`.
- O dashboard nativo antigo foi retirado da navegacao ativa; indicadores e operacao diaria estao concentrados em `/fichas` e analises/exportacoes em `/relatorios`.
- O relatorio operacional nativo em `/relatorios` usa a mesma fonte de dados do PDF operacional, com filtros por URL para cliente, personalizacao, status e periodo de entrega. A tela agrupa fichas por data de entrega e o botao de PDF preserva os filtros em `/fichas/pdf`.
- O fluxo de imagens deve usar Cloudinary, nao Supabase Storage por padrao. A implementacao Next deve ser nova, sem copiar JS legado; usar o legado apenas como referencia de contrato e comportamento. Referencias legadas: `server.js` com `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`, rotas `/api/cloudinary/config`, `/api/cloudinary/signature`, `/api/cloudinary/image/:publicId`; comportamento client em `public/js/cloudinary-upload.js`.
- A implementacao nova de Cloudinary fica em `src/lib/cloudinary.ts` e nos route handlers `src/app/api/cloudinary/config/route.ts`, `src/app/api/cloudinary/signature/route.ts` e `src/app/api/cloudinary/image/[...publicId]/route.ts`. O formulario cria previews locais com `blob:` e so faz upload das imagens pendentes para Cloudinary ao clicar em salvar, antes de enviar os metadados para a Server Action.
- Ao remover imagem ja persistida durante a edicao, o formulario remove apenas a referencia local ate o usuario salvar, evitando quebrar fichas caso a navegacao seja cancelada antes do submit. Imagens novas ainda nao salvas ficam apenas locais e nao precisam de limpeza no Cloudinary.
- A ferramenta inicial de migracao de dados fica em `scripts/import-legacy-to-supabase.mjs` e roda por `npm run migrate:legacy`. O modo padrao e dry-run, sem gravar dados; `--apply` importa para Supabase usando `legacy_ficha_id` como chave de idempotencia.
- O importador le Turso via `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`, grava Supabase via `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, cria/atualiza clientes por `nome_normalizado`, upserta fichas por `legacy_ficha_id`, substitui filhos em `ficha_itens`/`ficha_imagens` e recalcula totais/datas de clientes ao final.
- Catalogos operacionais ficam em `catalog_items`, criada na migration `supabase/migrations/202604290001_catalog_items.sql`, com enum `catalog_item_kind`, aliases, metadados JSON, ativo e ordenacao. A rota Next inicial e `/catalogos`, com feature em `src/features/catalogos/*`.
- O seed inicial dos catalogos fica em `scripts/seed-catalog-items.mjs` e roda por `npm run seed:catalogos`. O modo padrao e dry-run; `--apply` insere/atualiza `catalog_items` por `kind,slug`. O seed usa `public/data/catalogo.json` apenas como fonte de importacao inicial, nao como dependencia runtime da nova app.
- O check de configuracao Supabase fica em `scripts/check-supabase-config.mjs` e roda por `npm run supabase:check`; ele mascara variaveis sensiveis, verifica env obrigatoria e conta linhas das tabelas principais.
- O dev server usado na verificacao ficou em `http://localhost:3100`.
- Edge DevTools pode mostrar aviso de hidratacao por extensao injetando `style` no `<html>`; Playwright limpo nao reproduziu erro da aplicacao.
- Ultima verificacao completa conhecida: encoding scan, busca por cores diretas fora dos tokens, `npm run lint`, `npm run typecheck`, `npm run build`, Playwright nas rotas, verificacao de fonte/tokens vibrantes em `/fichas`, persistencia de tema por cookie/localStorage e contraste light/dark nos pares criticos.

## Registro de decisoes

| Data | Decisao | Motivo |
| --- | --- | --- |
| 2026-04-27 | Next.js sera uma reconstrucao nativa, nao um wrapper do legado | Evitar carregar complexidade antiga para a arquitetura nova. |
| 2026-04-27 | Supabase/Postgres sera o alvo de banco da nova versao | Melhor encaixe para relacoes, relatorios, auth, storage e evolucao operacional. |
| 2026-04-27 | Arquivos legados so serao deletados no fim | Preservar referencia funcional ate a paridade ser validada. |
| 2026-04-28 | O projeto seguira governanca Vercel/Next.js/Supabase no `agents.md` | Comecar a migracao com regras claras antes de scaffold e alteracoes estruturais. |
| 2026-04-28 | Arquivos Markdown devem ficar na raiz do projeto | Evitar documentacao operacional dentro de pastas publicas ou de runtime. |
| 2026-04-28 | A nova arquitetura sera modular em `src/features/*` | Separar regras de negocio por dominio e evitar reproduzir a organizacao HTML/CSS/JS do legado. |
| 2026-04-28 | O legado sera referencia funcional, nao visual/CSS | Priorizar uma UI nova, limpa, modular e moderna em Next.js em vez de reaproveitar composicao antiga. |
| 2026-04-28 | Cada etapa deve registrar como foi feita e validada | Facilitar continuidade entre instancias e reduzir redescoberta de contexto. |
| 2026-04-28 | Cores tambem nao serao reaproveitadas do legado por padrao | A paleta da nova UI deve ser rebalanceada nos tokens para a melhor experiencia operacional. |
| 2026-04-28 | Plus Jakarta Sans sera mantida como tipografia base | Preservar a direcao tipografica desejada enquanto a interface visual evolui. |
| 2026-04-28 | A paleta sera mais vibrante e menos amarelada | Usar Ant Design como referencia de sistema de cores para uma UI operacional clara e moderna. |
| 2026-04-28 | Light e dark mode serao implementados juntos | Evitar retrabalho e prevenir mistura de componentes escuros no tema claro ou claros no tema escuro. |
| 2026-04-28 | Componentes com a mesma funcao devem ter o mesmo visual | Evitar divergencia entre modulos e manter o design system consistente desde a fundacao. |
| 2026-04-28 | `lucide-react` sera o pacote de icones da nova UI | Manter linguagem visual consistente sem misturar bibliotecas de icones. |
| 2026-04-28 | O novo dominio usa `fichas` como termo principal | O sistema cadastra fichas tecnicas dos trabalhos dos clientes; a linguagem da nova app deve refletir isso. |
| 2026-04-28 | RLS inicial permite acesso apenas a usuarios autenticados | Comecar seguro por padrao e endurecer depois com papeis/perfis quando a autenticacao for implementada. |
| 2026-04-28 | Imagens da nova app devem continuar usando Cloudinary | O legado ja possui configuracao funcional; Supabase fica como banco/auth e Cloudinary segue como storage de midia. |
| 2026-04-28 | Upload de imagens deve acontecer no salvar | Previews locais evitam assets orfaos quando o usuario seleciona imagens e cancela ou remove antes de salvar. |
| 2026-04-30 | Prioridade volta a ser concluir a migracao funcional | Evitar ciclo longo de polimento antes de fechar rotas, dados, deploy, seguranca e fluxos essenciais. |
| 2026-04-30 | Impressao individual da ficha sera modulo proprio futuro | A ficha impressa precisa de CSS/layout especifico e paridade com o legado, incluindo dimensionamento por quantidade de imagens; preview nao deve ser usado como documento formal. |
| 2026-04-30 | Quadro de producao/Kanban fica como pendencia de paridade pos-base | O novo sistema ainda nao reconstruiu esse fluxo operacional do legado, mas ele deve entrar depois que a migracao base estiver fechada. |
| 2026-05-05 | Quadro de producao volta como modulo proprio com colunas dinamicas | O Kanban deixou de ser apenas pendencia e passou a existir em `/quadro-producao`, com colunas persistidas em banco, filtros por URL, mutacoes server-side e UI alinhada ao design system atual. |
| 2026-05-06 | Cards do quadro devem priorizar personalizacao/status | O chip de tecido saiu do card para reduzir ruido; a entrega ganhou indicador circular de urgencia com a mesma regra do legado, os status da ficha usam as cores legadas e a preview de imagem passa por thumbnail Cloudinary 16:9. |
| 2026-05-06 | Modal do quadro funciona como card aberto | O modal de detalhe deixa de ser atalho para ficha/preview e passa a mostrar a primeira imagem, dados essenciais e acoes operacionais do proprio card, sem observacoes longas. |
| 2026-04-30 | Login futuro sera simples por username e PIN | O sistema precisa de entrada rapida para operacao, mas com perfis: superadmin controla usuarios e cadastros administrativos como catalogos; usuarios comuns ficam restritos aos fluxos permitidos. |

## Registro de progresso

| Data | Fase | Status | Notas |
| --- | --- | --- | --- |
| 2026-04-27 | Planejamento | Feito | Plano inicial criado para orientar a migracao segura para Next.js + Supabase. |
| 2026-04-28 | Fase 0 | Em andamento | Governanca de migracao adicionada ao `agents.md` e Markdown centralizado na raiz. |
| 2026-04-28 | Fase 2 | Em andamento | Scaffold Next 16 criado com App Router, TypeScript, lint, build, tokens iniciais e helpers Supabase. |
| 2026-04-28 | Fase 2 | Em andamento | Primitivos compartilhados iniciais criados em `src/components/ui` e pagina inicial passou a compor essa base. |
| 2026-04-28 | Fase 3 | Em andamento | Shell operacional com navegacao principal criado no layout raiz e rotas nativas adicionadas para Fichas, Clientes, Dashboard e Relatorios. |
| 2026-04-28 | Governanca | Feito | Novas regras registradas: UI nova nao deve tentar reaproveitar CSS legado; progresso tecnico deve registrar o que foi feito, como foi feito e como foi validado. |
| 2026-04-28 | Design system | Em andamento | Tipografia base ajustada para Plus Jakarta Sans e tokens de cor rebalanceados para a nova UI, sem derivar do CSS legado. |
| 2026-04-28 | Design system | Em andamento | Tokens de cor ajustados para uma paleta mais vibrante inspirada na Ant Design, reduzindo o tom amarelado anterior. |
| 2026-04-28 | Design system | Em andamento | Base de dark mode adicionada com `data-theme`, toggle persistido e tokens pareados para light/dark; contraste dos pares criticos validado em Playwright. |
| 2026-04-28 | Fase 3 | Em andamento | Estados globais de loading, erro e 404 adicionados com componente compartilhado `StatusPanel`, usando tokens para light/dark. |
| 2026-04-28 | Governanca | Feito | Regra de consistencia visual registrada: nao criar variantes locais para botoes, toggles, inputs, tabelas e demais primitivas com a mesma funcao. |
| 2026-04-28 | Fase 3 | Em andamento | Sistema unico de notificacoes da nova app adicionado com `ToastProvider`, `useToast` e helper `toast/notify` em `src/lib/toast.ts`. |
| 2026-04-28 | Design system | Em andamento | Toasts padronizados no centro inferior, com dismiss icon-only via Lucide e barra de tempo semantica na base. |
| 2026-04-28 | Fase 1 | Em andamento | Migration Supabase inicial criada com tabelas, enums, indices, trigger de `updated_at` e RLS para usuarios autenticados. |
| 2026-04-28 | Fase 4 | Em andamento | Primeira listagem nativa de fichas criada com filtros por URL, loader Supabase tipado e estados compartilhados de vazio/erro/configuracao pendente. |
| 2026-04-28 | Fase 4 | Em andamento | Cadastro inicial de ficha criado com Server Action, validacao Zod, feedback inline e caminho `/fichas/nova`. |
| 2026-04-28 | Fase 4 | Em andamento | Edicao inicial criada em `/fichas/[id]`, reutilizando formulario, validacao e Server Action propria para atualizar fichas. |
| 2026-04-28 | Fase 4 | Em andamento | Filtros da listagem ampliados para cliente, personalizacao, status e periodo de entrega, todos preservados na URL. |
| 2026-04-28 | Fase 4 | Em andamento | Atalhos operacionais adicionados para todas, esta semana, proxima semana e fichas antigas pendentes, usando filtros por URL. |
| 2026-04-28 | Fase 4 | Em andamento | Acao inicial de entrega adicionada na tela de edicao da ficha, com estado de loading, erro inline e atualizacao de `delivered_at`. |
| 2026-04-28 | Fase 4 | Em andamento | Cadastro e edicao receberam os primeiros campos tecnicos em secoes de Base tecnica e Acabamentos, persistindo material, composicao, cor, manga, largura, acabamento da manga, gola e acabamento da gola via Server Actions. |
| 2026-04-28 | Fase 4 | Em andamento | Cadastro e edicao passaram a persistir tambem cor de acabamentos, peitilho, pe de gola, botao, reforco, abertura lateral, bolso, filete, faixa, cor de sublimacao e nomes/numeros, mantendo a proxima etapa focada em itens/produtos da ficha. |
| 2026-04-28 | Fase 4 | Em andamento | Requisito reforcado: formulario de ficha precisa ter paridade funcional com o legado, largura confortavel e toasts para erros/pendencias; produtos/itens e regras por produto ficam como proxima fatia critica. |
| 2026-04-28 | Fase 4 | Em andamento | Produtos/itens adicionados ao formulario de ficha com tamanho, quantidade, produto, detalhes, adicionar/duplicar/remover, validacao por toast e persistencia em `ficha_itens`; modo regata/colete oculta manga comum e mostra viés. |
| 2026-04-28 | Fase 4 | Em andamento | Automacoes de produto/material do legado adicionadas ao formulario Next; validado com `npm run typecheck`, `npm run lint`, Playwright limpo e Edge DevTools em `/fichas/nova`. |
| 2026-04-28 | Fase 4 | Em andamento | Formulario de ficha reorganizado para aproximar o fluxo visual do legado sem reutilizar CSS antigo; `arte`, `comNomes`, `corSublimacao` e `composicao` foram agrupados em Arte/Personalizacao, observacoes viraram bloco proprio e a validacao vazia foi confirmada com toast global. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools em `/fichas/nova`. |
| 2026-04-28 | Fase 4 | Em andamento | Formulario de ficha refinado para seguir os blocos do legado: Informacoes do Cliente, Produtos, Especificacoes Tecnicas e Arte/Imagens do Produto. `cliente_auxiliar` e `data_inicio` foram adicionados ao formulario e persistencia, Evento voltou a ser select Sim/Nao, e Vendedor passou a ser obrigatorio como no legado. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools confirmando 4 fieldsets, 4 icones e fundo branco nas secoes. |
| 2026-04-28 | Fase 4 | Em andamento | Campo de evento voltou a ser checkbox por melhor ergonomia, alinhado com a altura dos inputs; tentativa de segunda linha com 4 itens foi revertida e o bloco voltou ao grid padrao de 3 colunas. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools. |
| 2026-04-28 | Fase 4 | Em andamento | Subgrupos de Especificacoes Tecnicas corrigidos para separar Manga e Gola como no legado, mantendo Material no topo e depois Detalhes, Arte/Personalizacao e Observacoes. Labels principais ajustados para Tipo de Manga e Tipo de Gola. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools. |
| 2026-04-28 | Fase 4 | Em andamento | Listagem de fichas passou a agrupar registros por tipo de personalizacao, preparando a mesma organizacao para o PDF operacional; ambiente local ainda esta sem Supabase configurado, entao DevTools/Playwright validaram estado vazio sem dados reais. |
| 2026-04-28 | Fase 4 | Em andamento | PDF operacional inicial criado em `/fichas/pdf`, com link na listagem e agrupamento por data/personalizacao; validado com `npm run typecheck`, `npm run lint`, `npm run build`, leitura via `pypdf`, Edge DevTools e Playwright desktop/mobile. |
| 2026-04-28 | Fase 5 | Em andamento | Primeira listagem nativa de clientes criada com busca por URL, tabela compartilhada e link para fichas filtradas por cliente; validado com `npm run typecheck`, `npm run lint`, `npm run build`, Edge DevTools e Playwright desktop/mobile. Screenshot do Edge DevTools travou, mas a avaliacao DOM passou e Playwright limpo confirmou a tela. |
| 2026-04-28 | Fase 5 | Em andamento | Detalhe nativo de cliente criado em `/clientes/[id]` com resumo e historico recente de fichas vinculadas; validado com `npm run typecheck`, `npm run lint`, `npm run build`, rota 200 e Edge DevTools sem overlay. Playwright nao foi executado nesta etapa porque a aprovacao foi bloqueada por limite de uso. |
| 2026-04-28 | Fase 5 | Em andamento | Cadastro e edicao de clientes adicionados com Server Actions, validacao de duplicidade por `nome_normalizado`, toast global e links nas telas de cliente; validado com `npm run typecheck`, `npm run lint`, `npm run build`, rotas 200 e Edge DevTools sem overlay. |
| 2026-04-28 | Fase 6 | Em andamento | Dashboard deixou de ser placeholder e passou a ter loader Supabase, indicadores principais, proximas entregas, antigas pendentes, distribuicao por personalizacao e atalhos. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools em `/dashboard` com estado seguro de Supabase nao configurado. |
| 2026-04-28 | Fase 7 | Em andamento | Relatorios deixou de ser placeholder e passou a ter filtros por URL, resumo operacional, agrupamento por data e link para PDF com os mesmos filtros. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools em `/relatorios`; ambiente local ainda sem Supabase configurado mostra estado vazio seguro. |
| 2026-04-28 | Midia | Feito inicial | Upload de imagens reconstruido em Next com Cloudinary: config publica, assinatura server-side, delete assinado, preview 16:9 no formulario e persistencia de referencias em `ficha_imagens`. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores, Edge DevTools em `/fichas/nova` e upload/delete real de uma imagem minima de validacao. |
| 2026-04-28 | Midia | Ajustado | Fluxo alterado para preview local e upload somente ao salvar. Validador client evita upload quando faltam campos minimos, deixando a Server Action retornar pendencias primeiro. DevTools confirmou imagem `Pendente` com URL `blob:` e `imagensJson` vazio antes do submit. |
| 2026-04-28 | Fase 8 | Em andamento | Script de transformacao/importacao criado em `scripts/import-legacy-to-supabase.mjs`, com dry-run por padrao e `--apply` para gravar no Supabase. Dry-run limitado validado com `npm run migrate:legacy -- --limit=5`: 5 fichas, 26 produtos e 7 imagens Cloudinary mapeaveis, sem gravar dados. Checks: `node --check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores. |
| 2026-04-29 | Catalogos | Em andamento | Criada base editavel de catalogos antes da importacao completa: migration `catalog_items`, rota `/catalogos`, CRUD inicial com Server Action, navegacao, tipos manuais Supabase e seed dry-run `npm run seed:catalogos`. Dry-run mapeou 213 itens: produtos, tamanhos, tecidos, cores, mangas, acabamentos de manga/gola, golas e bolsos. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools em `/catalogos` com estado seguro de Supabase nao configurado. |
| 2026-04-29 | Catalogos/Formulario | Em andamento | Adicionado `CustomDatalist` global em `src/components/ui`, loader `listCatalogOptionsForFichaForm` e conexao do formulario de ficha aos catalogos editaveis com fallback local. Material, cores, produtos/tamanhos e opcoes tecnicas agora usam sugestoes sem depender dos JSONs em runtime. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores, Edge DevTools em `/fichas/nova` e Playwright headless confirmando 10 datalists e menu `Dry Fit`. |
| 2026-04-29 | Supabase | Em andamento | Adicionado `npm run supabase:check` para validar env/schema antes de seed e importacao. A validacao foi corrigida para fazer `select` real nas tabelas, nao apenas `head/count`. Com `sb_pub` e `sb_sec` configuradas, a conexao funciona, mas o schema ainda retorna `schema-not-ready`: `clientes`, `fichas`, `ficha_itens`, `ficha_imagens` e `catalog_items` nao aparecem no cache da Data API. Proximo passo: aplicar as migrations no Supabase e rodar o check novamente. |
| 2026-04-29 | Supabase MCP | Feito parcial | MCP remoto do Supabase adicionado ao Codex para o projeto `qgqoxzbncbcmuaqmytou`, `remote_mcp_client_enabled = true` habilitado, OAuth concluido e skills `supabase`/`supabase-postgres-best-practices` instaladas via `npx skills add supabase/agent-skills --yes --global`. A sessao atual ainda nao expôs tools MCP novas, entao pode ser necessario reiniciar o Codex para usar `search_docs`/`execute_sql`. `.env` recebeu `NEXT_PUBLIC_SUPABASE_URL`; ainda faltam `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. |
| 2026-04-29 | Supabase/Migracao | Feito inicial | Migrations aplicadas manualmente no SQL Editor do Supabase, `.env` configurado com Publishable key e Secret key novas, `npm run supabase:check` retornou `ready`. Seed aplicado com `npm run seed:catalogos -- --apply`: 213 catalogos. Importacao aplicada com `npm run migrate:legacy -- --apply`: 310 fichas, 184 clientes, 1743 itens e 386 imagens. DevTools confirmou `/fichas` e `/catalogos` renderizando dados reais; screenshot do Dashboard travou no Edge, mas DOM nao indicou estado vazio. |
| 2026-04-29 | Pos-importacao | Em andamento | Paginação por URL adicionada às listagens de fichas e clientes com primitivo compartilhado `Pagination`. `/fichas` passou a exibir 25 de 310 registros por página e `/clientes` 30 de 184, preservando filtros em query string. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools em `/fichas`, `/fichas?page=2` e `/clientes`. |
| 2026-04-29 | Pos-importacao | Em andamento | Validação de ficha importada real feita com a ficha legacy 343/Bogarin: 9 itens, 1 imagem, material Dry Fit e ação de entrega renderizaram sem erros de console em Playwright antes da normalização. O importador passou a converter códigos legados de gola, acabamento de gola, acabamento de manga e bolso para rótulos legíveis; reimportação idempotente trouxe 314 fichas, 188 clientes, 1764 itens e 391 imagens. Amostra confirmou `Gola Redonda`, `Ribana Sublimada`, `Barra` e `Sem bolso`. O dev server em 3101 apresentou EPIPE/timeouts depois de várias tentativas de browser e precisou ser reiniciado; checks finais passaram com `npm run typecheck`, `npm run lint`, `npm run build` e scan de encoding. |
| 2026-04-29 | Pos-importacao | Em andamento | Com o dev server manual em `localhost:3000`, Playwright validou a ficha Bogarin normalizada no formulário: 9 itens, 1 imagem, `Gola Redonda`, `Ribana Sublimada`, `Barra` e `Sem bolso`, sem erros de console. PDF `/fichas/pdf?status=pendente` gerou 5 páginas e `Total encontrado: 90`, batendo com a contagem Supabase. `/relatorios?status=pendente` mostrou 90 registros, Dashboard mostrou métricas reais e detalhe do cliente Paróquia Nsra. da Abadia - Sidrolândia exibiu 14 fichas no histórico. Varredura confirmou `.env` ignorado e sem chaves reais fora dele. Checks: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding. |
| 2026-04-29 | Fichas CRUD | Em andamento | Fluxo real de criação testado via Playwright em `/fichas/nova`: ficha temporária `TESTE-CODEX` criada com cliente, entrega, vendedor, material e 1 item; consulta Supabase confirmou item persistido e limpeza removeu ficha/cliente temporários, mantendo contagens em 188 clientes, 314 fichas, 1764 itens e 391 imagens. Fluxo real de edição testado na ficha Bogarin: observação alterada pelo formulário, redirecionou para `/fichas`, manteve 9 itens e foi restaurada no Supabase. `createFichaAction` agora faz rollback da ficha recém-criada se a inserção de itens ou imagens falhar. Validado com `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build` e scan de encoding. |
| 2026-04-29 | Fluxos operacionais | Em andamento | Ação real de marcar ficha como entregue validada via Playwright na ficha legacy 259: botão mudou `status` para `entregue`, preencheu `delivered_at` e redirecionou para `/fichas`; registro foi restaurado para `pendente`/`delivered_at = null`. CRUD de catálogos validado criando `Produto Temporario Codex` com aliases e ordem 9999; consulta confirmou persistência e limpeza voltou `catalog_items` para 213. Checks finais: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`. |
| 2026-04-29 | Fichas/Filtros | Em andamento | Barra de filtros de `/fichas` ficou reativa sem botão Filtrar: busca com debounce via URL, Evento por checkbox imediato, status com Atrasados e sem Cancelado, mantendo consulta paginada no servidor por `range`. Atrasados foi definido como `status != entregue` e `data_entrega` anterior à data atual em `America/Cuiaba`; na listagem, a badge passa de Pendente para Atrasado em vermelho e a coluna de entrega mostra “Atrasado há X dias”. Ação de imprimir trocada para ícone `Printer`. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding/cores e Edge DevTools. |
| 2026-04-30 | Fichas/Ações | Em andamento | Ações da listagem reorganizadas para reduzir missclick: Visualizar, Imprimir, Editar e Marcar como entregue ficam diretas; Deletar foi movido para menu de três pontos junto de Visualizar/Imprimir/Editar, com destaque vermelho. Criado primitivo compartilhado `FloatingMenu` em `src/components/ui`. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, Edge DevTools e scans de encoding/cores. |
| 2026-04-30 | Priorizacao | Em andamento | Registrado que o foco volta para concluir a migracao funcional. Refinos de paridade fina ficam para depois, incluindo modulo proprio de impressao da ficha com CSS/PDF fiel ao legado e reconstrucao futura do quadro de producao/Kanban. |
| 2026-04-30 | Auth futuro | Planejado | Registrado login simples por username e PIN, com superadmin exclusivo para cadastro de usuarios e areas administrativas como catalogos. A implementacao fica para a etapa de seguranca/autorizacao depois da base funcional. |
| 2026-04-30 | Fechamento | Em andamento | Auditoria de corte funcional feita: Supabase `ready` com 188 clientes, 314 fichas, 1764 itens, 391 imagens e 213 catalogos; `typecheck`, `lint` e `build` passaram; Home, Fichas, Catalogos e Relatorios foram validados no DevTools. `vercel.json` foi limpo para remover headers/rewrites legados e deixar o App Router controlar as rotas. Pendencias restantes: auth/perfis, homologacao em producao e remocao final do legado. |
| 2026-04-30 | Auth/Supabase MCP | Em andamento | MCP Supabase reativado e apontando para o projeto com dados reais; migration remota `app_auth` aplicada via `apply_migration`. Query de verificacao confirmou enum `app_user_role` com `superadmin,operador`, tabelas `app_users`/`app_sessions`, RLS ativo e policies para `authenticated`. Decisao: manter a migration local `supabase/migrations/202604300001_app_auth.sql` como fonte versionada e usar MCP apenas para aplicar/verificar no Supabase remoto. Caveat: seed e teste real de login ainda dependem dos PINs de superadmin/operador. |
| 2026-04-30 | Auth/Usuarios | Em andamento | Seed inicial executado com `npm run seed:auth-user` para um superadmin e uma operadora; query MCP confirmou usuarios ativos com roles corretas sem expor PIN/hash. Criada rota superadmin `/usuarios` com listagem, cadastro e edicao de operadores em `src/features/usuarios/*`, guard em `src/app/layout.tsx` e item de navegacao restrito em `src/lib/navigation.ts`. Decisao: pagina administra apenas operadores; superadmin continua sem tela de autoedicao. Caveat: aguardando validacoes finais, teste real no navegador e scan de encoding. |
| 2026-04-30 | Auth/Usuarios | Feito | Login real validado no navegador local em `localhost:3000`: `/fichas` sem sessao redireciona para `/login?next=/fichas`, operador entra e volta para `/fichas`, nao ve `/catalogos` nem `/usuarios`, acesso direto a `/catalogos` volta para `/`, superadmin ve `/catalogos` e `/usuarios`, cadastro/edicao de operador pela tela funcionou e logout volta para `/login`. Ajustado logout para rota POST `/logout` com expiracao explicita do cookie e limpeza de `app_sessions`; operador temporario de teste foi removido e sessoes de teste foram limpas. Checks finais: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`, query MCP de RLS/policies e scan `MOJIBAKE_SCAN_OK`. Caveat: o cadastro de superadmins adicionais ainda nao tem UI propria. |
| 2026-04-30 | Auth/Usuarios UI | Em andamento | Tela de edicao de operador ajustada para nao listar outros usuarios enquanto edita: `/usuarios?edit=...` agora mostra titulo `Editando ...`, formulario isolado e link claro de volta para a lista. Grid do formulario foi separado em dados basicos e PIN para eliminar desalinhamento visual do campo `Novo PIN`. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Playwright em `/usuarios?edit=...`. Caveat: opcao de mostrar PIN atual exige decisao explicita de armazenar PIN reversivel/plaintext no banco; tentativa de aplicar migration foi bloqueada por risco de seguranca e nao foi mantida no codigo. |
| 2026-04-30 | Auth/Usuarios UI | Ajustado | Listagem e edicao de `/usuarios` voltaram a usar a mesma largura de conteudo; formulario de operador voltou ao grid de 3 colunas em desktop. Campo de PIN agora aceita somente numeros no client e no schema Zod, com botao de mostrar/ocultar o PIN digitado/autopreenchido no proprio input. Playwright confirmou largura igual entre lista/edicao, edicao sem tabela, 3 campos no grid e filtro `12ab34 -> 1234`. Checks: `npm run typecheck`, `npm run lint`, `npm run build`, scan `MOJIBAKE_SCAN_OK`. Caveat: mostrar PIN ja salvo continua dependendo de armazenar PIN reversivel/plaintext no banco. |
| 2026-04-30 | Homologacao | Em andamento | Criado `CHECKLIST_HOMOLOGACAO_NEXT.md` como checklist executavel por modulo para fechar a Fase 9. Plano principal atualizado para marcar auth/login/logout/perfis/rotas administrativas como concluidos, refletindo as validacoes ja registradas. Proxima frente objetiva: validar ambiente de producao Vercel, credenciais finais e fluxos principais usando o checklist. |
| 2026-04-30 | Reidratacao de dados | Feito incremental | Rodado `npm run migrate:legacy` em dry-run e depois `npm run migrate:legacy -- --apply` para puxar as fichas novas do legado. Supabase passou de 314 para 318 fichas, 1764 para 1791 itens, 391 para 396 imagens e 188 para 191 clientes. Confirmadas 4 fichas com `data_inicio=2026-04-30` nos legacy IDs 352, 353, 354 e 355. Caveat: isso nao substitui a migracao final de corte; enquanto o legado seguir recebendo fichas, novas reidratacoes podem ser necessarias. |
| 2026-04-30 | Homologacao/Filtros | Em andamento | Homologacao local nao destrutiva executada com sessao temporaria de superadmin: filtros de fichas por busca/status/evento/periodo, preview e PDF individual da ficha legacy 355, PDF operacional filtrado, busca e detalhe de cliente com historico, relatorio mensal e Excel filtrados. Ajustado `/relatorios` e `/relatorios/excel` para aceitarem `status` e `evento`, preservando os filtros em exportacoes. Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`. Caveat: ainda faltam fluxos mutaveis de criar/editar ficha, entregar ficha, CRUD de cliente/catalogo em homologacao final e validacao Vercel/producao. |
| 2026-04-30 | Homologacao/Mutaveis | Em andamento | Playwright headless com sessao temporaria de superadmin validou via UI real: criar cliente temporario, editar cliente, bloquear duplicidade por nome normalizado, criar item temporario de catalogo, editar/desativar item e confirmar que item desativado nao aparece no formulario de ficha. Limpeza final confirmou 0 clientes/catalogos temporarios restantes e contagens preservadas em 191 clientes e 213 catalogos. Caveat: a criacao/edicao de ficha com imagem e entrega/restauracao de ficha ainda ficam pendentes para rodada propria. |
| 2026-04-30 | Homologacao/Fichas mutaveis | Feito local | Playwright headless com sessao temporaria de superadmin validou via UI real: criar ficha temporaria com cliente, item e referencia de imagem Cloudinary existente; editar ficha preservando item e imagem; filtrar por numero da venda; marcar como entregue e confirmar `delivered_at`. A busca unificada de `/fichas` e `/fichas/pdf` foi ajustada para incluir `numero_venda`, lacuna encontrada na homologacao. Limpeza final confirmou 0 fichas/clientes temporarios restantes e contagens preservadas em 191 clientes, 318 fichas, 1791 itens e 396 imagens. Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`. Caveat: a validacao usou uma imagem Cloudinary ja existente como referencia compartilhada para evitar midia orfa; upload novo de arquivo no Cloudinary fica coberto pelo fluxo ja existente, mas ainda pode ser repetido em producao se necessario. |
| 2026-04-30 | Homologacao/Desktop mobile | Feito local | Ajustada a contencao responsiva de `/fichas` em `src/styles/globals.css`: `app-shell`, `app-main`, `fichas-view`, `fichas-view__header`, `fichas-toolbar`, `fichas-list-container` e `ui-table-wrap` agora permitem encolhimento correto e mantem o scroll da tabela dentro do componente. Playwright headless validou `/`, `/fichas?status=pendente`, `/fichas/nova`, `/clientes?termo=Fundo`, `/catalogos?tipo=produto`, `/usuarios` e `/relatorios?periodo=mes&status=pendente&evento=true` em 1366x768 e 390x844: todas 200, sem erros de console e sem overflow horizontal do documento; tempos locais ficaram entre 672ms e 736ms. Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`. Decisao: plano de rollback definido no proprio plano; producao/Vercel, credenciais finais, backup e dominio continuam pendentes antes do corte real. |
| 2026-05-01 | Producao/Prontidao | Bloqueado por Vercel | Criado `scripts/check-production-readiness.mjs` e script `npm run prod:check` para auditar envs runtime de producao, envs de corte Turso, higiene de secrets, link/CLI Vercel, `vercel.json`, contagens Supabase e usuarios finais. Resultado local: Supabase, Cloudinary, Turso, `.env` gitignored, config Vercel e usuarios passaram; bloqueadores restantes sao `.vercel/project.json` ausente e CLI `vercel` indisponivel neste checkout. Checks: `node --check scripts/check-production-readiness.mjs`, `npm run lint`, scan de mojibake nos arquivos tocados. Decisao: nao marcar validacao Vercel/producao ate linkar projeto ou conferir pela Dashboard. |
| 2026-05-01 | Producao/Vercel preview | Ajustado local | O deploy do commit `6077dcf` falhou em `/_global-error` depois de avisar que `NODE_ENV` estava com valor nao padrao na Vercel. `npm run build` passou localmente no mesmo commit, entao o build agora usa `scripts/build-next.mjs` para forcar `NODE_ENV=production` no processo do Next. Checks: `node --check scripts/build-next.mjs`, `npm run lint`, `npm run build`; simulacao com `NODE_ENV=preview` removeu o warning, mas ainda bateu em `spawn EPERM` local. Validacao Vercel segue aberta ate novo preview passar; remover `NODE_ENV` customizado no Dashboard continua recomendado. |
| 2026-05-01 | Producao/Vercel | Feito local | Workspace linkado ao projeto existente `lucascellis-projects/fichaprimalhas`; `npm run prod:check` passou como `ready-for-production-cutover`; `npx vercel env ls` confirmou envs de Supabase, Cloudinary e Turso no projeto; `npx vercel build --prod` passou sem warnings bloqueantes. Arquivos alterados: `.gitignore`, `eslint.config.mjs`, `scripts/check-production-readiness.mjs`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Caveat: ainda nao foi feito deploy/publicacao nem troca de dominio; `NODE_ENV` customizado continua recomendado para remocao no Dashboard antes do corte. |
| 2026-05-01 | Producao/Vercel | Ajustado | Preview Vercel `dpl_JBvEPrN4oGiskCDCXAaPoBJHEHkj` ficou `READY`, mas `/login` falhou porque o Project Settings ainda estava como `express` e o output usou `server.js`/`@libsql/client` do legado. `vercel.json` agora define `"framework": "nextjs"` para sobrescrever o preset legado e forcar deploy pelo App Router. Arquivos alterados: `vercel.json`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. |
| 2026-05-01 | Producao/Vercel | Ajustado | Preview remoto Next `dpl_9CVReyGZPu8rbyGZXfsu7C5fCQ9U` compilou, mas avisou que `.env` foi detectado no pacote enviado. Criado `.vercelignore` para bloquear `.env`, `.env.*`, `.next`, `.vercel`, `node_modules`, logs e `tsconfig.tsbuildinfo` nos proximos deploys. Arquivos alterados: `.vercelignore`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. |
| 2026-05-01 | Producao/Vercel | Feito preview | Preview limpo `dpl_7W76QvxmaASAyEs3e7pvSSnzNwhn` publicado em `https://fichaprimalhas-jje6nwgma-lucascellis-projects.vercel.app`. Build remoto compilou como Next/App Router sem aviso de `.env`; `vercel inspect` mostrou funcoes Next, `vercel curl /login` retornou a tela de login e `vercel logs --level error --since 10m` nao encontrou erros. `scripts/check-production-readiness.mjs` agora tambem valida `"framework": "nextjs"` no `vercel.json`. |
| 2026-05-01 | Fase 10 | Em andamento | Pre-corte validado sem publicar producao: `npm run prod:check` retornou `ready-for-production-cutover`, `npm run supabase:check` retornou `ready`, preview Vercel limpo sem erros recentes e `npm run migrate:legacy` dry-run confirmou legado e Supabase empatados em 318 fichas, 1791 itens e 396 imagens. Criado `npm run backup:cutover`, gerando snapshot local em `data/backups/` com dados legados Turso e tabelas operacionais Supabase; pasta ignorada no Git para nao versionar dados de cliente. Caveat: congelamento do legado, deploy de producao e dominio continuam pendentes. |
| 2026-05-01 | Fase 10 | Bloqueio de corte | `vercel inspect fichaprimalhas.vercel.app` confirmou que producao ainda aponta para o deployment Express legado `dpl_Gvpsn4Qg2dFxqFbHnqe86AozjfwF`; `vercel project inspect fichaprimalhas` ainda mostra Framework Preset `Express` no Project Settings. O `vercel.json` versionado deve sobrescrever o framework nos proximos deploys, mas nao foi feito `vercel --prod` porque ainda falta congelar o legado e confirmar credenciais finais/domino. |
| 2026-05-01 | Polimento/Fichas | Em andamento | Formulario de ficha recebeu primeira fatia de paridade fina: drag/drop para reordenar produtos e imagens via biblioteca DnD anterior, botao `Ordenar por tamanho`, Ctrl+V/drop para adicionar imagens, editor rico simples em observacoes e botao `Auto-preencher`. O auto-preenchimento foi aproximado da regra legada com texto em caixa alta, separadores `/` e blocos de tecido, manga, gola, bolso, filete, faixa, personalizacao e nomes/numeros. A criacao e edicao ja recebiam catalogos/datalists por `listCatalogOptionsForFichaForm()`. Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. Caveat: falta validar visualmente com sessao autenticada e a impressao PDF fiel ao legado continua aberta. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Drag/drop de produtos e imagens refinado para ficar mais fluido e legivel: o destino de drop passou a expor estado visual, listas destacam a area ativa, cards arrastados recebem elevacao, imagens usam largura de 1/4 do painel em desktop com minimo responsivo, controles de imagem ficam em uma barra propria sem sobrepor badge e imagens novas entram com descricao vazia. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Card de imagem inteiro virou handle de arraste da biblioteca DnD anterior, preservando edicao do input e botao remover sem iniciar drag. A grade agora segue a regra visual por quantidade: 1 imagem ocupa 1/3 da largura, 2 ocupam 1/2 cada, 3 ocupam 1/3 cada e 4 ocupam 1/4 cada, com minimos responsivos. O input de descricao ganhou estilo do sistema e placeholder especifico. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Corrigido estouro visual durante arraste de imagens com largura maxima aplicada ao item em drag. Regra visual revisada: 1 imagem agora ocupa 1/2 da largura; 2 imagens ocupam 1/2 cada; 3 ocupam 1/3 cada; 4 ocupam 1/4 cada. Topo do card mostra `Imagem N`, badge `Pendente` fica no topo e o botao remover ganhou hover/focus vermelho. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Clone de arraste das imagens voltou a manter o mesmo formato do card em repouso: removido override manual de largura/preview durante drag e fixada a largura do card pela variavel `--image-card-width`, deixando a biblioteca DnD anterior preservar as dimensoes medidas. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Preview da imagem travado por quantidade com `--image-preview-height` e `background-size: contain`, impedindo que a imagem escale e aumente o card durante o arraste. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Largura do card de imagem tambem foi travada durante o arraste: `onDragStart` mede o card em pixels e aplica `width/minWidth/maxWidth` no item enquanto ele esta em drag, evitando que percentuais sejam recalculados contra o viewport. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Largura travada antes do primeiro frame de arraste: substituido `onDragStart` por medicao continua com `ResizeObserver`, armazenando a largura real de cada card e aplicando `width/minWidth/maxWidth` no clone durante drag. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Corrigida largura fina do clone: a largura nao e mais medida no card, e sim calculada pela largura da grade (`ResizeObserver`) e quantidade de imagens, aplicando o mesmo valor em pixels em repouso e durante drag. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-01 | Polimento/Fichas DnD | Ajustado | Inicio do arraste estabilizado: handle de produto deixou de ser `<button>` dentro do formulario e virou handle nao-interativo com `role="button"`; handles/cards receberam `touch-action` e `user-select` adequados, e campos/botoes dentro do card de imagem param `pointerdown` para nao disputar com o sensor de drag. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-02 | Polimento/Fichas Form | Ajustado estrutural | Instalados `react-hook-form` e `@hookform/resolvers`; `src/features/fichas/ficha-form.tsx` passou a usar `useForm`, `useWatch` e `useFieldArray` para produtos, imagens, observacoes e campos condicionais, mantendo Server Action e payload `itensJson`/`imagensJson` como contrato de persistencia. Reorders agora usam `move()` do field array. Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint` e `npm run build`. Caveat: demais formularios ficam para etapa futura. |
| 2026-05-02 | Planejamento/Bibliotecas | Planejado | Conteudo de `plugins-recomendados.md` incorporado ao plano como trilha de adocao para reduzir hardcode: `nuqs`, `date-fns` e `sonner` antes do corte quando as frentes forem tocadas; `@tanstack/react-table` e `react-day-picker` na homologacao/listagens; `@tanstack/react-query`, `recharts`, `react-resizable-panels` e `zustand` no Dashboard/Kanban; Tiptap na paridade fina do editor de observacoes. Decisao: nao instalar sem uso no mesmo ciclo; cada biblioteca deve substituir uma implementacao manual ou desbloquear item planejado. Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. |
| 2026-05-02 | Polimento/Fichas UI | Ajustado | Instalado e iniciado uso de `react-day-picker` no formulario de ficha para datas de inicio/entrega, preservando envio `yyyy-mm-dd` para as Server Actions. Lista de produtos ficou mais parecida com tabela, destaque da secao ficou verde, destaque de imagens ficou cinza, botao `Ordenar por tamanho` foi movido para a direita acima de `Acoes` e o ordenamento automatico recebeu feedback visual. Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint` e `npm run build`; checagem autenticada em `/fichas/nova` feita com usuario operador de teste. |
| 2026-05-02 | Polimento/Fichas Produtos | Ajustado | Corrigido `CustomDatalist` dentro da tabela de produtos para nao ficar cortado pelo container; zebra/hover da tabela foram suavizados; botoes de copiar/remover receberam `Tooltip` compartilhado; hover/focus do remover agora usa danger/vermelho. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com DevTools em `/fichas/nova`, `npm run typecheck` e `npm run lint`. |
| 2026-05-02 | Polimento/Fichas Datalists | Ajustado | Criado loader `listFichaFormOptions()` para alimentar o formulario com referencias reais: catalogos de `catalog_items`, clientes de `clientes` e vendedores distintos de `fichas`. `Nome do Cliente` e `Vendedor` passaram a usar `CustomDatalist`; campos tecnicos nao caem mais no fallback generico quando as opcoes do Supabase foram carregadas. Arquivos alterados: `src/features/fichas/form-options.ts`, `src/app/fichas/nova/page.tsx`, `src/app/fichas/[id]/page.tsx`, `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com DevTools em `/fichas/nova`, `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-02 | Polimento/Fichas Observacoes | Ajustado | Campo `Cor da sublimacao` agora aparece somente quando `Personalizacao` e exatamente `sublimacao`. Auto-preenchimento de observacoes passou a rodar em tempo real, seguindo a regra legado rastreada em `public/js/main.js::initObservacoesAutoFill()`, com protecao para nao sobrescrever texto editado manualmente. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com DevTools em `/fichas/nova`, `npm run typecheck`, `npm run lint` e `npm run build`. |
| 2026-05-02 | Polimento/Fichas Impressao | Feito inicial | Botao individual de imprimir deixou de apontar para o PDF operacional e passou a abrir `/fichas/[id]/imprimir`. Criado modulo proprio `PrintFicha`, com montagem baseada em `public/ficha.html`, `public/js/main.js::gerarVersaoImpressao()` e classes/CSS de `public/css/style.css` para `#print-version`, produtos, especificacoes, observacoes e imagens. Arquivos alterados: `src/app/fichas/[id]/imprimir/page.tsx`, `src/features/fichas/print-ficha.tsx`, `src/features/fichas/print-on-load.tsx`, `src/features/fichas/print-page-actions.tsx`, `src/features/fichas/ficha-row-actions.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com DevTools em `/fichas/[id]/imprimir?autoprint=0`, `npm run typecheck`, `npm run lint` e `npm run build`. Caveat: PDF operacional `/fichas/pdf` continua separado para listagens. |
| 2026-05-02 | Polimento/Fichas Impressao | Feito modal | Instalados `@radix-ui/react-dialog` e `@radix-ui/react-alert-dialog`; o `Modal` compartilhado passou para Radix Dialog e a exclusao de ficha passou a usar AlertDialog. A impressao da listagem agora abre `/fichas?print=<id>` em modal com iframe para `/fichas/[id]/imprimir?autoprint=0`, sem nova guia; a pagina de edicao ganhou botao `Imprimir ficha` com modal `?print=1`. A logica de cores da impressao foi alinhada ao legado de `public/js/main.js::gerarVersaoImpressao()`, colorindo por produto ou por descricao quando ha descricoes distintas e usando catalogo/token de cores mais amplo. Arquivos alterados: `package.json`, `package-lock.json`, `src/components/ui/*`, `src/app/fichas/*`, `src/features/fichas/*`, `src/styles/globals.css`, `src/styles/tokens/colors.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge DevTools em `/fichas?print=<id>` e `/fichas/<id>?print=1`, sem erros de console e sem abrir nova aba. |
| 2026-05-02 | Polimento/Fichas Impressao | Ajustado | Corrigido empilhamento/layout do modal apos a troca para Radix: como `Overlay` e `Content` sao irmaos no portal, o CSS deixou de centralizar pelo overlay e `.modal-content` passou a ser `position: fixed` centralizado com `z-index` acima de `.modal-overlay`. Validado com Edge DevTools em `/fichas/<id>?print=1`, `elementFromPoint` apontando para o frame/conteudo e screenshot nitido do modal; `npm run typecheck` e `npm run lint` passaram. |
| 2026-05-02 | Polimento/Fichas Impressao | Ajustado fluxo | Revisada a separacao entre preview e impressao: a acao de preview/visualizar da listagem agora abre a previa de impressao em modal (`/fichas?print=<id>`), enquanto a acao Imprimir navega direto para `/fichas/[id]/imprimir`, sem modal e sem nova guia. Na edicao, o botao `Imprimir ficha` tambem aponta direto para `/fichas/[id]/imprimir`; o modal `?print=1` foi removido dessa pagina. Validado com Edge DevTools na listagem e na edicao; `npm run typecheck`, `npm run lint` e `npm run build` passaram. |
| 2026-05-02 | Polimento/Fichas Impressao | Ajustado preview | A previa de impressao em modal agora carrega `/fichas/[id]/imprimir?autoprint=0&embed=1`, com layout embed sem `AppShell` e `PrintFicha` em modo documento: sem sidebar, sem toolbar, sem botoes e sem auto-print. O modal contem apenas o iframe da ficha imprimivel e o botao X do proprio modal. Validado com Edge DevTools: iframe sem `.app-frame`, `.app-sidebar`, `.print-page-toolbar`, `#normal-version`, links ou botoes; `#print-version` presente. `npm run typecheck`, `npm run lint` e `npm run build` passaram. |
| 2026-05-02 | Polimento/Fichas Impressao | Simplificado | Fluxo simplificado conforme decisao final: `PrintFicha` voltou a ser componente puro da ficha imprimivel, sem `PrintOnLoad`, shell, toolbar, botoes ou iframe. A rota `/fichas/[id]/imprimir` renderiza `PrintOnLoad` + `PrintFicha`. O modal de previa em `/fichas?print=<id>` busca a ficha no servidor e renderiza o mesmo `PrintFicha` diretamente dentro do modal. Removidos `FichaPrintDialog`, `print-page-actions`, parametro `embed=1` e o header `x-ficha-print-embed`. Validado com Edge DevTools: modal sem iframe e com `#print-version`; rota `/imprimir?autoprint=0` com `#print-version`, sem toolbar e sem botoes dentro da ficha. `npm run typecheck`, `npm run lint` e `npm run build` passaram. |
| 2026-05-02 | Polimento/Fichas Impressao | Ajustado experiencia | A previa voltou a ter moldura de modal com header, container visual, botao de imprimir e estado de loading via `Suspense`, mantendo `PrintFicha` puro dentro do corpo. O botao Imprimir da listagem e da edicao deixou de navegar para `/imprimir`; agora dispara a rota tecnica em iframe oculto e preserva a pagina atual. A animacao do modal foi trocada para scale central (`modalScaleIn`) e overlay sem deslocamento. Arquivos alterados: `src/app/fichas/page.tsx`, `src/components/ui/modal.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/features/fichas/print-trigger-button.tsx`, `src/features/fichas/ficha-row-actions.tsx`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge DevTools: modal com header/container e `#print-version`, sem iframe na previa; botoes de imprimir criam apenas `iframe.print-trigger-frame`, disparam `print()` e mantem a URL em `/fichas` ou `/fichas/[id]`. |
| 2026-05-02 | Polimento/Fichas Impressao | Refinado modal | Removida a troca de modal entre loading e conteudo: `/fichas?print=<id>` agora renderiza um unico `Modal` fixo com `FichaPrintPreviewShell`, e apenas o corpo alterna entre loading, erro e `PrintFicha`. A moldura ficou com altura fixa, header estavel e rolagem no corpo. Criado token `--color-print-paper` para manter o fundo da ficha imprimivel branco tambem na previa/tema escuro. Arquivos alterados: `src/app/fichas/page.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/styles/globals.css`, `src/styles/tokens/colors.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge DevTools: `modalCount=1`, `headerCount=1`, `bodyCount=1`, `iframeCount=0`, `paperBackground=rgb(255, 255, 255)`. |
| 2026-05-02 | Polimento/Fichas Impressao | Ajustado nova ficha | O formulario em `/fichas/nova` voltou a exibir o botao `Imprimir ficha` na area de acoes. Como a ficha ainda nao possui `id`, o controle fica desabilitado com `aria-label`/`title` orientando a salvar antes da impressao, enquanto a edicao continua usando `PrintTriggerButton`. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint` e Edge DevTools em `/fichas/nova`: botao presente, desabilitado, ao lado de `Salvar ficha`. |
| 2026-05-02 | Polimento/Fichas Impressao | Liberado rascunho | A impressao de ficha nao salva foi liberada em `/fichas/nova`: o botao `Imprimir ficha` agora monta uma `FichaDetail` temporaria a partir do estado atual do formulario, renderiza `PrintFicha` em `draft-print-root` via portal e chama `window.print()` sem Supabase, sem rota `/imprimir` e sem mudar a URL. Imagens locais pendentes usam `previewUrl`; fichas sem id saem como `Ficha #rascunho`. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge DevTools em `/fichas/nova`: botao habilitado, `draft-print-root` com `#print-version`, `window.print()` chamado e URL preservada. |
| 2026-05-03 | Fichas/Paginacao | Corrigido | Bug: abrir preview da listagem voltava para pagina 1. Causa: `getFichaPaginationParams()` em `fichas-overview.tsx` nao incluia `page`, entao o param sumia ao montar o href do preview e ao fechar o modal o sistema voltava para pagina 1. Corrigido adicionando `page: filters.page && filters.page > 1 ? String(filters.page) : undefined` no objeto retornado pela funcao, preservando a pagina corrente nos hrefs de preview, impressao e returnTo. Arquivo alterado: `src/features/fichas/fichas-overview.tsx`. |
| 2026-05-03 | Polimento/Fichas Impressao | Implementado raster | Instalados html2canvas, jsPDF e sonner; modificados print-on-load.tsx, ficha-print-preview-modal.tsx, ficha-form.tsx, print-trigger-button.tsx, toast-provider.tsx e layout.tsx para capturar #print-version como imagem JPEG rasterizada (qualidade 0.9, scale 1.6), ajustar largura para 794px (A4) na captura para maximizar largura, calcular fitScale com margens de 6mm, posicionar no topo (offsetY=6) no PDF A4 e imprimir via iframe oculto (1x1px, visibility hidden) com blob URL, frameWindow.print() sem autoPrint para evitar duplicação, cleanup após 10s fixo (afterprint não confiável no Chrome); ajustado cleanup do iframe externo do PrintTriggerButton para 10s; refatorado ToastProvider para usar sonner completamente, removendo implementação customizada; adicionado toast "Carregando Impressão" com spinner via sonner na parte inferior central, dispara ao clicar imprimir (PrintTriggerButton para listagem, handlePrint para modal/draft) e desaparece após 10s. Arquivos alterados: package.json, package-lock.json, src/app/layout.tsx, src/features/fichas/print-on-load.tsx, src/features/fichas/ficha-print-preview-modal.tsx, src/features/fichas/ficha-form.tsx, src/features/fichas/print-trigger-button.tsx, src/components/ui/toast-provider.tsx. Validado com npm run typecheck, npm run lint e npm run build. |
| 2026-05-04 | Polimento/Fichas Impressao/Notificacoes | Limpeza estrutural | Revisado o lote recente de impressao/notificacoes para remover duplicacao e sujeira operacional. Criado `src/features/fichas/print-pdf.ts` como fonte unica para rasterizacao + PDF + iframe de impressao; `print-on-load.tsx` e `ficha-print-preview-modal.tsx` passaram a reutilizar esse fluxo, com restauracao de estilos temporarios, timeout de carga e revoke do blob URL. `print-trigger-button.tsx` saiu de `sonner` direto e voltou a usar `useToast`, com estado/loading/erro consistentes e cleanup mais curto do iframe tecnico. `toast-provider.tsx` teve o contrato corrigido (`ToastId` agora aceita `string | number`) e passou a enviar `title`/`description` de forma nativa para o Sonner, sem concatenacao manual. Tambem foi removido de `src/styles/globals.css` o bloco morto do toast antigo (`.toast-region`, `.toast__*`, `@keyframes` nao usados). Arquivos alterados: `src/features/fichas/print-pdf.ts`, `src/features/fichas/print-on-load.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/features/fichas/print-trigger-button.tsx`, `src/components/ui/toast-provider.tsx`, `src/lib/toast.ts`, `src/styles/globals.css`. Decisao: manter Sonner como engine visual, mas centralizar o contrato do app no provider/API interna para evitar novo acoplamento direto nas features. Caveat: a impressao de rascunho em `/fichas/nova` continua no fluxo proprio via `window.print()`, sem entrar neste helper novo. |
| 2026-05-04 | UI/Notificacoes Next | Sonner direto | Ajustada a direcao final do modulo: o App Router deixou de usar a API customizada de toast. Consumidores Next (`clientes`, `catalogos`, `usuarios`, `fichas`, preview/impressao) agora importam `toast` diretamente de `sonner`; `src/app/layout.tsx` removeu o wrapper `ToastProvider`; `src/components/ui/toast-provider.tsx` e `src/lib/toast.ts` foram removidos. Decisao: manter o shim legado `window.toast` apenas em `public/` enquanto o legado existir, mas no Next a fonte unica passa a ser Sonner direto. Arquivos alterados: `src/app/layout.tsx`, `src/components/ui/index.ts`, `src/features/usuarios/usuario-form.tsx`, `src/features/clientes/cliente-form.tsx`, `src/features/catalogos/catalogo-form.tsx`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-row-actions.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/features/fichas/print-trigger-button.tsx`, removidos `src/components/ui/toast-provider.tsx` e `src/lib/toast.ts`. |
| 2026-05-04 | Relatorios/Fichas PDF | Personalizado semanal | O PDF de `/fichas/pdf` ganhou modo especializado quando os filtros batem exatamente com os atalhos `Esta semana` ou `Proxima semana`. Nesses modos, a rota busca tambem as fichas atrasadas, prioriza esse bloco no topo, separa o restante por tipo de personalizacao e usa layout A4 paisagem compacto com cabecalho operacional, contadores, colunas `Cliente`, `Vendedor`, `Inicio`, `Entrega` e `Status`, badge visual de status e caixa vazia para anotacao manual. O titulo, o miolo do documento e o nome do arquivo se adaptam ao recorte semanal atual ou seguinte. Para suportar isso, `FichaListItem` e consultas de ficha passaram a incluir `data_inicio`. Fora desses recortes, o PDF operacional antigo continua disponivel como fallback. Arquivos alterados: `src/app/fichas/pdf/route.ts`, `src/features/fichas/operational-pdf.ts`, `src/features/fichas/data.ts`, `src/features/clientes/data.ts`. Validado com `npm run typecheck`, `npx eslint` dirigido e `npm run build`. |
| 2026-05-04 | UX/Impressao e Loading | Ajustado | O toast `Impressao` da listagem deixou de fechar no `iframe.onload` e agora espera um sinal explicito vindo da rota `/fichas/[id]/imprimir` quando o `print()` e disparado; se esse sinal nao chegar, entra apenas um timeout de seguranca mais longo. Em paralelo, os carregamentos visuais que usavam spinner passaram a usar barras animadas: loading global, estados pending em botoes e loading da previa de impressao. Arquivos alterados: `src/features/fichas/print-trigger-button.tsx`, `src/features/fichas/print-on-load.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/styles/globals.css`, `src/app/loading.tsx`. Validado com `npm run typecheck` e `npx eslint` dirigido nos arquivos TS/TSX tocados; `globals.css` ficou fora do lint por ausencia de config CSS no comando atual. |
| 2026-05-04 | UX/Loading Next | Refinado visual | O loading do Sonner passou a usar barra animada customizada em vez do spinner padrao, via `icons.loading` no `Toaster`. A tela `src/app/loading.tsx` tambem foi redesenhada para um painel compacto com gradiente, barra de progresso animada e skeleton lines, aproximando a leitura visual do placeholder legado sem reintroduzir CSS legado bruto. Arquivos alterados: `src/app/layout.tsx`, `src/app/loading.tsx`, `src/components/ui/loading-bar.tsx`, `src/styles/globals.css`. Validado com `npm run typecheck`. |
| 2026-05-04 | Relatorios/Fichas PDF | Ajuste de impressao economica | O PDF semanal foi refinado para gastar menos tinta sem perder leitura operacional: removido o fundo vermelho das linhas/secoes de atrasados, badges de status passaram a usar apenas contorno + texto colorido, cabecalho/cards/secoes ficaram majoritariamente em fundo branco com linhas de destaque, e a largura da coluna `Cliente` foi ampliada para acomodar nomes maiores. Arquivo alterado: `src/features/fichas/operational-pdf.ts`. Validado com `npm run typecheck` e `npx eslint src/features/fichas/operational-pdf.ts`. |
| 2026-05-04 | UX/Loading Next | Simplificado minimalista | O loading foi simplificado conforme a preferencia final: sem gradientes, sem paineis, sem textos e sem skeletons. `src/app/loading.tsx` agora renderiza apenas uma barra azul primaria centralizada; no Sonner, o estado `loading` deixou de usar a barra como icone e passou a exibir uma faixa azul no rodape do toast, preenchendo de ponta a ponta em loop. Arquivos alterados: `src/app/layout.tsx`, `src/app/loading.tsx`, `src/components/ui/loading-bar.tsx`, `src/styles/globals.css`. Validado com `npm run typecheck` e `npx eslint src/app/layout.tsx src/app/loading.tsx src/components/ui/loading-bar.tsx`. |
| 2026-05-04 | Relatorios/Fichas PDF + UX/Toast | Correcao visual | Corrigidos dois acabamentos: no PDF semanal, os grupos deixaram de pular inteiros para a pagina seguinte e agora quebram por linhas, reduzindo o espaco branco entre paginas; tambem foram removidas as linhas decorativas que estavam cruzando rotulos/titulos e gerando artefatos visuais. No toast de loading, a faixa inferior trocou a animacao por um preenchimento linear via `clip-path`, evitando o salto visual no ultimo ciclo. Arquivos alterados: `src/features/fichas/operational-pdf.ts`, `src/styles/globals.css`. Validado com `npm run typecheck` e `npx eslint src/features/fichas/operational-pdf.ts src/app/layout.tsx src/app/loading.tsx src/components/ui/loading-bar.tsx`; CSS ficou fora do lint dirigido. |
| 2026-05-04 | Relatorios/Fichas PDF | Higiene de texto pt-BR | Corrigidos textos quebrados e fora do padrao pt-BR nos geradores de PDF. `src/features/fichas/operational-pdf.ts` e `src/features/fichas/print-pdf.ts` foram regravados em UTF-8 limpo; `src/features/fichas/print-ficha.tsx` teve os rotulos, titulos e mensagens do documento imprimivel normalizados (`Técnica`, `Emissão`, `Início`, `Observações`, `Personalização`, `Não`, `números`, etc.). Validado com `npm run typecheck`, `npx eslint src/features/fichas/operational-pdf.ts src/features/fichas/print-pdf.ts src/features/fichas/print-ficha.tsx` e varredura `rg` sem restos de mojibake nesses arquivos. |
| 2026-05-04 | Fichas/Observacoes | Corrigido sentido de digitacao | O editor rico de `Observações` em `src/features/fichas/ficha-form.tsx` estava sem direção explícita no `contentEditable`, o que permitia ao navegador inferir um fluxo visual incorreto e fazer a digitação crescer "ao contrário". A superfície `rich-editor__surface` em `src/styles/globals.css` agora fixa `direction: ltr`, `text-align: left` e `unicode-bidi: plaintext`, e o elemento recebeu `dir="ltr"` + `lang="pt-BR"` para estabilizar a entrada em português. Caveat: a correção mira o editor Next da ficha; o legado em `public/` não foi alterado. |
| 2026-05-04 | Fichas/Observacoes | Corrigido cursor invertendo texto | Ajuste complementar e definitivo no editor rico de `Observações`: a causa real do texto invertido não era apenas direção visual, mas o `contentEditable` controlado por `dangerouslySetInnerHTML={{ __html: observacoes }}` a cada render. Isso fazia o React reescrever o DOM em toda tecla e recolocar o cursor no começo, produzindo `etset` ao digitar `teste`. Em `src/features/fichas/ficha-form.tsx`, o binding direto foi removido e a sincronização do HTML passou para um `useEffect` que só atualiza o editor quando o conteúdo externo realmente mudou. Validado com `npx eslint src/features/fichas/ficha-form.tsx` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Filtros e Busca | Expandido | A busca de `/fichas` foi ampliada para cobrir nome, alias, tecido (`material`), tipo de personalização, número da venda e vendedor sem sensibilidade a acentos, underscores e separadores. Para manter paginação e PDF consistentes, a consulta passou a usar a coluna gerada `busca_normalizada`, criada pela migration `supabase/migrations/202605040001_fichas_busca_normalizada.sql` com `unaccent` + `pg_trgm`. Na UI, `src/features/fichas/fichas-filter-toolbar.tsx` agora impede submit GET acidental ao pressionar Enter, preservando os parâmetros já ativos; `src/features/fichas/fichas-overview.tsx` também passou a manter `busca` e `evento` ao usar os atalhos de período. Arquivos alterados: `src/features/fichas/data.ts`, `src/features/fichas/fichas-filter-toolbar.tsx`, `src/features/fichas/fichas-overview.tsx`, `supabase/migrations/202605040001_fichas_busca_normalizada.sql`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Caveat: a busca sem acentos depende da migration nova estar aplicada no banco. |
| 2026-05-04 | Fichas/Busca Normalizada | Corrigida migration SQL | O erro `generation expression is not immutable` mostrou que a primeira versão da migration não era compatível com Postgres porque `unaccent(...)` não pode ficar dentro de coluna `generated always as (...) stored`. `supabase/migrations/202605040001_fichas_busca_normalizada.sql` foi reescrita para usar coluna normal `busca_normalizada`, função `normalize_search_text(...)` `stable`, trigger `before insert or update` para sincronização automática e `update` de backfill para os registros já existentes. Resultado: a migration pode ser executada no Supabase SQL Editor/CLI sem depender de expressão gerada imutável. |
| 2026-05-04 | Fichas/Filtros e Busca | Adicionado fallback | Após o erro `column fichas.busca_normalizada does not exist`, `src/features/fichas/data.ts` passou a tentar primeiro a busca nova por `busca_normalizada` e, se a coluna ainda não existir no banco, refaz automaticamente a mesma consulta com o filtro legado por colunas (`cliente_nome_snapshot`, `cliente_auxiliar`, `material`, `arte`, `numero_venda`, `vendedor`). Resultado: a tela volta a funcionar imediatamente mesmo antes de aplicar a migration; a busca sem acentos continua condicionada à migration `202605040001_fichas_busca_normalizada.sql`. Validado com `npx eslint src/features/fichas/data.ts` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Filtros e Busca | Expandido fallback de acentos | Como o banco ainda pode estar sem `busca_normalizada`, o fallback legado em `src/features/fichas/data.ts` foi reforçado para gerar variantes acentuadas do termo digitado antes de montar o `or(...ilike...)`. Isso cobre casos como `jhone` encontrando `Jhonê`, além de outros nomes/campos com acentos comuns em pt-BR, mesmo sem a migration aplicada. Validado com `npx eslint src/features/fichas/data.ts` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Filtros e Busca | Travado sem fallback | Após a confirmação de que a migration de `busca_normalizada` entrou com sucesso, o fallback legado foi removido de `src/features/fichas/data.ts`. A listagem `/fichas` e o PDF operacional agora consultam exclusivamente `busca_normalizada`, o que garante que os testes atuais validem o caminho indexado real da migration em vez de mascarar problemas com `ilike` por colunas. Validado com `npx eslint src/features/fichas/data.ts` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Atrasadas Acoes | Ajustado CTA principal | Na rota filtrada ` /fichas?status=atrasado `, a coluna de ações agora troca o conjunto padrão por um único botão verde `Marcar como entregue`, usando o mesmo submit de entrega existente e ocupando exatamente a faixa visual dos quatro botões de ação padrão. A variante foi isolada em `src/features/fichas/ficha-row-actions.tsx`, acionada por `src/features/fichas/fichas-overview.tsx` apenas quando `currentFilters.status === "atrasado"`, e estilizada em `src/styles/globals.css` com largura fixa de `162px` para casar com `4 x 36px + 3 gaps de 6px`. Validado com `npx eslint src/features/fichas/ficha-row-actions.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Atrasadas Acoes | Refinado layout e hover | A variante de atrasadas foi ajustada para manter o último botão do menu de contexto no lugar, enquanto o CTA `Marcar como entregue` ocupa apenas os quatro primeiros slots. Em `src/features/fichas/ficha-row-actions.tsx`, o modo `fullDeliverButton` voltou a renderizar `FloatingMenu` ao lado do formulário de entrega. Em `src/styles/globals.css`, o botão passou do verde sólido para o estado padrão claro da referência (`background: var(--color-success-bg)`, texto/contorno verdes) e ganhou hover invertido com fundo verde sólido e texto claro. Validado com `npx eslint src/features/fichas/ficha-row-actions.tsx` e `npm run typecheck`. |
| 2026-05-04 | UX/Loading Next | Removido skeleton remanescente | O padrão de carregamento foi consolidado conforme decisão final: spinner para itens/botões em loading, barra para toasts e transição entre páginas, skeleton nunca. O único skeleton ainda ativo no App Router estava em `src/features/fichas/ficha-print-preview-modal.tsx`; ele foi removido junto do CSS correspondente em `src/styles/globals.css`, deixando a prévia de impressão apenas com mensagem + `button-spinner`. Verificado com `rg -n "skeleton" src` sem resultados, além de `npx eslint src/features/fichas/ficha-print-preview-modal.tsx` e `npm run typecheck`. |
| 2026-05-04 | Fichas/PDF Export | Travado sem resultados + loading | O botão `Exportar PDF` em `/fichas` agora recebe o total real da consulta: quando `result.kind !== "ok"` ou `result.total === 0`, ele fica desabilitado para evitar download inútil. Quando existe resultado, o clique troca o rótulo para `Exportando`, mostra `button-spinner` e dispara `window.location.assign(pdfHref)`, retornando ao estado normal por timeout de segurança. Implementado em `src/features/fichas/fichas-filter-toolbar.tsx` e conectado a `result.total` em `src/features/fichas/fichas-overview.tsx`. Validado com `npx eslint src/features/fichas/fichas-filter-toolbar.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck`. |
| 2026-05-04 | Relatorios/Fichas PDF | Operacional padronizado | O PDF padrao de Fichas operacional deixou de usar o placeholder textual e passou a reaproveitar a mesma base visual dos modos Esta semana e Proxima semana. Em src/features/fichas/operational-pdf.ts, o fluxo normal agora monta cabecalho, cards de resumo e secoes paginadas agrupadas por data de entrega, com grupos internos por personalizacao e destaque em tom de alerta quando houver atrasadas naquela data. Decisao: manter a mesma leitura compacta e a mesma tabela operacional ja usada nos relatorios semanais, em vez de sustentar um terceiro layout independente. Caveat: o fallback textual antigo ficou apenas como residuo interno sem uso, pendente de uma limpeza posterior de encoding no arquivo. |
| 2026-05-04 | Relatorios/Fichas PDF | Limpeza UTF-8 concluida | `src/features/fichas/operational-pdf.ts` foi higienizado em UTF-8 e teve removidos os restos do fallback textual antigo (`buildOperationalLines`, `createSimpleTextPdf` e helpers associados), deixando o arquivo com um unico caminho ativo para o PDF operacional. Tambem foram normalizados os textos pt-BR restantes do modo operacional (`Relatorio`, `Visao`, `Personalizacao`, separador `·`). Validado com `rg` sem mojibake no arquivo, `npx eslint src/features/fichas/operational-pdf.ts` e `npm run typecheck`. |
| 2026-05-04 | UX/Botoes Loading | Normalizado com spinner | Os botoes de acao foram padronizados para usar o mesmo `button-spinner` e refletir a acao em andamento no rotulo. Ajustados: `src/features/auth/login-form.tsx`, `src/features/clientes/cliente-form.tsx`, `src/features/catalogos/catalogo-form.tsx`, `src/features/usuarios/usuario-form.tsx`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-status-actions.tsx` e `src/features/fichas/ficha-row-actions.tsx`. Regra registrada em `AGENTS.md`: spinner para itens/botoes carregando; barra apenas para toasts e transicao entre paginas; skeleton nunca. Validado com `npx eslint` dirigido e `npm run typecheck`. |
| 2026-05-04 | UX/Confirmacoes | Prompt nativo removido | O `AlertDialog` do Radix ja estava instalado e em uso no Next atual; a pendencia remanescente era apenas um `window.confirm` no auto-preenchimento de observacoes em `src/features/fichas/ficha-form.tsx`. Esse fluxo foi migrado para o mesmo padrao visual de confirmacao do app, com opcao explicita entre manter o texto manual atual ou substituir pelas observacoes geradas automaticamente. Validado com `rg` sem `window.confirm` no App Router, `npx eslint src/features/fichas/ficha-form.tsx` e `npm run typecheck`. |
| 2026-05-04 | Fichas/Entregues Acoes | Reversao para pendente | Na listagem de fichas entregues, o antigo botao verde desabilitado foi substituido por um CTA laranja de reversao para pendente. Em `src/features/fichas/ficha-row-actions.tsx`, o quarto slot agora abre um `AlertDialog` de confirmacao antes do submit; em `src/features/fichas/actions.ts`, foi criada a action server-side `revertFichaToPendenteAction`, que limpa `delivered_at`, volta `status` para `pendente` e revalida as rotas relevantes. `src/styles/globals.css` ganhou as variantes `icon-action--warning` e `ui-button--warning` para sustentar o estado visual pedido. Validado com `npx eslint src/features/fichas/actions.ts src/features/fichas/ficha-row-actions.tsx` e `npm run typecheck`. |
| 2026-05-04 | UX/Botoes Loading | Spinner com cor herdada | O `button-spinner` em `src/styles/globals.css` deixou de depender de `--color-primary` / `--color-primary-contrast` e passou a usar `currentColor` tanto na trilha quanto no feixe animado. Resultado: o spinner agora acompanha a mesma cor visivel do texto/icone do botao em estados primario, secundario, sucesso, warning e danger, evitando casos em que ele sumia no fundo. Validado com `rg` no CSS e `npm run typecheck`. |
| 2026-05-04 | UX/Tooltip Rule | Title nativo evitado | Regra duravel registrada em `AGENTS.md` e `agents.md`: quando a intencao for descrever ou explicar uma acao/controle da interface, nao usar o atributo HTML nativo `title=\"\"`; usar o componente `Tooltip`. Checagem rapida com `rg -n 'title=' src/app src/features src/components` mostrou que os casos atuais no Next sao majoritariamente props semanticas de componentes (`EmptyState`, `Modal`, `AlertDialog`, etc.), nao dicas nativas de hover. |
| 2026-05-04 | Fichas/Busca UX | Foco preservado ao digitar | A toolbar de filtros em `/fichas` estava sendo remontada a cada mudanca de query porque `src/features/fichas/fichas-overview.tsx` passava uma `key` derivada dos filtros para `FichasFilterToolbar`. Isso foi removido. Em `src/features/fichas/fichas-filter-toolbar.tsx`, a busca passou a usar um draft local apenas enquanto o input esta em edicao: focado, o campo preserva o buffer digitado durante as atualizacoes da listagem; fora de foco, ele volta a refletir a URL/filtros externos. Validado com `npx eslint src/features/fichas/fichas-filter-toolbar.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck`. |
| 2026-05-04 | Fichas/PDF Operacional | Recorte da tela atual | O PDF operacional deixou de buscar o conjunto inteiro filtrado e passou a seguir exatamente a pagina visivel da listagem. `src/features/fichas/data.ts` agora usa a mesma paginação de `listFichas(...)` tambem em `listFichasForOperationalPdf(...)`; `src/features/fichas/fichas-overview.tsx` passou a incluir `page` no `pdfHref`; e `src/app/fichas/pdf/route.ts` passou a ler `page`, remover o bloco suplementar de atrasadas e nomear o arquivo conforme o estado atual da tela (busca, status, evento, intervalo, pagina e atalhos semanais quando aplicavel). Validado com `npx eslint src/app/fichas/pdf/route.ts src/features/fichas/data.ts src/features/fichas/fichas-overview.tsx` e `npm run typecheck`. |
| 2026-05-04 | Infra/UI Plugins | Instalacao e plano de adocao | Instalados os pacotes recomendados que faltavam em `plugins-recomendados.md`: `@tanstack/react-table`, `nuqs`, `date-fns`, `@tanstack/react-query`, `react-resizable-panels`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `recharts` e `zustand`. Tambem foi atualizado `plugins-recomendados.md` com status real e um plano de implementacao por ondas para trocar partes manuais por plugins, priorizando `nuqs` nos filtros/URL state, `date-fns` + `react-day-picker` em datas, `@tanstack/react-table` no primitivo compartilhado e `Tiptap` no editor de observacoes. Arquivos alterados: `package.json`, `package-lock.json`, `plugins-recomendados.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`. Caveats: ficaram 4 vulnerabilidades reportadas pelo `npm audit`; ainda nao houve migracao de features para os novos pacotes nesta rodada. |
| 2026-05-04 | Docs/Raiz | Consolidado | A raiz foi reduzida para os documentos realmente vivos do projeto: `README.md`, `AGENTS.md`, `plano-migracao-next-supabase.md` e `registro-migracao-next.md`. `README.md` foi reescrito como ponto de entrada da arquitetura Next/Supabase, e os conteudos operacionais de `CHECKLIST_HOMOLOGACAO_NEXT.md` e `plugins-recomendados.md` passaram a ser tratados como parte do plano principal (Fase 9 e secao de bibliotecas/adocao), permitindo remover os dois arquivos redundantes. Arquivos alterados: `README.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`, removidos `CHECKLIST_HOMOLOGACAO_NEXT.md` e `plugins-recomendados.md`. Validado com revisao estrutural dos docs da raiz. Caveat: entradas historicas antigas ainda citam os nomes removidos, mas o conteudo util permanece preservado no plano e no registro. |
| 2026-05-04 | Docs/AGENTS | Reescrito | `AGENTS.md` foi reescrito por completo para refletir o estado real do projeto em vez do desenho antigo da migracao. O arquivo agora registra as rotas ativas (`/fichas`, `/relatorios`, `/clientes`, `/catalogos`, `/usuarios`), a remocao de `/dashboard` e `/controle`, o gate atual em `src/app/layout.tsx`, o uso direto de `sonner` no App Router, o uso atual de `react-day-picker`, a permanencia de `contentEditable` nas observacoes e a diferenca entre bibliotecas ja adotadas e bibliotecas apenas instaladas. Arquivos alterados: `AGENTS.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com revisao estrutural do arquivo, cruzamento com `package.json`, `src/app/layout.tsx`, `src/components/ui/index.ts`, rotas em `src/app/*` e ocorrencias em `src/features/*`. Caveat: o arquivo foi normalizado para texto ASCII para reduzir risco de mojibake no fluxo atual. |
| 2026-05-04 | Docs/Plano | Consolidado status | O plano principal foi auditado contra o `registro-migracao-next.md` e atualizado para refletir o estado real do projeto. Foram marcados como concluidos itens ja comprovados em Fase 0, Fase 1, Fase 2, Fase 4, Fase 5, Fase 7 e Fase 8; a antiga Fase 6 foi reescrita para a realidade atual sem rota `/dashboard` dedicada; o item de Kanban foi rebaixado para reavaliacao pos-corte; e a exportacao PDF personalizada foi marcada como entregue. Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com cruzamento manual entre checkboxes abertos do plano e evidencias ja registradas no historico. Caveat: permaneceram abertas apenas pendencias que ainda dependem de producao, decisao de corte ou paridade fina realmente nao fechada. |
| 2026-05-05 | Quadro de producao | Feito inicial | Implementada a rota autenticada `/quadro-producao` como modulo proprio com colunas dinamicas persistidas em `kanban_columns`, backfill das fichas antigas para `kanban_column_id`, criacao e renomeio de colunas, reordenacao de colunas, drag/drop de cartoes, cartao manual, filtros por URL com `nuqs`, mutacoes otimistas com `@tanstack/react-query` e colunas redimensionaveis com `react-resizable-panels`. Tambem foram integrados os novos campos/tipos Supabase, a navegacao principal e o fallback de leitura de Kanban em fichas/clientes. Arquivos alterados: `supabase/migrations/202605050003_quadro_producao_dynamic_columns.sql`, `src/lib/supabase/database.types.ts`, `src/app/layout.tsx`, `src/components/ui/app-client-providers.tsx`, `src/components/ui/app-navigation.tsx`, `src/components/ui/index.ts`, `src/lib/navigation.ts`, `src/app/quadro-producao/page.tsx`, `src/app/api/quadro-producao/*`, `src/features/quadro-producao/*`, `src/features/fichas/actions.ts`, `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/clientes/data.ts`, `src/features/clientes/cliente-detail.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npx eslint` dirigido nos arquivos tocados, `npm run build` e `npm run supabase:check`. Caveat: `npm run lint` completo continua falhando por residuos preexistentes em `.kilo/*` e arquivos legados/minificados; a validacao visual autenticada do board no navegador ficou parcial porque a automacao parou na tela de login. |
| 2026-05-05 | Quadro de producao | Polimento visual validado | O layout do board foi enxugado no navegador autenticado: cards menores e com hierarquia mais compacta, colunas com lista rolavel e altura mais operacional, largura minima mais controlada e o proprio card passou a receber os atributos de drag handle, em vez de restringir o arraste a um botao isolado. Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npx eslint src/features/quadro-producao/quadro-producao-client.tsx` e inspeção no navegador autenticado em `http://localhost:3000/quadro-producao`. Caveat: o CSS continua fora da cobertura direta do ESLint do repo, entao a validacao dele nesta rodada foi visual e por medicao no browser. |
| 2026-05-05 | Quadro de producao | Simplificacao legado/kan | Segunda passada visual aproximou o board do legado e da referencia do `kan`: cards ainda menores, chips reduzidos, subtitulo tecnico da coluna removido, acoes do card escondidas em repouso para reduzir ruido, filtro de status rebatizado para `Pendencia`, e tooltip migrado para portal/fixed para nao ficar preso pelo overflow da coluna. Arquivos alterados: `src/components/ui/tooltip.tsx`, `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `npx eslint src/components/ui/tooltip.tsx src/features/quadro-producao/quadro-producao-client.tsx` e nova inspeção do board autenticado em `http://localhost:3000/quadro-producao`. Caveat: a acao rapida de status continua existindo no card por compatibilidade com o legado, mas sua nomenclatura agora tenta deixar claro que nao e a etapa do card. |
| 2026-05-05 | Fichas/Importacao legado | Feito incremental | Implementado parser dedicado de JSON legado para rascunho em `src/features/fichas/legacy-import.ts`, com deteccao de ficha unica ou backup com exatamente 1 ficha, normalizacao camelCase/snake_case, reaproveitamento das heuristicas legadas para `observacoes` e `comNomes`, e politica explicita para imagens salvas, apenas-preview e invalidas. `src/features/fichas/ficha-form.tsx` agora expõe importacao de JSON legado apenas em `/fichas/nova` para `superadmin`, reaplica o formulario como rascunho local sem gravar no banco, exige confirmacao antes de sobrescrever o rascunho atual e bloqueia `Salvar ficha` quando restam imagens importadas apenas como rascunho. Tambem foi criada a matriz interna `src/features/fichas/legacy-import-audit.ts`, mantendo como unica pendencia funcional explicita a validacao fina do auto-preenchimento de observacoes contra exemplos reais do legado. Arquivos alterados: `src/app/fichas/nova/page.tsx`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-form-seed.ts`, `src/features/fichas/legacy-import.ts`, `src/features/fichas/legacy-import-audit.ts`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`. Caveat: a v1 nao importa backup com multiplas fichas no mesmo fluxo e imagens sem `publicId` continuam exigindo remocao/substituicao antes do salvamento. |
| 2026-05-05 | UX/Botoes Loading | Corrigido spinner visual | O `button-spinner` global estava renderizando como barra horizontal, o que fazia o botao `Salvar ficha` parecer usar loading bar em vez de spinner. `src/styles/globals.css` foi ajustado para voltar ao spinner circular compartilhado, mantendo a heranca de `currentColor` e deixando a barra de loading restrita a toasts/transicao de pagina. Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`. |
| 2026-05-05 | Fichas/Feedback visual | Ajustado | O salvamento de ficha agora retorna para `/fichas` com feedback visual de sucesso: `src/features/fichas/actions.ts` passou a redirecionar com `saved=created|updated`, e `src/features/fichas/ficha-save-toast.tsx` consome esse estado uma unica vez, mostra `toast.success` e limpa o query param da URL sem reload. Na galeria do formulario, `src/styles/globals.css` passou a centralizar os cards em `image-upload-grid`, evitando que 1, 2 ou 3 imagens fiquem ancoradas na esquerda. Arquivos alterados: `src/features/fichas/actions.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/ficha-save-toast.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`. |
| 2026-05-05 | Fichas/Importacao legado | Normalizacao por catalogo | O parser de importacao legado passou a normalizar valores crus do legado antes de hidratar o formulario novo. `src/features/fichas/legacy-import.ts` agora reaproveita `public/data/catalogo.json` para canonicalizar produtos, materiais, mangas, cores, larguras, locais e faixas, e tambem aplica aliases explicitos dos selects antigos para campos como `gola` (`padre_ziper -> Gola Padre com Zíper`, `redonda -> Gola Redonda`, `v_polo -> Gola V Polo`) e acabamentos (`ribana`, `vies_sublimado`, `punho_ribana`, etc.). Em paralelo, `src/features/fichas/print-ficha.tsx` deixou de depender apenas dos valores crus `polo`, `v_polo` e `social`, passando a reconhecer tambem os rotulos normalizados via comparacao textual. Arquivos alterados: `src/features/fichas/legacy-import.ts`, `src/features/fichas/print-ficha.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck` e `eslint` dirigido nesses arquivos. |
| 2026-05-05 | Catalogos/Canonizacao legado | Preparado | A compatibilidade legado -> Next deixou de ficar só no parser. `src/features/fichas/legacy-import.ts` agora prioriza aliases vindos do `catalogOptions` carregado do banco, usando `public/data/catalogo.json` apenas como fallback. O seed `scripts/seed-catalog-items.mjs` foi refeito para gerar um catálogo canônico sem redundâncias artificiais, com aliases legados oficiais para `gola`, `acabamento_manga`, `acabamento_gola` e `tecido`. Também foi criada a migration `supabase/migrations/202605050002_catalog_items_canonical_cleanup.sql` para limpar redundâncias e inserir os valores canônicos que faltavam no banco atual. Dry-run do seed retornou 219 itens: `produto 65`, `tamanho 45`, `tecido 35`, `cor 40`, `manga 6`, `gola 8`, `acabamento_manga 6`, `acabamento_gola 5`, `bolso 9`. Arquivos alterados: `src/features/fichas/legacy-import.ts`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/print-ficha.tsx`, `scripts/seed-catalog-items.mjs`, `supabase/migrations/202605050002_catalog_items_canonical_cleanup.sql`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, `eslint` dirigido e `node scripts/seed-catalog-items.mjs` em dry-run. Caveat: a migration e o seed ainda nao foram aplicados no banco nesta rodada. |
| 2026-05-05 | Quadro de producao | Refatoracao estrutural legado/kan | A superficie autenticada foi reestruturada para deixar de parecer uma pagina com hero + cards e voltar a funcionar como quadro operacional. `src/features/quadro-producao/quadro-producao-client.tsx` concentrou titulo, total, filtros e acoes em uma unica barra compacta, enquanto `src/styles/globals.css` refez densidade, largura, acento das colunas e hierarquia dos cartoes para ficar mais proximo do legado e da referencia do `kan`. Tambem foi adicionada blindagem CSS para `quadro-producao-view__header[hidden]`, evitando que o hero antigo volte a vazar na primeira pintura. Validado com `npm run typecheck`, `cmd /c npx eslint src\\features\\quadro-producao\\quadro-producao-client.tsx`, `npm run build`, `npm run supabase:check`, `npm run lint` (falha preexistente em `.kilo/*` e legado) e inspeção autenticada em `http://localhost:3000/quadro-producao`, com 82 cartoes carregados, header de coluna em ~58px e card simples em ~60px. |
| 2026-05-05 | Quadro de producao | Cards/controles ajustados | Corrigido o visual dos cards encavalados e dos controles do board. `src/styles/globals.css` alinhou toolbar, selects e recorte semanal ao padrao de filtros/botoes do app, esticou as colunas dentro dos paineis redimensionaveis e mudou a lista para `flex` com cartoes sem shrink, permitindo que cada card use sua altura real. `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/quadro-producao/config.ts` e `src/lib/navigation.ts` tambem tiveram textos pt-BR corrigidos com acentuacao, removendo duplicidades no botao de novo cartao e labels sem acento. Validado com `npm run typecheck`, eslint dirigido, `npm run build`, scan de mojibake/textos sem acento e inspeção autenticada no Edge DevTools confirmando `overlaps: false`, controles 44px/10px e nenhum mojibake renderizado. |
| 2026-05-05 | Quadro de producao | DnD sem nested scroll | O aviso de desenvolvimento da biblioteca DnD anterior ao mover cards foi rastreado para nested scroll containers. A documentação do destino de drop confirmava que ele só suportava o proprio destino como scroll container sem scroll parent, ou um unico scroll parent externo. `src/styles/globals.css` removeu temporariamente `max-height`/`overflow-y: auto` de `quadro-producao-column__list`, deixando a lista de cards fora da deteccao de scroll container. Esta decisão foi superada pela migração para Pragmatic, que restaurou scroll interno por coluna. Validado naquela rodada com `npm run typecheck`, eslint dirigido, `npm run build` e inspeção no Edge DevTools. |
| 2026-05-05 | DnD/Pragmatic | Migrado | O projeto deixou de usar a biblioteca DnD anterior e passou a usar apenas Atlassian Pragmatic Drag and Drop. `package.json`/`package-lock.json` removeram a dependencia antiga e adicionaram os pacotes Pragmatic usados naquela rodada. `src/features/fichas/ficha-form.tsx` migrou a ordenacao de produtos e imagens para registros diretos de drag/drop; `src/features/quadro-producao/quadro-producao-client.tsx` migrou cards e colunas, mantendo scroll interno por coluna. `src/styles/globals.css` ajustou estados visuais sem atributos internos da biblioteca anterior. Validado com `npm run typecheck`, eslint dirigido, `npm run build` e varredura por residuos do pacote antigo. |
| 2026-05-05 | DnD/Pragmatic | Shadow de encaixe | Descartada a tentativa de pre-ordenar a lista durante o drag e refeita a experiencia no padrao de shadow do Pragmatic. `src/features/quadro-producao/quadro-producao-client.tsx` e `src/features/fichas/ficha-form.tsx` mediam o item arrastado e renderizavam placeholders visuais antes/depois do alvo, sem alterar a ordem real ate o drop. O pisca-pisca do shadow foi corrigido mantendo um unico shadow ativo na coluna/lista e evitando limpar o placeholder no leave causado pelo proprio deslocamento visual. Validado com `npm run typecheck`, eslint dirigido e `npm run build`. |
| 2026-05-06 | Quadro de producao | Ordem/filtros corrigidos | Corrigidos os efeitos de flash e a falsa impressão de filtros quebrados: `QuadroProducaoClient` agora só usa o snapshot inicial quando os filtros atuais são os filtros iniciais da página, mantém dados anteriores durante refetch filtrado e não invalida imediatamente o board após um drop otimista. A persistência real da ordem foi corrigida em `supabase/migrations/202605060001_fix_kanban_move_dense_order.sql`, redefinindo `move_kanban_card(...)` para tratar o destino como índice denso da UI, recomputar ranking por coluna e normalizar ordens existentes. Ajuste posterior: o drop sobre o shadow deixou de cair no fim da coluna, porque a lista agora usa o último shadow ativo como destino fallback; a busca também passou a ter debounce de 350ms antes de atualizar a URL/API. Validado com `npm run typecheck`, eslint dirigido, `npm run build`, `npm run supabase:check` e Edge DevTools: busca sem resultado zerou o quadro e limpar filtros restaurou 82 cards. Caveat: a migration precisa ser aplicada no banco alvo; `supabase` CLI/`psql` não estão disponíveis no PATH desta máquina. |
| 2026-05-06 | Quadro de producao | Cards/colunas refinados | Cards e colunas foram alinhados à estrutura operacional desejada: filtros e botões receberam hover/focus compatíveis com os campos compartilhados; colunas ficaram sem fundo, mantendo só borda e acento superior; contador foi para o topo direito e ações da coluna para baixo do título. Nos cards, o cliente passou a ser a primeira informação, personalização/material/evento viraram chips, o status da ficha virou select-chip (`Tudo OK`, `Sem tecido`, `Sem tinta`, `Sem papel`, `Pendências`), a entrega foi para o rodapé, o olho passou a mostrar preview da primeira imagem e o antigo check foi substituído por ação de mover para a próxima coluna. Validado com `npm run typecheck`, eslint dirigido, `npm run build`, `npm run supabase:check` e inspeção no Edge DevTools. |
| 2026-05-06 | Quadro de producao | Chips/status/imagem ajustados | Chips do card ficaram mais discretos e o chip de tecido foi removido, deixando a leitura focada em personalizacao, evento e status da ficha. O status da ficha voltou às cores do legado (`Tudo OK` sucesso, `Sem tecido` alerta, `Sem tinta` erro, `Sem papel` informativo e `Pendencias` alerta discreto), a entrega ganhou indicador circular de prazo com a mesma regra legada e os botoes do card voltaram a ter `Tooltip`. A preview usa thumbnail Cloudinary transformada e a imagem recebeu `height: auto` para evitar o warning de aspect ratio do Next/Image. Validado com `npm run typecheck`, `npm run lint` e scan de mojibake nos arquivos tocados. |
| 2026-05-06 | Quadro de producao | Modal/card aberto refinado | O modal de detalhe foi refeito como card aberto: mostra a primeira imagem em destaque, dados essenciais, status da ficha editavel e acao de mover para a proxima etapa; foram removidos observacoes, abrir previa e abrir ficha completa. As colunas voltaram a ter fundo neutro de superficie sem degrade, o select-chip de status saiu do wrapper de tooltip para voltar a abrir normalmente, e `Tudo OK` passou a usar cor neutra. Validado com `npm run typecheck`, eslint dirigido e inspeção no Edge em `/quadro-producao`. |
| 2026-05-06 | Quadro de producao | Linguagem/status e imagens 16:9 | A linguagem visivel do quadro passou a tratar o chip como status da ficha/pedido, sem expor nomenclatura tecnica antiga. As imagens do tooltip e do modal foram padronizadas em 16:9, com transformacoes Cloudinary `320x180` e `640x360`. |
| 2026-05-06 | Quadro de producao | Labels dos filtros | A barra principal do quadro recebeu labels visiveis nos campos de busca, tecido, personalizacao e status da ficha, mantendo tambem os `aria-labels` existentes para acessibilidade. Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck` e eslint dirigido no cliente do quadro. |
| 2026-05-06 | Quadro de producao | Evento, tooltip e modal compactos | O chip `Evento` foi movido para antes do nome do cliente no card e recebeu destaque azul/primary; a preview da imagem passou a abrir abaixo/direita do ponteiro e seguir o mouse; o modal ficou mais compacto, sem metadado `Ficha real`, com imagem 16:9, select e botao alinhados visualmente e `Tooltip` descrevendo a acao de mover. Validado com `npm run typecheck`, eslint dirigido e checagem visual no Edge. |
| 2026-05-06 | Quadro de producao | Evento como icone | O marcador de evento do card deixou de exibir texto e passou a usar icone de estrela azul/primary antes do nome do cliente; o nome foi travado em uma linha com ellipsis para nao estourar o card. Validado com `npm run typecheck`, eslint dirigido e checagem visual no Edge. |
| 2026-05-06 | Quadro de producao | Respiro vertical dos cards | Os cards do quadro ganharam pequeno aumento de padding vertical e gap interno para separar melhor titulo, chips e data sem alterar a densidade geral da coluna. Validado com checagem visual no Edge. |
| 2026-05-06 | Quadro de producao | Tooltips restaurados nas acoes | A barra de acoes do quadro e o botao de titulo do card voltaram a usar o componente `Tooltip` para explicar suas acoes, somando-se aos tooltips ja existentes nos botoes de coluna, preview, mover card e mover no modal. Validado com `npm run typecheck`, eslint dirigido e checagem visual no Edge. |
| 2026-05-06 | UI/Tooltip | Corrigido portal invisivel | O componente compartilhado `Tooltip` foi corrigido para exibir o conteudo renderizado em portal: o portal agora recebe estado visivel proprio e fallback nativo de mouse/focus alem de pointer events. Isso voltou a mostrar as descricoes das acoes do quadro. Validado com `npm run typecheck`, eslint dirigido e checagem no Edge. |
| 2026-05-06 | Quadro de producao | Tooltip do olho removido | O botao de visualizar/preview por icone de olho deixou de usar tooltip textual, porque a propria preview da imagem ja cumpre esse papel; foram mantidos `aria-label` e preview 16:9 no hover. Validado com `npm run typecheck` e eslint dirigido. |
| 2026-05-06 | Dark mode/Quadro e shell | Ajuste visual | Exclusivo do tema escuro: cards do quadro passaram a usar fundo levemente mais escuro que a coluna para ganhar relevo, e o item ativo da navegacao passou a reutilizar o estilo de hover como base visual. Validado com `npm run typecheck` e checagem no Edge. |
| 2026-05-06 | Dark mode/Quadro | Borda dos cards suavizada | A borda dos cards no tema escuro teve a opacidade do acento reduzida, inclusive no hover, preservando o relevo do fundo sem deixar o contorno pesado. Validado com `npm run typecheck` e checagem visual. |
| 2026-05-06 | Quadro de producao | Filtro redundante removido | O select de tecido saiu da toolbar principal do quadro, mantendo a busca textual como caminho para tecido e preservando compatibilidade interna com URLs antigas que ainda tragam `tecido`. A data de entrega exibida no card passou para formato curto `DD/MM/AA`. Validado com `npm run typecheck`, eslint dirigido e scan de mojibake no cliente do quadro. |
| 2026-05-06 | Quadro de producao | Acoes da toolbar em linha | A grid da toolbar foi atualizada para dois filtros visiveis + acoes, acompanhando a remocao do filtro de tecido, e os botoes da barra principal deixaram de quebrar linha tanto no estado base quanto no breakpoint mobile. Quando faltar largura, a faixa usa scroll horizontal. Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, scan de mojibake no CSS e checagem do CSS renderizado no Edge. |
| 2026-05-06 | Quadro de producao | Abas por personalizacao | O select de status da ficha saiu da pesquisa principal e a personalizacao deixou de ser select para virar abas horizontais (`Todos`, `Sublimacao`, `Serigrafia`, `Bordado`, etc.) usando o mesmo filtro `arte` da URL/API. A toolbar agora concentra titulo, busca e acoes, mantendo `Para essa semana` visivel. Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, eslint dirigido, scan de mojibake e checagem no Edge. |
| 2026-05-06 | Fichas/DnD editor | Shadow destravado | No editor de fichas, o DnD de produtos e imagens voltou a preservar o shadow durante `dragLeave`, limpando-o apenas no fim real do drag/drop, porque o proprio placeholder desloca o alvo e dispara leaves intermediarios. Os placeholders tambem ficaram sem `pointer-events` e com animacao curta de entrada para parecerem abertura de espaco entre os itens. Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`. Validado com `npm run typecheck`, eslint dirigido, scan de mojibake e checagem visual no Edge. |
| 2026-05-06 | DnD/Fluid | Migrado | Atlassian Pragmatic deixou de ser dependencia ativa e `fluid-dnd` virou a unica biblioteca DnD do App Router. `src/features/fichas/ficha-form.tsx` passou produtos e imagens para `useDragAndDrop`, sincronizando a ordem com `react-hook-form` por ids estaveis; `src/features/quadro-producao/quadro-producao-client.tsx` passou cards por coluna para listas Fluid com grupo compartilhado, persistindo o drop pela mutation otimista existente. `src/styles/globals.css`, `AGENTS.md`, `package.json` e `package-lock.json` foram atualizados. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`, varredura de residuos e checagem visual no Edge em `/fichas/nova` e `/quadro-producao`. |
| 2026-05-06 | DnD/Fluid | Hotfix | Corrigida a duplicacao/lentidao no DnD do formulario: a sincronizacao entre `react-hook-form` e Fluid deixou de espelhar todo estado intermediario e passou a ser dirigida por add/remover/duplicar/ordenar/editar; o efeito de drag so persiste a ordem final quando os ids estao unicos. Delays de insert/remove foram zerados e a animacao foi reduzida para 90ms. Validado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge em `/fichas/nova` adicionando produto e simulando drag sem warning de key duplicada. |
