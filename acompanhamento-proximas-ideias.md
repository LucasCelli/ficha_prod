# Acompanhamento das proximas ideias

Documento para organizar as proximas melhorias em etapas pequenas, revisaveis e seguras.

## Principios de trabalho

- Antes de cada etapa, revisar `git status --short` e separar mudancas relacionadas de mudancas pendentes.
- Fazer alteracoes pequenas, com patch minimo e mantendo UTF-8.
- Validar arquivos JS alterados com `node --check` quando aplicavel.
- Respeitar os tokens de design em `public/css/tokens/*` e evitar cores diretas fora de `public/css/tokens/colors.css`.
- Reusar `public/js/utils/toast.js` para notificacoes, sem criar novas implementacoes paralelas.
- Registrar aqui decisoes, pendencias e criterios de aceite conforme cada etapa for avancando.

## 1. Integridade do codigo atual

**Objetivo:** verificar a saude atual do projeto antes de novas funcionalidades.

### Tarefas

- [x] Revisar `git status --short` e identificar alteracoes ja existentes.
- [x] Rodar buscas de governanca CSS:
  - [x] Seletores compartilhados fora de `public/css/components/*`.
  - [x] Seletores dark-mode fora de `dark-mode-consistency.css` e `tokens/colors.css`.
- [x] Rodar verificacoes de sintaxe nos JS nao minificados relevantes.
- [x] Validar se ha erros recorrentes no fluxo principal da aplicacao.
- [x] Corrigir problemas pequenos encontrados, quando forem seguros e bem localizados.

### Criterios de aceite

- [x] Checks principais documentados.
- [x] Ajustes necessarios aplicados ou listados como pendencia.
- [x] Nenhuma alteracao de encoding introduzida.

## 2. Limpeza do sistema de notificacoes

**Objetivo:** remover resquicios do painel de notificacoes do sistema e manter apenas feedbacks operacionais via utilitario compartilhado de toast.

### Tarefas

- [x] Mapear usos atuais de notificacoes/toasts em `public/js`.
- [x] Identificar painel legado de notificacoes do sistema na barra global.
- [x] Remover botao, painel, permissao de navegador e logica de feed de notificacoes do sistema.
- [x] Remover estilos `.site-notification-*` e dark-mode associados.
- [x] Identificar implementacoes duplicadas, shims antigos e chamadas legadas de toast.
- [ ] Migrar chamadas possiveis para:
  - [ ] `window.toast.success(...)`
  - [ ] `window.toast.error(...)`
  - [ ] `window.toast.warning(...)`
  - [ ] `window.toast.info(...)`
  - [x] `window.toast.show(...)`
- [x] Remover excecoes antigas em `public/js/main.js` que criavam toasts proprios.
- [x] Validar visualmente os principais fluxos que exibem notificacoes.

### Criterios de aceite

- [x] Painel "Notificacoes do Sistema" removido da barra global.
- [x] Nenhuma nova implementacao de toast fora de `public/js/utils/toast.js`.
- [x] Chamadas migradas sem quebrar compatibilidade.
- [x] Fluxos principais continuam exibindo feedback ao usuario.

## 3. Normalizacao das thumbs no dashboard

**Objetivo:** padronizar o tamanho das miniaturas na listagem de `public/dashboard.html`.

### Tarefas

- [x] Localizar markup e CSS usados pelas thumbs da listagem.
- [x] Definir dimensoes estaveis com `aspect-ratio`, `width`, `height`, `object-fit` ou tokens existentes.
- [x] Garantir que imagens muito largas, altas ou ausentes nao quebrem o layout.
- [x] Verificar responsividade em desktop e mobile.
- [x] Evitar alteracoes globais fora da camada correta de CSS.

### Criterios de aceite

- [x] Thumbs com tamanho consistente na listagem.
- [x] Layout sem saltos ou desalinhamentos por causa das imagens.
- [x] Estado sem imagem tratado de forma limpa.

## 4. Nova pagina de controle de pedidos

**Objetivo:** criar uma pagina dedicada para organizar pedidos por periodo, data, status e tipo de personalizacao, com exportacao em PDF semelhante aos relatorios.

**Status:** adiado para depois da migracao para Next.js + Supabase. Esta funcionalidade deve nascer nativa na nova arquitetura, em vez de ser adicionada ao legado atual.

### Escopo inicial

- [ ] Criar pagina de controle de pedidos.
- [ ] Separar pedidos da semana por data.
- [ ] Separar pedidos da proxima semana por data.
- [ ] Listar pedidos antigos pendentes para marcacao como entregue.
- [ ] Separar pedidos tambem por tipo de personalizacao.
- [ ] Gerar PDF com agrupamentos semelhantes aos relatorios existentes.

### Perguntas para definir antes da implementacao

- [ ] Qual campo define a data do pedido: criacao, entrega, prazo ou outro?
- [ ] Quais status entram como "pendentes" e quais entram como "entregue"?
- [ ] Quais tipos de personalizacao existem hoje e onde estao armazenados?
- [ ] A pagina deve permitir edicao direta do pedido ou apenas marcacao de entregue?
- [ ] O PDF deve ser um resumo operacional, lista detalhada ou ambos?

### Tarefas tecnicas

- [ ] Mapear modelo de dados atual dos pedidos.
- [ ] Reusar padroes de relatorios existentes para filtros, layout e PDF.
- [ ] Definir rota/link de acesso para a nova pagina.
- [ ] Implementar agrupamento por periodo e data.
- [ ] Implementar agrupamento por tipo de personalizacao.
- [ ] Implementar acao para marcar pedidos antigos pendentes como entregues.
- [ ] Implementar exportacao em PDF.
- [ ] Validar com dados reais ou massa de teste.

### Criterios de aceite

- [ ] Pedidos da semana aparecem agrupados por data.
- [ ] Pedidos da proxima semana aparecem agrupados por data.
- [ ] Pedidos antigos pendentes ficam visiveis e podem ser marcados como entregues.
- [ ] Agrupamento por tipo de personalizacao esta claro.
- [ ] PDF reflete os agrupamentos da tela.
- [ ] Fluxo funciona em desktop e mobile.

## Registro de progresso

| Data | Etapa | Status | Notas |
| --- | --- | --- | --- |
| 2026-04-27 | Criacao do acompanhamento | Feito | Documento inicial criado para guiar as proximas implementacoes. |
| 2026-04-27 | Integridade do codigo atual | Feito | `node --check` passou em 79 JS; governanca CSS validada; pagina inicial respondeu HTTP 200; seletores de relatorios foram escopados para `body.page-relatorios`. |
| 2026-04-27 | Remocao do painel de notificacoes | Feito | Removido o botao/painel "Notificacoes do Sistema", permissao de navegador, feed local e estilos `.site-notification-*`. |
| 2026-04-27 | Unificacao dos toasts | Feito | Chamadas legadas migradas para `window.toast.show`; toasts proprios de limite/duplicidade de produtos removidos; rotas principais responderam HTTP 200; DevTools validou dashboard, clientes, ficha, relatorios, relatorios_cliente e kanban sem painel legado e sem erros de console. |
| 2026-04-27 | Normalizacao das thumbs no dashboard | Feito | Thumbs padronizadas em 16:9: 112x63 no desktop e 104x59 no mobile, com `object-fit: cover`; Playwright validou dashboard sem erros de console. |
| 2026-04-27 | Nova pagina de controle de pedidos | Adiado | Item movido para depois da migracao Next.js + Supabase, para ser implementado nativamente na nova arquitetura. |
