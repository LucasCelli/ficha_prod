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

## Fase 0. Preparacao e congelamento relativo do legado

**Objetivo:** entender o estado atual e definir uma base segura para comecar.

### Tarefas

- [ ] Revisar `git status --short` e separar mudancas pendentes.
- [ ] Fazer inventario das paginas atuais:
  - [ ] Dashboard.
  - [ ] Clientes.
  - [ ] Fichas.
  - [ ] Relatorios.
  - [ ] Configuracoes e utilitarios.
- [ ] Fazer inventario dos arquivos JS principais e suas responsabilidades.
- [ ] Fazer inventario dos estilos e tokens existentes.
- [ ] Identificar fluxos criticos que precisam existir na nova versao.
- [ ] Definir quais bugs do legado devem ser corrigidos antes da migracao e quais serao resolvidos apenas na nova versao.
- [x] Centralizar arquivos Markdown na raiz do projeto.
- [x] Atualizar `agents.md` com regras de Vercel, Next.js, Supabase e UI.

### Criterios de aceite

- [ ] Fluxos criticos listados.
- [ ] Modulos legados mapeados.
- [ ] Pendencias conhecidas registradas.
- [ ] Nenhum arquivo legado removido nesta fase.

## Fase 1. Modelo de dados no Supabase

**Objetivo:** desenhar a estrutura de dados nova antes de construir as telas.

### Tarefas

- [x] Mapear entidades atuais:
  - [ ] Usuarios.
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
- [ ] Definir estrategia de importacao dos dados existentes.
- [x] Criar seed inicial de catalogos a partir dos dados legados, sem dependencia runtime de JSON.

### Criterios de aceite

- [x] Schema inicial documentado.
- [ ] Relacionamentos revisados.
- [ ] Estrategia de migracao de dados definida.
- [x] RLS planejado antes de expor dados em producao.

## Fase 2. Bootstrap do projeto Next.js

**Objetivo:** criar a base nova do app, independente das paginas legadas.

### Tarefas

- [ ] Escolher estrutura do projeto:
  - [ ] Novo app dentro do repo atual.
  - [ ] Ou nova raiz Next substituindo gradualmente a estrutura antiga.
- [x] Criar projeto Next.js com TypeScript.
- [x] Configurar lint e scripts de build.
- [ ] Configurar variaveis de ambiente para Supabase.
- [x] Criar cliente Supabase server-side e client-side conforme necessidade.
- [ ] Definir estrutura inicial:
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
- [ ] Conexao com Supabase validada em ambiente de desenvolvimento.
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
- [ ] Fichas da semana aparecem agrupadas por data.
- [ ] Fichas da proxima semana aparecem agrupadas por data.
- [x] Fichas pendentes podem ser marcadas como entregues.
- [ ] PDF confere com a tela.
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

- [ ] Cliente pode ser criado, editado e localizado.
- [ ] Historico de fichas por cliente funciona.
- [ ] Dados importados aparecem corretamente.

## Fase 6. Dashboard novo

**Objetivo:** criar um painel nativo do Next, usando dados do Supabase.

### Tarefas

- [x] Definir indicadores principais.
- [x] Criar cards ou secoes operacionais com dados reais.
- [ ] Normalizar thumbs e imagens de forma nativa.
- [ ] Criar atalhos para fluxos frequentes.
- [ ] Validar responsividade.

### Criterios de aceite

- [ ] Dashboard mostra dados consistentes.
- [ ] Thumbs tem dimensoes estaveis.
- [ ] Atalhos levam aos fluxos corretos.

## Fase 7. Relatorios e PDFs

**Objetivo:** reconstruir relatorios com base no novo modelo.

### Tarefas

- [ ] Mapear relatorios existentes.
- [x] Priorizar relatorios essenciais.
- [x] Criar filtros e consultas no Supabase.
- [x] Implementar geracao de PDF.
- [ ] Comparar resultados com o legado.

### Criterios de aceite

- [x] Relatorios essenciais implementados.
- [x] PDFs gerados com layout consistente.
- [ ] Dados conferem com consultas equivalentes.

## Fase 8. Migracao de dados

**Objetivo:** levar os dados do sistema atual para o Supabase com rastreabilidade.

### Tarefas

- [ ] Exportar dados atuais.
- [x] Criar script de transformacao para o novo schema.
- [ ] Criar importacao em ambiente de teste.
- [ ] Validar contagens por entidade.
- [ ] Popular catalogos no Supabase antes da importacao completa das fichas.
- [ ] Validar amostras de clientes, fichas e relatorios.
- [ ] Registrar inconsistencias encontradas.
- [ ] Planejar janela de migracao final.

### Criterios de aceite

- [ ] Dados importados em ambiente de teste.
- [ ] Contagens e amostras validadas.
- [ ] Inconsistencias conhecidas resolvidas ou documentadas.

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
- [ ] Validar variaveis e build no ambiente Vercel de producao.
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
- [ ] Validar dados importados.
- [ ] Configurar ambiente de producao.
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
