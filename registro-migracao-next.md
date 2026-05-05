# Registro da migracao Next

## 2026-05-05 - Quadro de Producao visual refinado

- Fase/modulo: quadro de producao / polimento visual e usabilidade do board.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o quadro passou por uma rodada de compactacao real no navegador autenticado. Os cards ficaram menores, com largura controlada dentro da coluna, menos padding, badges mais contidas, lista interna rolavel e uma hierarquia mais curta entre venda, entrega, titulo, chips e acoes.
- Arraste: os atributos de drag handle foram movidos para o proprio `<article>` do card, deixando o cartao inteiro arrastavel em vez de depender de um botao pequeno no canto. O indicador visual de grip permaneceu no topo apenas como pista de affordance.
- Colunas: a superficie desktop ganhou comportamento mais operacional, com altura util concentrada na lista de cartoes (`max-height` da coluna/lista) e menor desperdicio vertical entre header, container e cards. No mobile, a largura minima do board horizontal tambem foi reduzida para melhorar o encaixe inicial.
- Browser: validado em `http://localhost:3000/quadro-producao` com sessao autenticada. A inspeção confirmou cards na faixa de ~148px de altura nos casos simples, largura real dentro da coluna e o atributo `data-rfd-drag-handle-draggable-id` presente no proprio card.
- Validacao: `npm run typecheck` passou. `npx eslint src/features/quadro-producao/quadro-producao-client.tsx` ficou limpo; `src/styles/globals.css` continua fora da cobertura do ESLint atual do repo e foi validado por inspeção visual/DOM no navegador.
- Caveat: esta rodada foi focada em densidade e usabilidade imediata. Se quisermos um refinamento adicional depois, o proximo passo natural e simplificar ainda mais a coluna de acoes ou transformar parte das acoes do card em menu contextual para reduzir ruido visual.

## 2026-05-05 - Quadro de Producao simplificado para legado/kan

- Fase/modulo: quadro de producao / simplificacao visual final.
- Arquivos alterados: `src/components/ui/tooltip.tsx`, `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnostico: o board ainda estava carregado demais em relacao ao legado e ao `kan`: chips grandes, subtitulo tecnico em cada coluna, acoes sempre expostas, nomenclatura `Insumos` pouco clara no topo e tooltip preso pelo overflow da coluna.
- Ajuste de linguagem: o filtro e a leitura do campo deixaram de apresentar `Insumos` como se fosse o status principal do quadro. A UI agora usa `Pendencia`, e os labels ficaram mais diretos (`Tudo pronto`, `Com pendencias`, etc.), preservando o dado legado sem confundir com a etapa do card.
- Ajuste de coluna/card: o subtitulo tecnico (`slug`) foi removido do header das colunas. Os cards ficaram menores e mais secos: venda + entrega em uma linha, cliente em destaque, chips minimos e pendencia exibida apenas quando existe. As acoes do card passaram a ficar discretas em repouso e aparecer no hover/focus, reduzindo a poluicao visual da lista.
- Tooltip: `src/components/ui/tooltip.tsx` passou a renderizar o balao via portal em `document.body`, com posicionamento `fixed` calculado por `getBoundingClientRect()`. Isso evita que o tooltip seja cortado pelo `overflow` da coluna/lista.
- Browser: validado novamente no board autenticado em `http://localhost:3000/quadro-producao`. A tela passou a mostrar cards de aproximadamente 109px nos casos simples, sem o subtitulo tecnico da coluna e com leitura geral bem mais proxima da referencia enxuta desejada.
- Validacao: `npm run typecheck` e `npx eslint src/components/ui/tooltip.tsx src/features/quadro-producao/quadro-producao-client.tsx` passaram.
- Caveat: o quick action de pendencia continua existindo por paridade funcional com o legado, mas a interface agora tenta deixa-lo subordinado ao card, em vez de competir com a etapa principal do quadro.

## 2026-05-05 - Quadro de Producao dinamico

- Fase/modulo: quadro de producao / Kanban operacional no App Router.
- Arquivos alterados: `supabase/migrations/202605050003_quadro_producao_dynamic_columns.sql`, `src/lib/supabase/database.types.ts`, `src/app/layout.tsx`, `src/components/ui/app-client-providers.tsx`, `src/components/ui/app-navigation.tsx`, `src/components/ui/index.ts`, `src/lib/navigation.ts`, `src/app/quadro-producao/page.tsx`, `src/app/api/quadro-producao/route.ts`, `src/app/api/quadro-producao/columns/route.ts`, `src/app/api/quadro-producao/columns/reorder/route.ts`, `src/app/api/quadro-producao/columns/[id]/route.ts`, `src/app/api/quadro-producao/columns/[id]/sort-by-date/route.ts`, `src/app/api/quadro-producao/cards/manual/route.ts`, `src/app/api/quadro-producao/cards/[id]/move/route.ts`, `src/app/api/quadro-producao/cards/[id]/insumo-status/route.ts`, `src/app/api/quadro-producao/cards/[id]/entregar/route.ts`, `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/search-params.ts`, `src/features/quadro-producao/schema.ts`, `src/features/quadro-producao/data.ts`, `src/features/quadro-producao/api.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/fichas/actions.ts`, `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/clientes/data.ts`, `src/features/clientes/cliente-detail.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a nova rota autenticada `/quadro-producao` foi implementada como modulo proprio, mantendo o esquema visual da app atual e sem recriar uma UI paralela. O board agora le de `kanban_columns`, suporta criacao e renomeio de colunas, reordenacao persistida de colunas, drag/drop de cartoes, ordenacao por data dentro da coluna, acao rapida de insumos, marcar como entregue e criacao de cartao manual no mesmo dominio de `fichas`.
- Banco/migracao: a migration criou `public.kanban_columns`, semeou as 5 colunas base do fluxo legado, adicionou `kanban_column_id`, `kanban_ordem`, `is_manual_card` e `kanban_status_updated_at` em `fichas`, fez backfill a partir do `kanban_status` antigo e adicionou funcoes SQL para reordenar colunas, ordenar cartoes por data e mover cartoes entre colunas.
- Dados e contratos: `src/lib/supabase/database.types.ts` passou a tipar a nova tabela, os novos campos de `fichas` e as funcoes RPC. O modulo `src/features/quadro-producao/*` centraliza schemas Zod, parse de search params via `nuqs/server`, snapshot server-side, mutacoes e chamadas client-side.
- Plugins/bibliotecas aplicados: `nuqs` entrou no estado de URL dos filtros, `@tanstack/react-query` passou a sustentar refetch e mutacoes otimistas do board, `@hello-pangea/dnd` foi reutilizado no drag/drop dos cartoes e `react-resizable-panels` passou a estruturar as colunas redimensionaveis no desktop. `AppClientProviders` foi adicionado no layout para expor `NuqsAdapter` e `QueryClientProvider` sem criar wrappers paralelos por pagina.
- Integracao com o resto do produto: `Quadro de Producao` entrou na navegacao principal; novas fichas ja nascem apontando para a coluna base; e as leituras de Kanban em `/fichas` e no detalhe de clientes passaram a preferir `kanban_column.name` quando disponivel, em vez de depender apenas do enum antigo.
- Decisao: nesta primeira entrega, a gestao de colunas cobre criar, renomear e reordenar, mas nao excluir. A reordenacao das colunas ficou por controles explicitos de mover esquerda/direita, enquanto o drag/drop foi concentrado nos cartoes. `zustand` nao foi introduzido porque React Query + estado local foram suficientes.
- Validacao: `npm run typecheck`, `npm run build` e `npm run supabase:check` passaram. O lint dos arquivos tocados foi validado com `npx eslint` dirigido porque `npm run lint` completo continua contaminado por erros preexistentes em `.kilo/*` e arquivos legados/minificados fora desta frente.
- Browser: dev server local abriu `/quadro-producao` com status 200 e redirecionamento esperado para `/login` sem sessao. A validacao visual autenticada do board ficou parcial nesta rodada porque a automacao nao concluiu a navegacao para dentro da area autenticada.
- Caveat: a nova migration ainda precisa ser aplicada no banco alvo para o board funcionar com dados reais. Como a validacao autenticada do navegador nao foi concluida ate a tela do quadro, ainda vale uma rodada curta de conferencias visuais apos aplicar a migration.

## 2026-04-29 - Controle operacional

- Fase/modulo: controle de fichas pendentes por semana.
- Arquivos alterados: `src/app/controle/page.tsx`, `src/features/controle/data.ts`, `src/features/controle/controle-overview.tsx`, `src/features/fichas/actions.ts`, `src/lib/navigation.ts`, `src/styles/globals.css`.
- Resultado: nova rota `/controle` com fichas pendentes separadas em Semana atual, Proxima semana e Antigas pendentes. Dentro de cada secao, os registros ficam agrupados por data de entrega e tipo de personalizacao, com link para PDF filtrado e acao de marcar como entregue.
- Decisao: a acao inline usa `markFichaEntregueFormAction`, um wrapper de Server Action para formulario server-rendered, mantendo `markFichaEntregueAction` compatível com `useActionState` nas telas de ficha.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools em `http://localhost:3000/controle` mostrou 39 fichas na semana atual, 21 na proxima semana e 19 antigas pendentes. O fluxo real de entregar foi testado com a ficha `75dd9a18-ac37-4a9c-a4d5-8c5e29b7d6bf` e restaurado para `pendente`/`delivered_at = null`.
- Caveat: o console do Edge mostrou aviso de hidratacao causado por extensao injetando atributo `style` no `<html>`, igual a verificacoes anteriores; nao apareceu erro funcional da aplicacao.

## 2026-04-29 - Controle para lista filtrada

- Fase/modulo: continuidade do controle operacional.
- Arquivos alterados: `src/features/controle/data.ts`, `src/features/controle/controle-overview.tsx`, `src/styles/globals.css`.
- Resultado: cada secao de `/controle` agora oferece dois caminhos com os mesmos filtros: `Lista`, abrindo `/fichas`, e `PDF`, abrindo `/fichas/pdf`.
- Decisao: os links de lista e PDF compartilham o mesmo builder de parametros para reduzir risco de divergencia entre tela e relatorio.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools confirmou os links da semana atual, proxima semana e antigas pendentes. Clicar em `Lista` da semana atual abriu `/fichas?status=pendente&dataInicio=2026-04-27&dataFim=2026-05-03`, e a listagem mostrou `25 de 39 fichas`, batendo com o contador da secao.
- Caveat: permanece apenas o aviso conhecido de hidratacao por extensao injetando `style` no `<html>`.

## 2026-04-29 - Atalhos para controle

- Fase/modulo: navegacao operacional entre Inicio, Dashboard e Controle.
- Arquivos alterados: `src/app/page.tsx`, `src/features/dashboard/data.ts`, `src/features/dashboard/dashboard-overview.tsx`.
- Resultado: a Home passou a listar o modulo Controle como operacional. No Dashboard, as metricas de fichas pendentes, entregas da semana e antigas pendentes agora apontam para `/controle` ou suas ancoras; os paineis de fila tambem apontam para o controle.
- Decisao: quando a intencao e operar a fila, o destino padrao deve ser `/controle`; `/fichas` continua sendo a listagem detalhada e filtravel.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools confirmou o card Controle na Home, links do Dashboard para `/controle`, `/controle#semana-atual` e `/controle#antigas-pendentes`, mantendo dados reais de 90 pendentes, 39 da semana e 19 antigas.
- Caveat: permanece apenas o aviso conhecido de hidratacao por extensao injetando `style` no `<html>`.

## 2026-04-29 - Filtro de evento em fichas

- Fase/modulo: listagem de fichas, PDF operacional e Dashboard.
- Arquivos alterados: `src/features/fichas/data.ts`, `src/app/fichas/page.tsx`, `src/app/fichas/pdf/route.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/operational-pdf.ts`, `src/features/dashboard/data.ts`.
- Resultado: `/fichas` e `/fichas/pdf` agora aceitam `evento=true` ou `evento=false` como filtro por URL. A toolbar ganhou o select Evento e a paginacao/PDF preservam esse filtro.
- Decisao: a metrica `Eventos pendentes` do Dashboard agora aponta para `/fichas?status=pendente&evento=true`, porque esse fluxo pede uma listagem filtravel e nao o controle semanal.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools confirmou a metrica `Eventos pendentes24` apontando para `/fichas?status=pendente&evento=true`; a tela filtrada mostrou `Exibindo 24 de 24 fichas encontradas`, select Evento em `true` e PDF em `/fichas/pdf?evento=true&status=pendente`.
- PDF: `http://localhost:3000/fichas/pdf?status=pendente&evento=true` respondeu HTTP 200, `application/pdf`, bytes validos iniciando com `%PDF-1.4`.
- Caveat: permanece apenas o aviso conhecido de hidratacao por extensao injetando `style` no `<html>`.

## 2026-04-29 - Filtro de evento em relatorios

- Fase/modulo: relatorios e PDF operacional.
- Arquivos alterados: `src/app/relatorios/page.tsx`, `src/features/relatorios/relatorios-overview.tsx`.
- Resultado: `/relatorios` agora tambem aceita e preserva `evento=true` ou `evento=false`, mantendo paridade com `/fichas` e `/fichas/pdf`.
- Decisao: o relatorio continua usando o mesmo loader do PDF operacional; a tela apenas expõe o filtro e preserva o parametro no link de exportacao.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools em `/relatorios?status=pendente&evento=true` confirmou status `pendente`, evento `true`, resumo `Total filtrado24`, `Pendentes24`, `Eventos24`, 24 linhas e PDF `/fichas/pdf?evento=true&status=pendente`.
- Caveat: permanece apenas o aviso conhecido de hidratacao por extensao injetando `style` no `<html>`.

## 2026-04-29 - Home alinhada ao progresso real

- Fase/modulo: tela inicial da nova aplicacao.
- Arquivos alterados: `src/app/page.tsx`.
- Resultado: a Home deixou de indicar bootstrap/modelagem como proximos passos e passou a refletir a fase atual: paridade com dados reais agora, autenticacao e homologacao como proxima frente.
- Decisao: Clientes, Controle, Dashboard e Relatorios ficam marcados como `Operacional`; Fichas continua `Prioritario` por ser o fluxo central que ainda concentra ajustes de paridade fina.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Browser: Edge DevTools confirmou os textos `Paridade com dados reais` e `Autenticacao e homologacao`, alem dos badges esperados nos cinco modulos.
- Caveat: permanece apenas o aviso conhecido de hidratacao por extensao injetando `style` no `<html>`.

## 2026-04-29 - Relatorios deixam de ser listagem redundante

- Fase/modulo: relatorios no modelo do legado.
- Arquivos alterados: `src/app/relatorios/page.tsx`, `src/app/relatorios/excel/route.ts`, `src/features/relatorios/data.ts`, `src/features/relatorios/relatorios-legado-overview.tsx`, `src/styles/globals.css`.
- Resultado: `/relatorios` passou a usar uma base agregada por periodo, com estatisticas principais, taxa de entrega, top vendedor, resumo por vendedor, materiais, produtos, clientes, tamanhos e personalizacoes. A pagina deixou de ser apenas uma listagem parecida com `/fichas`.
- Exportacao: criada rota `/relatorios/excel` que gera arquivo `.xls` compativel com Excel contendo resumo, dados detalhados, vendedores, materiais, produtos e tamanhos.
- Decisao: manter o componente antigo de relatorios no codigo por enquanto como referencia temporaria, mas a rota `/relatorios` agora aponta para a versao alinhada ao legado. A exportacao Excel foi implementada no servidor para funcionar em Vercel sem depender de biblioteca client-side.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas.
- Verificacao local: Edge DevTools ficou indisponivel por limite de uso da sessao. Validacao HTTP confirmou `/relatorios` com status 200 e secoes de vendedores, materiais, produtos e tamanhos; `/relatorios/excel?periodo=mes` respondeu 200, `application/vnd.ms-excel`, arquivo `relatorio-producao-mes-2026-04-29.xls` e 22865 bytes.
- Caveat: ainda falta refinar a paridade visual/comportamental completa com o legado, incluindo comparativo, heatmap e filtros locais de vendedor/material/produto.

## 2026-04-29 - Relatorios com comparativo e atividade

- Fase/modulo: paridade do relatorio legado.
- Arquivos alterados: `src/features/relatorios/data.ts`, `src/features/relatorios/relatorios-legado-overview.tsx`, `src/styles/globals.css`, `src/styles/tokens/colors.css`.
- Resultado: `/relatorios` recebeu os blocos `Atividade de Criação de Fichas` com heatmap dos ultimos 365 dias e `Comparativo com Período Anterior` para fichas, itens, clientes e taxa de entrega.
- Decisao: o heatmap e o comparativo ficam server-rendered por enquanto, calculados a partir do Supabase, para manter a tela leve e compativel com Vercel antes de adicionar filtros locais interativos.
- Tokens: usos antigos de `rgba()` em `globals.css` foram substituidos por tokens (`--shadow-sidebar`, `--shadow-inset-subtle`, `--shadow-text-soft`, `--color-overlay`) centralizados em `src/styles/tokens/colors.css`.
- Validacao: `npm run supabase:check`, `npm run typecheck`, `npm run lint`, `npm run build`, scan de encoding e scan de cores diretas em arquivos de UI modificados.
- Verificacao local: validacao HTTP confirmou `/relatorios` com status 200 e presenca de atividade, comparativo, taxa de entrega, top vendedor e exportacao Excel; `/relatorios/excel?periodo=mes` respondeu 200, `application/vnd.ms-excel`, 22865 bytes e conteudo de `Dados Detalhados`.
- Caveat: Edge DevTools segue indisponivel por limite de uso da sessao; falta implementar filtros locais de vendedor/material/produto no novo relatorio.
## 2026-04-29 - Consolidação de rotas operacionais

- Fase/módulo: simplificação da navegação Next em `src/app`, `src/features`, `src/lib/navigation.ts`, `src/components/ui/app-navigation.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/actions.ts` e `src/styles/globals.css`.
- Resultado: `/dashboard` e `/controle` foram removidas como rotas ativas. `/fichas` passa a concentrar filtros operacionais, atalhos de semana/próxima semana/antigas pendentes e ação de marcar ficha pendente como entregue. `/relatorios` permanece como área de indicadores, comparativos e exportação Excel.
- Decisão: evitar duplicidade de comandos e leituras entre dashboard/controle/fichas. A separação final fica: operação diária em `/fichas`; análise e exportação em `/relatorios`.
- Validação: `npm run lint`, `npm run typecheck`, `npm run build` e `npm run supabase:check` passaram. Build confirmou a árvore sem `/dashboard` e `/controle`.
- Validação HTTP/DevTools: `GET /`, `/fichas?status=pendente` e `/relatorios` retornaram 200; `/dashboard` e `/controle` retornaram 404. Edge DevTools confirmou navegação sem os itens removidos, título `Fichas | Fichas Técnicas`, presença de “Entregar” e nenhum erro de console capturado.

## 2026-04-29 - Ações da listagem de fichas

- Fase/módulo: paridade operacional da listagem em `src/features/fichas/fichas-overview.tsx`, novo `src/features/fichas/ficha-row-actions.tsx`, novo `src/components/ui/tooltip.tsx`, `src/features/fichas/actions.ts`, `src/features/fichas/data.ts`, `src/app/fichas/pdf/route.ts` e `src/styles/globals.css`.
- Resultado: a coluna “Ações” em `/fichas` agora usa botões icon-only com tooltips para imprimir, editar, marcar como entregue e remover. A remoção usa modal com código de confirmação próprio, foco inicial no campo e retorno de foco ao fechar.
- Decisão: manter o comportamento legado do `dashboard.html`, mas no desenho novo do Next: ações diretas na tabela, tooltip compartilhado em `src/components/ui`, Server Actions para mutações e PDF individual reutilizando `/fichas/pdf?id=<id>`.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Varreduras de mojibake e cores cruas nos arquivos alterados não retornaram ocorrências.
- Validação HTTP/DevTools: `/fichas?status=pendente` retornou 200 com textos de ações e `/fichas/pdf?id=<id>` retornou 200 com `application/pdf`. Edge DevTools confirmou 4 ações por linha, tooltips esperados, modal de remoção abrindo com foco no campo e nenhum erro de console capturado.

## 2026-04-29 - Busca unificada em fichas

- Fase/módulo: simplificação dos filtros de `/fichas` em `src/app/fichas/page.tsx`, `src/app/fichas/pdf/route.ts`, `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/operational-pdf.ts` e `src/styles/globals.css`.
- Resultado: os campos separados de cliente e personalização viraram um único campo `busca`, consultando cliente, cliente auxiliar/alias, vendedor e personalização. O filtro de evento virou checkbox “Somente eventos”.
- Decisão: preservar fallback de leitura para URLs antigas com `cliente` ou `arte`, mas emitir links novos usando `busca`. O checkbox só envia `evento=true` quando marcado.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Varreduras de mojibake e cores cruas nos arquivos alterados não retornaram ocorrências.
- Validação HTTP/DevTools: `/fichas?busca=fernanda&evento=true&status=pendente` retornou 200, sem campos antigos `cliente`/`arte`; Edge DevTools confirmou valor da busca, checkbox marcado, ausência de erros de console e filtros na mesma linha.

## 2026-04-29 - Modal compartilhado e preview de ficha

- Fase/módulo: unificação do modal em `src/components/ui/modal.tsx`, export em `src/components/ui/index.ts`, remoção do overlay próprio de exclusão em `src/features/fichas/ficha-row-actions.tsx` e reconstrução do preview em `src/features/fichas/ficha-preview.tsx`.
- Resultado: confirmação de remoção usa o mesmo `Modal` compartilhado com tamanho `sm`, foco inicial no campo de código e sem backdrop próprio. O preview usa o modal `lg` e agora apresenta cabeçalho operacional, métricas, imagem principal, produtos, especificações técnicas e observações em layout de consulta.
- Decisão: modal passa a aceitar `onClose` ou `onCloseHref` para cobrir fluxos client e rotas com query, evitando implementações paralelas. Foram adicionados tokens básicos de espaçamento, tipografia, raio, z-index e movimento em `src/styles/globals.css`, além de alias `--color-info-soft` em `src/styles/tokens/colors.css`, para corrigir variáveis inválidas que quebravam o preview.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Varreduras de mojibake e cores cruas nos arquivos alterados não retornaram ocorrências.
- Validação DevTools: preview abriu com `modal-content--lg`, sem cover antigo, com painéis de produtos/especificações/observações; modal de remoção abriu com `modal-content--sm`, sem `confirm-dialog-backdrop`, e foco em `confirmationInput`.

## 2026-04-29 - Ajustes de microinteração e loading

- Fase/módulo: ajustes em `src/components/ui/tooltip.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/app/loading.tsx` e `src/styles/globals.css`.
- Resultado: tooltips de ações passam a fechar após clique, o checkbox de evento em `/fichas` mostra “Evento”, e o loading global não usa mais “Preparando a tela”; agora exibe um spinner animado com “Carregando…”.
- Decisão: nenhum módulo novo foi criado. Antes de alterar, foram verificados `Tooltip`, `StatusPanel`, `button-spinner` e estilos existentes; a solução estendeu o primitivo de tooltip e reutilizou CSS global para evitar duplicidade. O tooltip agora usa estado explícito `data-open`, em vez de depender de `:hover`, para não reabrir enquanto o botão continua sob o cursor após clique.
- Correção adicional: o bloqueio do tooltip após clique agora permanece mesmo quando o modal devolve foco ao botão de ação; o tooltip só é liberado no próximo hover real.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Varreduras de mojibake e cores cruas nos arquivos alterados não retornaram ocorrências. Edge DevTools confirmou hover em remover, abertura do modal, fechamento do modal com `data-open` vazio/opacidade `0` e novo hover reabrindo o tooltip.

## 2026-04-29 - Filtros reativos em fichas

- Fase/módulo: refinamento da busca e filtros em `/fichas`.
- Arquivos alterados: `src/features/fichas/fichas-filter-toolbar.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/data.ts`, `src/features/fichas/ficha-row-actions.tsx` e `src/styles/globals.css`.
- Resultado: a barra de filtros não depende mais do botão “Filtrar”. Busca atualiza a URL com debounce, Evento filtra ao marcar/desmarcar, status ganhou “Atrasados” e removeu “Cancelado” da interface, e a ação de imprimir usa o ícone `Printer`.
- Decisão: manter a tabela como Server Component paginado; a barra client apenas atualiza search params. Assim a consulta segue limitada por `range` no Supabase. O filtro “Atrasados” é resolvido no servidor como fichas ainda não entregues (`status != entregue`) com `data_entrega` anterior à data atual em `America/Cuiaba`.
- Ajuste visual: fichas atrasadas deixam de exibir a badge “Pendente” na listagem e passam a exibir “Atrasado” com tom vermelho, usando a mesma regra do filtro. Na coluna de entrega, a data recebe uma linha secundária vermelha com “Atrasado há X dias”.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou ausência do botão Filtrar, opções de status corretas, checkbox Evento atualizando `?evento=true`, status Atrasados atualizando `?status=atrasado` e ícone `lucide-printer` nas ações.

## 2026-04-30 - Menu flutuante de ações

- Fase/módulo: segurança e extensibilidade das ações em `/fichas`.
- Arquivos alterados: `src/components/ui/floating-menu.tsx`, `src/components/ui/index.ts`, `src/features/fichas/ficha-row-actions.tsx`, `src/features/fichas/fichas-overview.tsx` e `src/styles/globals.css`.
- Resultado: ações diretas agora são Visualizar, Imprimir, Editar e Marcar como entregue. A remoção saiu dos botões diretos e foi para um menu de três pontos com Visualizar, Imprimir, Editar e Deletar em vermelho.
- Decisão: criado primitivo compartilhado `FloatingMenu` para evitar menus locais por tela. Ele fecha em clique fora, Escape e clique em item; preserva links reais para navegação e mantém botão para ação destrutiva.
- Validação: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou ícones `Eye`, `Printer`, menu de três pontos, itens esperados, `Deletar` com destaque vermelho, modal de exclusão abrindo a partir do menu e preview abrindo pelo botão Visualizar.

## 2026-04-30 - Direção para concluir a migração

- Fase/módulo: priorização da migração.
- Decisão: a partir daqui, o foco volta para concluir a migração funcional antes de refinamentos longos de paridade visual. Ajustes em `/fichas` seguem apenas quando forem bloqueantes, de segurança operacional ou necessários para fluxo real.
- Pendência futura: a impressão individual da ficha deve virar um módulo próprio, separado do preview, com CSS/layout específico de PDF/impressão e paridade com o legado, incluindo comportamento de dimensionamento para 1, 2, 3 ou mais imagens. O preview continua sendo consulta rápida; a impressão é documento formal.
- Pendência futura: o novo sistema ainda não tem quadro de produção/Kanban equivalente ao legado. Esse módulo deve voltar ao plano depois que a migração base estiver fechada, para recuperar comportamento operacional que ainda não foi reconstruído.
- Pendência futura: autenticação simples por `username` e PIN, com perfis de usuário. O superadmin deve ser o único com acesso a cadastro de usuários e áreas administrativas como catálogos; demais usuários entram apenas nos fluxos operacionais permitidos.
- Critério: terminar rotas, dados, deploy, segurança e fluxos essenciais primeiro; depois voltar refinando o que ficou muito diferente do legado.

## 2026-04-30 - Auditoria de fechamento da migração

- Fase/módulo: revisão para corte funcional.
- Arquivos alterados: `vercel.json`, `plano-migracao-next-supabase.md` e `registro-migracao-next.md`.
- Resultado: a configuração da Vercel foi reduzida para a nova realidade Next, removendo headers e rewrites de rotas legadas que não existem mais na app nova (`/dashboard`, `/kanban`, `/ficha`, `/relatorios-cliente`, assets `/css`, `/js`, entre outras). O deploy passa a depender do roteamento nativo do App Router.
- Situação atual: Supabase está `ready` com 188 clientes, 314 fichas, 1764 itens, 391 imagens e 213 catálogos. `npm run typecheck`, `npm run lint` e `npm run build` passaram.
- Validação DevTools: Home, `/fichas?status=pendente`, `/catalogos` e `/relatorios` carregaram no app Next com dados reais. `/fichas?status=pendente` exibiu 25 de 90 fichas e ações de linha; `/catalogos` exibiu formulário e 65 linhas na categoria ativa; `/relatorios` exibiu link de Excel. Não foram encontrados links ativos para `/dashboard` ou `/controle` nessas telas.
- Leitura de fechamento: a migração funcional está próxima do fim. O que ainda falta para corte é autenticação/autorização, revisão de ambiente Vercel de produção, homologação curta dos fluxos principais, e só depois remoção dos arquivos/dependências legadas.

## 2026-04-30 - Checklist de homologacao e plano alinhado ao auth

- Fase/modulo: continuidade da Fase 9, homologacao e corte funcional.
- Arquivos alterados: `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `src/app/page.tsx`.
- Resultado: criado checklist executavel de homologacao por ambiente, auth/perfis, fichas, clientes, catalogos, relatorios e corte. O plano principal agora marca como concluidos os itens ja validados de login/logout, layout autenticado, rotas protegidas, perfil superadmin, bloqueio de rotas administrativas e checklist de paridade.
- Decisao: a proxima frente deve ser validar producao/Vercel e executar os fluxos reais do checklist, em vez de continuar polindo paridade visual antes do corte.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`, `git diff --check` e scan de mojibake nos arquivos tocados. Supabase retornou `ready` com 188 clientes, 314 fichas, 1764 itens, 391 imagens e 213 catalogos.
- Caveat: ainda falta criar/confirmar credenciais finais de producao, validar variaveis na Vercel e executar a homologacao com dados reais finais.

## 2026-04-30 - Reidratacao das fichas novas de hoje

- Fase/modulo: migracao de dados incremental.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: reidratacao aplicada do legado Turso para Supabase com `npm run migrate:legacy -- --apply`. O dry-run encontrou 318 fichas, 1791 produtos mapeaveis e 396 imagens Cloudinary mapeaveis; antes da aplicacao o Supabase tinha 314 fichas, 1764 itens, 391 imagens e 188 clientes.
- Validacao: `npm run supabase:check` depois da aplicacao retornou `ready` com 191 clientes, 318 fichas, 1791 itens, 396 imagens e 213 catalogos.
- Amostra confirmada: 4 fichas com `data_inicio=2026-04-30`, legacy IDs 352, 353, 354 e 355. As mais recentes sao Fundo Municipal Saude Porto Mutinho, Robson Aparecido de Oliveira, Arnaldo Areco Junior e Gustavo Baldo.
- Decisao: manter essa reidratacao como incremental/idempotente por `legacy_ficha_id`; a migracao final de corte ainda precisa de janela propria.
- Caveat: enquanto o legado continuar recebendo fichas, o Supabase pode voltar a ficar atrasado e sera necessario rodar nova reidratacao antes de homologar/cortar.

## 2026-04-30 - Homologacao local nao destrutiva

- Fase/modulo: Fase 9, homologacao de Fichas, Clientes e Relatorios.
- Arquivos alterados: `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`, `src/features/relatorios/data.ts`, `src/features/relatorios/relatorios-legado-overview.tsx`, `src/app/relatorios/page.tsx`, `src/app/relatorios/excel/route.ts`.
- Resultado: filtros de `/fichas` validados por busca/status/evento/periodo; preview e PDF individual validados com a ficha legacy 355; PDF operacional filtrado validado; busca de cliente e detalhe com historico validados; `/relatorios` passou a aceitar `status` e `evento` alem de periodo/data; Excel preserva os mesmos filtros.
- Validacao HTTP: `/fichas?busca=Fundo&status=pendente`, `/fichas?preview=<id>&busca=Fundo&status=pendente`, `/fichas/pdf?id=<id>`, `/fichas/pdf?status=pendente&dataInicio=2026-04-30&dataFim=2026-05-31`, `/clientes?termo=Fundo%20Municipal`, `/clientes/<id>`, `/relatorios?periodo=mes&status=pendente&evento=true` e `/relatorios/excel?periodo=mes&status=pendente&evento=true` responderam 200 com dados esperados. O relatorio filtrado bateu com Supabase em 19 fichas pendentes de evento no mes.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. Supabase retornou `ready` com 191 clientes, 318 fichas, 1791 itens, 396 imagens e 213 catalogos. Scan de mojibake nos arquivos alterados nao retornou ocorrencias.
- Decisao: marcar no checklist apenas os itens nao destrutivos ja homologados; criacao/edicao/entrega de ficha e CRUD completo de cliente/catalogo ficam para uma rodada mutavel controlada.
- Caveat: o dev server ja estava rodando em `localhost:3000`; tentativa de subir outro em `3100` falhou porque havia servidor Next ativo. Validacao de producao/Vercel e mobile ainda nao foi feita.

## 2026-04-30 - Homologacao mutavel de clientes e catalogos

- Fase/modulo: Fase 9, homologacao mutavel controlada.
- Arquivos alterados: `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: Playwright headless com sessao temporaria de superadmin validou fluxos reais pela UI: criacao de cliente temporario, edicao do cliente, erro de duplicidade por nome normalizado, criacao de item temporario em catalogo, edicao/desativacao do item e ausencia do item desativado no formulario de ficha.
- Limpeza: o script removeu cliente, item de catalogo e sessao temporaria no `finally`. Consulta posterior confirmou `clientes_temp=0`, `catalogos_temp=0`, total de 191 clientes e 213 itens de catalogo.
- Validacao: `npm run supabase:check` retornou `ready` com 191 clientes, 318 fichas, 1791 itens, 396 imagens e 213 catalogos.
- Decisao: marcar no checklist os fluxos de Clientes e Catalogos homologados; manter Fichas mutaveis abertas porque criar ficha com imagem envolve upload Cloudinary real e deve ser validado numa rodada dedicada com limpeza de midia.
- Caveat: a primeira tentativa do Playwright precisou de permissao elevada por `spawn EPERM`; a primeira execucao criou um cliente temporario e falhou no botao de edicao por rotulo diferente, mas o `finally` limpou o registro antes da repeticao bem-sucedida.

## 2026-04-30 - Homologacao mutavel de fichas

- Fase/modulo: Fase 9, homologacao mutavel de Fichas.
- Arquivos alterados: `src/features/fichas/data.ts`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: Playwright headless com sessao temporaria de superadmin validou pela UI real a criacao de ficha temporaria com cliente, produto, especificacoes basicas e imagem; edicao da ficha preservando item e imagem; filtro por numero da venda; acao de marcar como entregue com `delivered_at` preenchido.
- Ajuste implementado: a busca unificada de `/fichas` e `/fichas/pdf` agora tambem consulta `numero_venda`. A lacuna apareceu durante a homologacao porque a ficha temporaria nao era encontrada ao buscar pelo numero da venda.
- Limpeza: a ficha, itens, referencias de imagem e cliente temporario foram removidos no `finally`. Consulta posterior confirmou `fichas_temp=0`, `clientes_temp=0`, mantendo 191 clientes, 318 fichas, 1791 itens e 396 imagens.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram; Supabase retornou `ready` com 191 clientes, 318 fichas, 1791 itens, 396 imagens e 213 catalogos.
- Decisao: usar uma imagem Cloudinary ja existente como referencia compartilhada para validar persistencia de imagem sem criar arquivo novo e sem risco de midia orfa. A limpeza removeu somente as referencias locais da ficha temporaria.
- Caveat: a primeira tentativa de entrega falhou porque a busca ainda nao considerava `numero_venda`; depois do ajuste, o fluxo passou. Upload novo de arquivo no Cloudinary nao foi repetido nesta rodada para evitar midia orfa desnecessaria.

## 2026-04-30 - Homologacao desktop/mobile e rollback

- Fase/modulo: Fase 9, responsividade, performance basica e plano de rollback.
- Arquivos alterados: `src/styles/globals.css`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: corrigido overflow horizontal na listagem de fichas. A tabela continua com largura minima propria, mas o scroll fica contido em `.ui-table-wrap`; `app-shell`, `app-main`, `fichas-view`, `fichas-view__header`, `fichas-toolbar` e `fichas-list-container` agora aceitam encolhimento correto em desktop estreito e mobile.
- Validacao Playwright: `/`, `/fichas?status=pendente`, `/fichas/nova`, `/clientes?termo=Fundo`, `/catalogos?tipo=produto`, `/usuarios` e `/relatorios?periodo=mes&status=pendente&evento=true` passaram em 1366x768 e 390x844, todas com HTTP 200, sem erros de console e sem overflow horizontal do documento. Tempos locais ficaram entre 672ms e 736ms.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. Supabase retornou `ready` com 191 clientes, 318 fichas, 1791 itens, 396 imagens e 213 catalogos.
- Decisao: marcar desktop/mobile, performance local, ajustes finais e plano de rollback como concluido localmente. O rollback documentado preserva legado, backup/export antes do corte, reversao de dominio para o legado em falha de deploy e reimportacao incremental por `legacy_ficha_id` se houver divergencia de dados.
- Caveat: ainda falta validar variaveis/build no ambiente Vercel de producao, criar/confirmar credenciais finais, confirmar backup/export real, apontamento de dominio e executar a janela final de corte.

## 2026-05-01 - Auditoria local de prontidao de producao

- Fase/modulo: Fase 9, ambiente de producao e corte.
- Arquivos alterados: `scripts/check-production-readiness.mjs`, `package.json`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: criado `npm run prod:check` para transformar a validacao pre-corte em uma checagem repetivel. O script valida envs runtime exigidas na Vercel, envs Turso para importacao final, nomes publicos suspeitos, `.env` gitignored, link/CLI Vercel, `vercel.json`, contagens Supabase, superadmin ativo e ausencia de usuarios temporarios Codex.
- Validacao local: `npm run prod:check` retornou `action-required` apenas por Vercel local: `.vercel/project.json` ausente e CLI `vercel` indisponivel. Passaram Supabase, Cloudinary, Turso, higiene de secrets, `vercel.json`, 191 clientes, 318 fichas, 1791 itens, 396 imagens, 213 catalogos, 2 usuarios, 1 superadmin ativo e 0 usuarios temporarios Codex.
- Checks: `node --check scripts/check-production-readiness.mjs`, `npm run lint` e scan de mojibake nos arquivos tocados passaram.
- Decisao: manter a validacao Vercel/producao aberta ate linkar o projeto com Vercel CLI ou conferir as mesmas variaveis/build/dominio pela Dashboard. A checagem local agora documenta exatamente o que falta.
- Caveat: `npm run prod:check` falha de proposito enquanto o projeto nao estiver linkado a Vercel neste checkout; isso e bloqueio de ambiente, nao falha do app local.

## 2026-05-01 - Correcao do preview deploy Vercel

- Fase/modulo: preview de producao Vercel.
- Arquivos alterados: `src/app/global-error.tsx`, `registro-migracao-next.md`.
- Resultado: adicionado `global-error.tsx` minimo e autocontido para o App Router. O preview deploy falhou ao prerenderizar `/_global-error` com erro de `useContext`; a tela global agora nao depende do layout, `ToastProvider` ou primitivas client compartilhadas.
- Decisao: manter o `error.tsx` de rota com os componentes do design system, mas deixar o erro global com HTML/body proprios, como rota de fallback extremo do Next.
- Caveat: ainda e necessario republicar a branch de preview e confirmar o novo deploy Vercel.

## 2026-05-01 - Isolamento adicional das telas de erro

- Fase/modulo: preview de producao Vercel.
- Arquivos alterados: `src/app/error.tsx`, `registro-migracao-next.md`.
- Resultado: `error.tsx` tambem deixou de importar o barrel `@/components/ui`; a tela de erro de rota agora usa markup direto com as classes globais existentes. Isso reduz o grafo client carregado durante prerender de erro e evita puxar hooks/contextos por exports compartilhados.
- Caveat: apos o commit, conferir se o erro ativo da Vercel esta no commit novo e nao no deploy antigo `2b93065`.

## 2026-05-01 - Build defensivo contra NODE_ENV incorreto na Vercel

- Fase/modulo: preview de producao Vercel.
- Arquivos alterados: `scripts/build-next.mjs`, `package.json`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: `npm run build` agora chama um wrapper Node que define `NODE_ENV=production` somente para o processo do Next antes de executar `next build`. O log do deploy indicava `NODE_ENV` nao padrao na Vercel, diferenca que nao existia no build local normal e que pode causar inconsistencias no React/Next durante o prerender.
- Validacao: `node --check scripts/build-next.mjs`, `npm run lint` e `npm run build` passaram. A simulacao local com `NODE_ENV=preview` deixou de emitir o warning do Next, confirmando que o wrapper normaliza o ambiente antes do build; nesta maquina ela ainda parou em `spawn EPERM`, limitacao local ja vista em builds com workers.
- Decisao: manter a validacao Vercel/producao aberta ate republicar o preview e confirmar o deploy. Idealmente, remover tambem qualquer variavel `NODE_ENV` customizada no Dashboard da Vercel.

## 2026-05-01 - Validacao Vercel de producao sem deploy

- Fase/modulo: Fase 9, ambiente Vercel de producao.
- Arquivos alterados: `.gitignore`, `eslint.config.mjs`, `scripts/check-production-readiness.mjs`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: Vercel CLI autenticado como `lucascelli`, workspace linkado explicitamente ao projeto existente `lucascellis-projects/fichaprimalhas` e `.vercel` adicionado ao `.gitignore`. O auditor `npm run prod:check` foi ajustado para aceitar `npx vercel --version` no Windows quando o binario global `vercel` nao existe.
- Validacao: `npm run prod:check` passou como `ready-for-production-cutover`, com 191 clientes, 318 fichas, 1791 itens, 396 imagens, 213 catalogos, 2 usuarios, 1 superadmin ativo e 0 usuarios temporarios Codex. `npx vercel env ls` confirmou envs Supabase, Cloudinary e Turso no projeto. `npx vercel pull --yes --environment production` baixou settings/envs para `.vercel` ignorado, e `npx vercel build --prod` passou sem warnings bloqueantes. `eslint.config.mjs` passou a ignorar `.vercel/**` para nao lintar artefatos gerados pelo build.
- Decisao: marcar a validacao Vercel/producao da Fase 9 como concluida localmente, sem publicar nova versao e sem alterar dominio. Fase 10 continua dependendo de congelar o legado, rodar migracao final de dados, confirmar backup/export, publicar e testar em producao.
- Caveat: o projeto Vercel ainda lista variaveis legadas como `NODE_ENV`, `PORT`, `DB_PATH`, `RATE_LIMIT_*` e `LOG_LEVEL`; `NODE_ENV` customizado continua recomendado para remocao pela Dashboard antes do corte, embora o build wrapper ja force `production` no processo do Next.

## 2026-05-01 - Correcao do framework Vercel

- Fase/modulo: preview Vercel e roteamento de runtime.
- Arquivos alterados: `vercel.json`, `registro-migracao-next.md`.
- Resultado: o preview `dpl_JBvEPrN4oGiskCDCXAaPoBJHEHkj` ficou `READY`, mas `/login` retornou `FUNCTION_INVOCATION_FAILED`. Logs da Vercel mostraram `Cannot find module '@libsql/linux-x64-gnu'` vindo de `server.js`; a inspecao de `.vercel/output/functions/index.func/.vc-config.json` mostrou `framework: express` e `handler: server.js`, ou seja, o projeto Vercel ainda estava usando o preset legado em vez do Next App Router.
- Ajuste: `vercel.json` agora define `"framework": "nextjs"`, sobrescrevendo o framework `express` salvo no Project Settings e evitando que o deploy use `server.js` como handler principal.
- Caveat: o primeiro preview remoto depois do ajuste (`dpl_9CVReyGZPu8rbyGZXfsu7C5fCQ9U`) compilou como Next, mas a Vercel avisou que encontrou `.env` no pacote. `.vercelignore` passa a bloquear `.env`, `.env.*`, `.next`, `.vercel`, `node_modules`, logs e `tsconfig.tsbuildinfo` antes da proxima republicacao.
- Validacao final: preview limpo `dpl_7W76QvxmaASAyEs3e7pvSSnzNwhn` publicado em `https://fichaprimalhas-jje6nwgma-lucascellis-projects.vercel.app`; build remoto usou Next.js/App Router sem aviso de `.env`, `vercel inspect` mostrou funcoes Next como `_not-found` e rotas API, `vercel curl /login` retornou HTML da tela de login e `vercel logs --level error --since 10m` nao encontrou erros. Checks finais: `node --check scripts/check-production-readiness.mjs`, `npm run lint`, `npm run prod:check`, `git diff --check` e scan de mojibake no diff passaram. A copia temporaria `C:\tmp\ficha_prod_vercel_preview`, que recebeu envs de preview durante o teste de symlink, foi removida.

## 2026-05-01 - Pre-corte de dados e backup local

- Fase/modulo: Fase 10, pre-corte de dados.
- Arquivos alterados: `.gitignore`, `package.json`, `scripts/export-cutover-snapshot.mjs`, `CHECKLIST_HOMOLOGACAO_NEXT.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: criado `npm run backup:cutover` para gerar snapshot local em `data/backups/`, ignorado no Git. O snapshot exporta fichas legadas do Turso, tabelas operacionais do Supabase e resumo seguro de usuarios sem PIN/hash.
- Validacao: `npm run prod:check` passou como `ready-for-production-cutover`; `npm run supabase:check` retornou `ready`; `npm run migrate:legacy` em dry-run encontrou 318 fichas, 1791 produtos mapeaveis e 396 imagens Cloudinary mapeaveis, iguais as contagens atuais do Supabase. `npm run backup:cutover` gerou `data\backups\cutover-snapshot-2026-05-01T14-27-12-654Z.json` com 318 fichas legadas, 191 clientes, 318 fichas Supabase, 1791 itens, 396 imagens, 213 catalogos e 2 usuarios no resumo.
- Decisao: marcar backup/export e validacao de dados como concluidos para o pre-corte. Nao marcar migracao final nem publicacao porque o legado ainda nao foi congelado e o dominio de producao ainda nao foi trocado.
- Caveat: os usuarios ativos encontrados sao `nhx` como superadmin e `fernanda` como operadora; manter `Criar credenciais finais de producao` aberto ate confirmacao explicita de que esses acessos sao finais.
- Gate de producao: `vercel inspect fichaprimalhas.vercel.app` confirmou que o dominio de producao ainda aponta para `dpl_Gvpsn4Qg2dFxqFbHnqe86AozjfwF`, criado em 2026-05-01 00:25, com build Express/funcao `index`. `vercel project inspect fichaprimalhas` ainda mostra Framework Preset `Express` no Project Settings; o `vercel.json` versionado com `"framework": "nextjs"` deve sobrescrever isso no proximo deploy, mas a publicacao de producao ficou bloqueada ate congelamento/ok explicito.

## 2026-05-01 - Polimento do formulario de fichas

- Fase/modulo: polimento pre-producao, formulario de criacao/edicao de fichas.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: adicionado `@hello-pangea/dnd` como base compartilhavel para drag/drop. O formulario Next agora permite reordenar produtos e imagens com `DragDropContext`/`Droppable`/`Draggable`, adicionar imagens por selecao, drop ou Ctrl+V, ordenar produtos automaticamente por tamanho, editar observacoes com toolbar simples e gerar auto-preenchimento aproximado da regra legada com texto em caixa alta, separadores `/` e blocos de tecido, manga, gola, bolso, filete, faixa, personalizacao e nomes/numeros.
- Confirmacao de paridade ja existente: criacao e edicao carregam os mesmos catalogos/datalists via `listCatalogOptionsForFichaForm()`, preservando produtos, tamanhos, tecidos, cores, mangas, acabamentos, golas e bolsos ativos.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Abertura local de `/fichas/nova` redirecionou para `/login`, confirmando a protecao da rota; validacao visual autenticada ainda depende de PIN/sessao. `npm install @hello-pangea/dnd` reportou 4 vulnerabilidades no grafo atual; nao foi rodado `npm audit fix` automatico para evitar upgrades fora de escopo.
- Decisao: registrar o polimento como checklist proprio no plano principal para separar itens ja implementados das pendencias criticas restantes.
- Caveat: ainda falta validar visualmente a regra de auto-preenchimento com sessao autenticada e reconstruir a impressao/PDF individual fiel ao legado antes de considerar a paridade critica fechada.

### Ajuste de fluidez do drag/drop

- Ajuste: produtos e imagens agora usam o snapshot do `Droppable` para destacar a area de destino durante o arraste, e os cards arrastados recebem elevacao visual.
- Ajuste: a grade de imagens passou a dimensionar cada card como 1/4 da largura disponivel em desktop, com minimo responsivo para nao esmagar em telas pequenas.
- Ajuste: botoes de reordenar/remover imagem foram movidos para uma barra propria no card; a badge `Pendente` deixou de ficar sobreposta ao handle de drag/drop.
- Ajuste: novas imagens adicionadas por selecao, drop ou Ctrl+V entram com a descricao vazia; o nome do arquivo fica apenas como fallback interno no upload.
- Ajuste: o card inteiro da imagem passou a ser o handle de drag/drop, economizando espaco; o input de descricao e o botao remover param a propagacao para nao iniciar arraste durante edicao/remocao.
- Ajuste: a grade de imagens agora segue a regra de largura por quantidade: 1 imagem com 1/3 da largura total, 2 imagens com 1/2 cada, 3 imagens com 1/3 cada e 4 imagens com 1/4 cada, mantendo minimos responsivos.
- Ajuste: o input de descricao recebeu estilo do sistema, foco visivel e placeholder especifico (`Ex: frente, costas, detalhe do bordado`), deixando de parecer input generico.
- Ajuste: corrigido estouro visual durante o arraste com largura maxima aplicada ao item em drag; 1 imagem passou para 1/2 da largura total.
- Ajuste: topo do card agora mostra `Imagem N`, a badge `Pendente` fica no topo e o botao remover recebeu hover/focus vermelho.
- Ajuste: clone de arraste das imagens voltou a manter o mesmo formato do card em repouso; removido override manual de largura/preview durante drag e fixada a largura do card pela variavel `--image-card-width`, deixando o `@hello-pangea/dnd` preservar as dimensoes medidas.
- Ajuste: preview da imagem travado por quantidade com `--image-preview-height` e `background-size: contain`, impedindo que a imagem escale e aumente o card durante o arraste.
- Ajuste: largura do card de imagem tambem foi travada durante o arraste; `onDragStart` mede o card em pixels e aplica `width/minWidth/maxWidth` no item enquanto ele esta em drag, evitando que percentuais sejam recalculados contra o viewport.
- Ajuste: medicao de largura passou de `onDragStart` para `ResizeObserver`, guardando a largura real de cada card antes do primeiro frame de arraste e aplicando `width/minWidth/maxWidth` no clone.
- Ajuste: corrigida largura fina do clone; a largura agora e calculada pela largura da grade e quantidade de imagens, nao pelo card potencialmente deformado, e aplicada em pixels tanto em repouso quanto durante drag.
- Ajuste: inicio do arraste estabilizado; handle de produto deixou de ser `<button>` dentro do formulario e virou handle nao-interativo com `role="button"`, handles/cards receberam `touch-action` e `user-select` adequados, e campos/botoes dentro do card de imagem param `pointerdown` para nao disputar com o sensor de drag.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram.

## 2026-05-02 - React Hook Form no formulario de fichas

- Fase/modulo: polimento pre-producao, formulario de criacao/edicao de fichas.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: instalados `react-hook-form` e `@hookform/resolvers`. O `FichaForm` agora usa `useForm`, `useWatch` e `useFieldArray` como fonte central para produtos, imagens, observacoes e campos condicionais de ficha.
- Resultado: operacoes dinamicas de produtos/imagens migraram para field arrays: adicionar, duplicar, remover, ordenar por tamanho, reordenar por drag/drop e substituir imagens apos upload usam `append`, `remove`, `move`, `replace` e `update`.
- Decisao: manter por enquanto a Server Action e os hidden payloads `itensJson`/`imagensJson` como contrato final, reduzindo risco nesta troca estrutural.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram.
- Caveat: `npm install react-hook-form @hookform/resolvers` manteve 4 vulnerabilidades reportadas no grafo atual; nao foi rodado `npm audit fix` automatico para evitar upgrades fora de escopo. Demais formularios ficam para ponto futuro.

## 2026-05-02 - Planejamento de bibliotecas recomendadas

- Fase/modulo: planejamento de polimento e reducao de hardcode.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: `plugins-recomendados.md` foi incorporado ao plano principal como trilha de adocao por frente: URL state/filtros, datas, toasts async, tabelas, date range picker, dashboard/Kanban, graficos, estado local e editor rico.
- Decisao: nao instalar todas as bibliotecas em lote. Cada pacote entra junto da implementacao que remove hardcode real ou fecha uma pendencia do plano.
- Ordem registrada: `nuqs`, `date-fns` e `sonner`; depois `@tanstack/react-table` e `react-day-picker`; depois `@tanstack/react-query`, `recharts`, `react-resizable-panels` e `zustand`; por fim Tiptap para a paridade fina das observacoes.
- Validacao: edicao documental; sem build necessario.

## 2026-05-02 - Refinamento visual do formulario de ficha

- Fase/modulo: polimento pre-producao, formulario de criacao/edicao de fichas.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: instalado `react-day-picker` e criado `DatePickerField` para `dataInicio` e `dataEntrega`, mantendo o valor enviado como `yyyy-mm-dd` para nao alterar o contrato das Server Actions.
- Resultado: a secao de produtos deixou de usar destaque warning/alaranjado e passou para verde/success. A area de imagens passou a usar destaque cinza. A lista de produtos foi reestilizada como tabela compacta, com cabecalho, linhas alternadas, bordas contidas e hover sutil.
- Resultado: o botao `Ordenar por tamanho` saiu do rodape e foi para a direita acima da coluna `Acoes`; ao ordenar, a lista recebe flash visual e um status curto `Produtos ordenados`.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Login local com operador de teste abriu `http://localhost:3000/fichas/nova`; DevTools confirmou formulario autenticado, produtos com destaque verde, imagens com destaque cinza, date picker abrindo e feedback `Produtos ordenados` ao usar o botao de ordenacao.
- Caveat: `npm install react-day-picker` manteve as 4 vulnerabilidades ja reportadas no grafo atual; nao foi rodado `npm audit fix` automatico para evitar upgrades fora de escopo.

### Ajuste da tabela de produtos

- Ajuste: o `CustomDatalist` de produtos deixou de ficar preso/cortado dentro da tabela. A lista de produtos agora permite overflow visivel e eleva a celula/linha focada para o menu ficar selecionavel.
- Ajuste: zebra e hover da tabela foram suavizados; as linhas pares nao usam mais o fundo secundario forte e o hover deixou de pintar a linha de verde.
- Ajuste: botoes de copiar/remover produto usam o `Tooltip` compartilhado. O botao remover recebeu classe propria e hover/focus em danger/vermelho.
- Validacao: DevTools em `/fichas/nova` confirmou o menu de produto abrindo para fora da tabela e o hover danger do remover. `npm run typecheck` e `npm run lint` passaram.

### Ajuste das origens dos datalists

- Ajuste: criado `src/features/fichas/form-options.ts` para centralizar as referencias do formulario. O loader combina catalogos de `catalog_items`, clientes de `clientes` e vendedores distintos de `fichas`.
- Ajuste: `Nome do Cliente` e `Vendedor` trocaram input/datalist nativo por `CustomDatalist`. O vendedor nao usa mais lista hardcoded.
- Ajuste: `getOptions()` do `FichaForm` nao usa mais `FALLBACK_CATALOG_OPTIONS` quando a pagina passou um mapa de catalogos, mesmo que algum kind esteja vazio. Assim campos tecnicos vazios indicam catalogo ausente em vez de mostrar sugestoes genericas.
- Validacao: DevTools em `/fichas/nova` confirmou sugestoes reais para cliente (`clientes`), vendedor (`fichas.vendedor`) e produto (`catalog_items`). `npm run typecheck`, `npm run lint` e `npm run build` passaram.

### Ajuste de observacoes em tempo real

- Ajuste: `Cor da sublimacao` passou a ser condicional e aparece somente quando `Personalizacao` e exatamente `sublimacao`.
- Ajuste: o auto-preenchimento de `Observacoes` agora roda em tempo real ao alterar produto, material, acabamentos, personalizacao e nomes/numeros.
- Origem legado: a regra foi rastreada em `public/js/main.js`, funcao `initObservacoesAutoFill()`, incluindo o padrao de `ultimoTextoAuto` e bloqueio quando o usuario edita manualmente.
- Decisao: manter a protecao de texto manual no Next; o botao `Auto-preencher` continua como acao forcada para regenerar o texto.
- Validacao: DevTools em `/fichas/nova` confirmou que o campo de cor aparece com `sublimacao`, some ao trocar para `bordado` e as observacoes recalculam de `PERSONALIZADO EM SUBLIMACAO` para `PERSONALIZADO EM BORDADO` sem recarregar. `npm run typecheck`, `npm run lint` e `npm run build` passaram.

### Impressao individual da ficha

- Ajuste: o botao individual de imprimir na listagem deixou de abrir `/fichas/pdf?id=...` e passou a abrir `/fichas/[id]/imprimir`, separando impressao individual do PDF operacional de listagem.
- Ajuste: criada a rota `src/app/fichas/[id]/imprimir/page.tsx` e os modulos `PrintFicha`, `PrintOnLoad` e `PrintPageActions`.
- Origem legado: estrutura copiada conceitualmente de `public/ficha.html` (`#print-version`, `print-card`, `print-two-cols`, `print-table`, `print-imagesContainer`), montagem baseada em `public/js/main.js::gerarVersaoImpressao()` e estilos baseados no trecho de impressao de `public/css/style.css`.
- Resultado: a ficha impressa agora e montada a partir dos dados da ficha carregados do Supabase, com dados do pedido, produtos, totais, especificacoes tecnicas, observacoes ricas e imagens ordenadas.
- Comportamento: a rota dispara `window.print()` automaticamente; `?autoprint=0` fica como parametro interno de validacao para inspecionar o layout sem abrir o dialogo de impressao.
- Validacao: DevTools confirmou `/fichas/[id]/imprimir?autoprint=0` com `#print-version`, 5 secoes, linhas de produto e imagem renderizada. `npm run typecheck`, `npm run lint` e `npm run build` passaram.

## 2026-05-02 - Impressao em modal e cores do legado

- Fase/modulo: polimento pre-producao, impressao individual de fichas.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/components/ui/modal.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/index.ts`, `src/app/fichas/page.tsx`, `src/app/fichas/[id]/page.tsx`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-print-dialog.tsx`, `src/features/fichas/ficha-row-actions.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/print-ficha.tsx`, `src/styles/globals.css`, `src/styles/tokens/colors.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: instalados `@radix-ui/react-dialog` e `@radix-ui/react-alert-dialog`; o modal compartilhado usa Radix Dialog e a confirmacao de exclusao usa AlertDialog.
- Resultado: a impressao da listagem nao abre mais nova guia. O link gera `/fichas?print=<id>` e renderiza um modal com iframe para `/fichas/[id]/imprimir?autoprint=0`. A edicao ganhou botao `Imprimir ficha`, que abre o mesmo modal com `?print=1`.
- Resultado: a logica de cores da tabela impressa foi alinhada ao legado em `public/js/main.js::gerarVersaoImpressao()`: quando ha mais de um produto ou mais de uma descricao, aplica cores; quando descricoes distintas existem, a descricao vira referencia de cor e a coluna de detalhes tambem recebe a cor. O catalogo de cores foi ampliado e movido para tokens de impressao.
- Decisao: manter `/fichas/[id]/imprimir` como rota formal e usar o modal apenas como camada de preview/acao, evitando abrir aba e preservando URL recuperavel.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou `/fichas?print=7f8ed7ad-1378-4099-a084-9e54752fcf3e` com um modal, iframe para `/imprimir?autoprint=0`, `#print-version` carregado, nenhum erro de console e somente uma aba aberta. Em `/fichas/7f8ed7ad-1378-4099-a084-9e54752fcf3e?print=1`, o botao de edicao abriu o mesmo modal sem erros.
- Caveat: `npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog` manteve as 4 vulnerabilidades ja reportadas no grafo atual; nao foi rodado `npm audit fix` automatico para evitar upgrades fora de escopo.

### Ajuste de empilhamento do modal

- Ajuste: apos a troca para Radix, `Overlay` e `Content` deixaram de ter relacao pai/filho. O CSS antigo tentava centralizar o modal pelo overlay, o que deixou o backdrop/blur competindo com o conteudo. `.modal-overlay` agora e apenas a camada fixa de fundo, e `.modal-content` virou `position: fixed` centralizado, com `z-index` acima do overlay.
- Validacao: Edge DevTools em `/fichas/7f8ed7ad-1378-4099-a084-9e54752fcf3e?print=1` confirmou `overlayZ=50`, `contentZ=51`, `contentPosition=fixed`, `elementFromPoint` no frame da impressao e screenshot nitido do modal. `npm run typecheck` e `npm run lint` passaram.

### Ajuste do fluxo preview/imprimir

- Ajuste: a acao de preview/visualizar da listagem passou a abrir a previa de impressao em modal por `/fichas?print=<id>`.
- Ajuste: a acao `Imprimir` deixou de abrir modal; agora vai direto para `/fichas/[id]/imprimir`, rota que dispara a impressao automaticamente e nao abre nova guia.
- Ajuste: o botao `Imprimir ficha` da pagina de edicao tambem aponta direto para `/fichas/[id]/imprimir`; o modal `?print=1` foi removido dessa tela.
- Validacao: Edge DevTools confirmou na listagem que `Visualizar` gera `/fichas?print=<id>` com modal/iframe de previa, enquanto `Imprimir` gera `/fichas/<id>/imprimir`, sem modal e com `#print-version` renderizado. Na edicao, o botao aponta para `/imprimir` e nao existe mais link `print=1`. `npm run typecheck`, `npm run lint` e `npm run build` passaram.

### Ajuste da previa limpa

- Ajuste: a previa no modal deixou de carregar a pagina completa de impressao. O iframe agora usa `/fichas/[id]/imprimir?autoprint=0&embed=1`.
- Ajuste: `proxy.ts` sinaliza `x-ficha-print-embed=1` para essa URL, e `src/app/layout.tsx` nao envolve esse modo com `AppShell`.
- Ajuste: `PrintFicha` ganhou modo `document`, que renderiza somente a ficha imprimivel (`#print-version`), sem `PrintOnLoad`, sem toolbar `#normal-version`, sem botao `Voltar` e sem botao `Imprimir`.
- Ajuste: `FichaPrintDialog` ficou apenas com o iframe da ficha; sem cabecalho ou botao de imprimir dentro do modal.
- Validacao: Edge DevTools confirmou no iframe `hasAppShell=false`, ausencia de `.app-frame`, `.app-sidebar`, `.print-page-toolbar`, `#normal-version`, links e botoes, com `#print-version` presente e screenshot limpo da ficha. `npm run typecheck`, `npm run lint` e `npm run build` passaram.

### Simplificacao final do fluxo

- Ajuste: removido o desvio por iframe/embed. `PrintFicha` voltou a ser o componente puro da ficha imprimivel, sem `PrintOnLoad`, sem modo, sem toolbar, sem shell, sem links e sem botoes.
- Ajuste: `/fichas/[id]/imprimir` agora compoe `PrintOnLoad` + `PrintFicha`, mantendo a impressao direta nessa rota.
- Ajuste: o modal de previa em `/fichas?print=<id>` busca a ficha no servidor e renderiza o mesmo `PrintFicha` diretamente dentro do modal.
- Remocao: apagados `src/features/fichas/ficha-print-dialog.tsx` e `src/features/fichas/print-page-actions.tsx`; removidos `embed=1`, `x-ficha-print-embed` e a excecao correspondente em `src/app/layout.tsx`.
- Validacao: Edge DevTools confirmou previa sem iframe, com `#print-version` direto dentro do modal; rota `/fichas/[id]/imprimir?autoprint=0` com `#print-version`, sem toolbar e sem botoes dentro de `.ficha-print-page`. `npm run typecheck`, `npm run lint` e `npm run build` passaram.

### Ajuste da experiencia de impressao

- Ajuste: a previa em modal voltou a ter camada visual propria (`FichaPrintPreviewModal`), com header, container, botao de imprimir e estado de loading (`FichaPrintPreviewLoading`) enquanto a ficha e carregada.
- Ajuste: `PrintFicha` continua puro e e renderizado somente dentro do corpo da previa; o header e os botoes pertencem ao modal, nao ao componente imprimivel.
- Ajuste: os botoes `Imprimir` da listagem e `Imprimir ficha` da edicao foram trocados para `PrintTriggerButton`, que cria um `iframe.print-trigger-frame` oculto para carregar `/fichas/[id]/imprimir` e disparar `window.print()` sem alterar a URL atual nem abrir modal.
- Ajuste: o modal deixou de usar animacao de subida e agora abre com scale a partir do centro (`modalScaleIn`); o overlay ganhou `modalOverlayIn`, sem deslocamento.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou `/fichas?print=7f8ed7ad-1378-4099-a084-9e54752fcf3e` com header/container de preview, `#print-version` no corpo, nenhum iframe dentro da previa e animacao `modalScaleIn`. Na listagem e na edicao, clicar em imprimir manteve a URL em `/fichas` ou `/fichas/[id]`, criou somente `iframe.print-trigger-frame` com `/imprimir?_print=...` e disparou `print()` no iframe.

### Refinamento do modal de previa

- Ajuste: removida a sensacao de dois modais. O `Modal` agora fica fora do `Suspense`, com tamanho fixo e header estavel em `FichaPrintPreviewShell`; somente o corpo alterna entre loading, erro e conteudo.
- Ajuste: o loading deixou de renderizar outro header/modal e passou a ocupar o corpo fixo da previa.
- Ajuste: a ficha imprimivel recebeu fundo branco por token `--color-print-paper`, aplicado em `.ficha-print-page` e `.print-container` dentro da previa.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou um unico `.modal-content`, um unico header, um unico corpo com rolagem, nenhum iframe dentro da previa e `paperBackground=rgb(255, 255, 255)`.

### Botao de impressao na nova ficha

- Ajuste: `/fichas/nova` voltou a mostrar `Imprimir ficha` na area de acoes do formulario.
- Decisao: como a ficha nova ainda nao tem `id` persistido, o botao fica desabilitado com `aria-label` e `title` informando que a impressao e liberada apos salvar; em edicao, o mesmo ponto continua acionando `PrintTriggerButton`.
- Validacao: `npm run typecheck` e `npm run lint` passaram. Edge DevTools confirmou em `/fichas/nova` o botao `Imprimir ficha` presente, desabilitado, ao lado de `Salvar ficha`.

### Impressao de rascunho nao salvo

- Ajuste: a decisao anterior foi substituida. Em `/fichas/nova`, `Imprimir ficha` agora fica habilitado e imprime um rascunho local.
- Implementacao: `FichaForm` monta uma `FichaDetail` temporaria com os valores atuais do formulario, itens, observacoes e imagens locais (`previewUrl` quando ainda nao foram enviadas), renderiza `PrintFicha` em `draft-print-root` via portal e chama `window.print()`.
- Decisao: rascunhos sem registro no Supabase usam `Ficha #rascunho`; a impressao nao chama rota `/fichas/[id]/imprimir`, nao grava dados e nao altera a URL atual.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge DevTools confirmou em `/fichas/nova` que o botao esta habilitado, cria `draft-print-root` com `#print-version`, chama `window.print()` e permanece em `/fichas/nova`.

### Limpeza estrutural de impressao e notificacoes

- Ajuste: removida a duplicacao entre `print-on-load.tsx` e `ficha-print-preview-modal.tsx`. Os dois fluxos agora reutilizam `src/features/fichas/print-pdf.ts` para preparar `#print-version`, rasterizar com `html2canvas`, montar o PDF com `jsPDF`, abrir o blob em iframe tecnico e disparar `print()` com timeout e cleanup centralizados.
- Ajuste: `PrintTriggerButton` deixou de importar `sonner` direto e voltou a conversar com a camada da aplicacao (`useToast`), mantendo loading/erro consistentes e cleanup mais curto do iframe oculto.
- Ajuste: `ToastProvider` teve o contrato corrigido para `ToastId = string | number` e parou de concatenar titulo+mensagem manualmente; agora usa `title` como corpo principal do Sonner e `message` como `description` quando houver ambos.
- Limpeza: removido de `src/styles/globals.css` o CSS morto do toast customizado antigo (`.toast-region`, `.toast__*`, `@keyframes toast-timer`, `@keyframes slideUp`), que nao era mais usado desde a troca efetiva para Sonner.
- Decisao: manter Sonner como engine visual, mas impedir novo acoplamento direto das features a ele; o contrato do sistema fica centralizado em `src/lib/toast.ts` + `ToastProvider`.

### Remocao da fachada de toast no Next

- Ajuste: consolidada a intencao final do modulo. O App Router deixou de usar a API customizada de toast e passou a consumir `toast` diretamente de `sonner`.
- Implementacao: `src/app/layout.tsx` removeu o wrapper `ToastProvider`; formularios e acoes client-side em `clientes`, `catalogos`, `usuarios` e `fichas` trocaram `useToast()` por `toast.success/error/info/warning/loading`.
- Limpeza: removidos `src/components/ui/toast-provider.tsx` e `src/lib/toast.ts`, alem da reexportacao correspondente em `src/components/ui/index.ts`.
- Decisao: o shim legado `window.toast` continua restrito a `public/` enquanto o legado existir; no codigo Next a fonte unica de notificacao agora e Sonner direto, sem camada intermediaria.

### PDF customizado semanal

- Ajuste: `/fichas/pdf` agora reconhece automaticamente os recortes dos atalhos `Esta semana` e `Proxima semana` e, nesses casos, gera um PDF operacional proprio em A4 paisagem.
- Implementacao: a rota passou a buscar tambem as fichas `atrasado` com os mesmos filtros de busca/evento, posicionando esse bloco primeiro no PDF. O restante entra em um segundo bloco de `Entrega programada para a proxima semana`.
- Refinamento: o modo semanal agora varia titulo, secoes internas, resumo e nome do arquivo conforme o recorte seja da semana atual ou da semana seguinte.
- Layout: cada bloco e separado por tipo de personalizacao, com visual compacto e legivel: cabecalho forte, cards-resumo, cabecalhos de secao, grade com `Cliente`, `Vendedor`, `Inicio`, `Entrega` e `Status`, badge colorida de status e uma caixa vazia ao lado para anotacao manual no impresso.
- Dados: `FichaListItem` e as consultas usadas por listagens/PDF passaram a carregar `data_inicio`, permitindo mostrar `Inicio` no documento e manter compatibilidade com o historico do cliente.
- Compatibilidade: fora dos recortes exatos de semana atual ou semana seguinte, o PDF operacional antigo continua como fallback para nao mudar silenciosamente os demais cenarios.
- Validacao: `npm run typecheck`, `npx eslint src/app/fichas/pdf/route.ts src/features/fichas/operational-pdf.ts src/features/fichas/data.ts src/features/clientes/data.ts` e `npm run build` passaram.

### Toast de impressao e barras de loading

- Ajuste: o toast `Impressao` da listagem nao fecha mais no carregamento inicial do `iframe`, que acontecia antes do prompt real. Agora `PrintTriggerButton` injeta um `printJobId` na rota `/imprimir` e espera um `postMessage` de volta quando `PrintOnLoad` efetivamente dispara `print()`.
- Comportamento: quando o prompt de impressao abre, o toast e fechado naquele momento; se o sinal nao vier, fica apenas um timeout de seguranca mais longo para nao deixar a UI travada indefinidamente.
- Ajuste visual: os loaders que usavam spinner passaram a usar barras animadas, inclusive no `app/loading`, nos estados pending de botoes e no loading da previa de impressao.
- Validacao: `npm run typecheck` passou; o lint dirigido dos arquivos TS/TSX tocados passou e `globals.css` ficou fora do lint por falta de configuracao CSS nessa chamada.

### Loader do Sonner e transicao entre paginas

- Ajuste: o `Toaster` do App Router agora injeta um indicador proprio para `loading`, trocando o spinner padrao do Sonner por uma barra animada compacta.
- Implementacao: criado `src/components/ui/loading-bar.tsx` como primitivo visual reutilizavel; `src/app/layout.tsx` passou a registralo em `icons.loading`.
- Ajuste visual: `src/app/loading.tsx` foi remodelado para um painel de transicao com gradiente leve, copy curta, barra animada e skeleton lines, seguindo a linguagem do placeholder legado em vez de um loading solto no meio da tela.
- Estilos: `src/styles/globals.css` recebeu a base compartilhada `.loading-bar` e novas classes `app-loading__*` responsivas.
- Higiene: o texto quebrado `Carregandoâ€¦` foi removido junto com a reescrita do arquivo, mantendo o trecho em UTF-8 limpo.
- Validacao: `npm run typecheck` passou.

### PDF semanal com menos tinta

- Ajuste: o modo semanal de `/fichas/pdf` foi refinado para impressao economica, sem depender de grandes blocos chapados.
- Implementacao: em `src/features/fichas/operational-pdf.ts`, o cabecalho principal, cards de resumo e cabecalhos de secao passaram de fundos preenchidos para caixas brancas com borda e pequenos acentos lineares.
- Ajuste: o bloco de atrasados deixou de usar fundo vermelho, tanto nas secoes quanto nas linhas da tabela; a prioridade continua sinalizada por texto e badge.
- Ajuste: as badges de status agora usam apenas borda colorida e texto colorido, preservando legibilidade em impressoras simples.
- Ajuste: a coluna `Cliente` foi alargada, redistribuindo espaco de `Vendedor` e `Status` para reduzir truncamento de nomes.
- Validacao: `npm run typecheck` e `npx eslint src/features/fichas/operational-pdf.ts` passaram.

### Loading minimalista

- Ajuste: o visual de loading foi simplificado de novo, agora na direcao final pedida: sem gradientes, sem cartao, sem textos auxiliares e sem skeletons.
- Implementacao: `src/app/loading.tsx` ficou reduzido a uma unica barra azul primaria centralizada usando `LoadingBar`.
- Ajuste: `LoadingBar` deixou de aceitar `tone` e passou a ser um componente mais seco, sempre com preenchimento azul sobre trilha neutra.
- Ajuste: no Sonner, o toast de `loading` nao usa mais a barra como icone lateral; `src/app/layout.tsx` passou a marcar esse tipo com a classe `toast-loading-minimal`.
- Estilos: `src/styles/globals.css` agora desenha a faixa inferior do toast via `::before`/`::after`, escondendo o spinner/icone do loading e animando o preenchimento horizontal da esquerda para a direita.
- Validacao: `npm run typecheck` e `npx eslint src/app/layout.tsx src/app/loading.tsx src/components/ui/loading-bar.tsx` passaram.

### Correcao de quebra do PDF e faixa do toast

- Ajuste: o PDF semanal deixou de reservar pagina inteira por grupo. `src/features/fichas/operational-pdf.ts` agora quebra grupos longos por linhas, repetindo apenas cabecalho de grupo/tabela quando precisa continuar em outra pagina.
- Resultado: o espaco branco excessivo entre paginas foi reduzido e o fluxo do documento ficou mais compacto.
- Ajuste: as linhas decorativas azuis do cabecalho, cards de resumo e cabecalho de secao foram removidas; elas estavam cruzando texto e tambem gerando artefatos visuais no fim da pagina.
- Ajuste: a faixa inferior do toast de loading trocou a animacao baseada em `scaleX` por preenchimento linear via `clip-path`, evitando o salto visual no ultimo ciclo.
- Validacao: `npm run typecheck` e `npx eslint src/features/fichas/operational-pdf.ts src/app/layout.tsx src/app/loading.tsx src/components/ui/loading-bar.tsx` passaram. `globals.css` continua fora do lint dirigido dessa chamada.

### Acentuacao e padrao pt-BR nos PDFs

- Ajuste: os geradores de PDF foram higienizados para UTF-8 limpo, removendo mojibake e rotulos inconsistentes.
- Implementacao: `src/features/fichas/operational-pdf.ts` foi regravado com textos corretos como `Produção`, `próxima`, `continuação`, `Personalizações`, `Início`, `Não foi possível` e `Relatório operacional de fichas`.
- Implementacao: `src/features/fichas/print-pdf.ts` teve as mensagens internas de fallback/erro normalizadas para `conteúdo`, `impressão` e `Janela de impressão indisponível`.
- Implementacao: `src/features/fichas/print-ficha.tsx` teve o documento imprimível alinhado ao pt-BR correto, incluindo `Ficha Técnica`, `Data de Emissão`, `Especificações Técnicas`, `Observações`, `Personalização`, `Não`, `Nº Venda`, `números` e demais rótulos visíveis.
- Validacao: `npm run typecheck`, `npx eslint src/features/fichas/operational-pdf.ts src/features/fichas/print-pdf.ts src/features/fichas/print-ficha.tsx` e uma varredura `rg` nos arquivos de PDF passaram sem restos de texto quebrado.
### Fichas: busca ampliada e filtros preservados

- Ajuste: a busca da listagem em `/fichas` passou a considerar tambem `material`, `arte`, `cliente_auxiliar`, `numero_venda` e `vendedor`, alem de continuar cobrindo o nome principal.
- Implementacao: `src/features/fichas/data.ts` deixou de montar um `or(...ilike...)` por coluna e passou a consultar `busca_normalizada` com texto normalizado sem acentos e sem separadores, reaproveitando a mesma regra na listagem e no PDF operacional.
- Implementacao: criada a migration `supabase/migrations/202605040001_fichas_busca_normalizada.sql`, que habilita `unaccent`/`pg_trgm`, define `public.normalize_search_text(...)` e adiciona a coluna gerada `busca_normalizada` em `public.fichas`.
- Ajuste: `src/features/fichas/fichas-filter-toolbar.tsx` agora bloqueia o submit GET nativo do formulario, evitando que Enter na busca descarte os filtros de data/status/evento ja presentes na URL.
- Ajuste: `src/features/fichas/fichas-overview.tsx` passou a preservar `busca` e `evento` ao aplicar os atalhos de periodo (`Todas`, `Esta semana`, `Proxima semana`, `Atrasadas`), mantendo a combinacao de filtros em vez de resetar a pesquisa.
- Caveat: a busca sem acentos depende de aplicar a migration nova no banco antes do deploy.

### Fichas busca: compatibilidade sem migration aplicada

- Diagnostico: em ambiente com schema antigo, a pesquisa passou a falhar com `column fichas.busca_normalizada does not exist`.
- Implementacao: `src/features/fichas/data.ts` agora executa a busca nova por `busca_normalizada` como caminho principal, mas detecta esse erro especifico e refaz automaticamente a mesma consulta usando o filtro legado por colunas.
- Cobertura do fallback: `cliente_nome_snapshot`, `cliente_auxiliar`, `material`, `arte`, `numero_venda` e `vendedor`.
- Resultado: a listagem e o PDF operacional voltam a pesquisar sem quebrar a tela mesmo antes da migration nova entrar no banco.
- Caveat: a compatibilidade restaura a busca funcional, mas a tolerancia a acentos/underscores continua dependendo da migration `supabase/migrations/202605040001_fichas_busca_normalizada.sql`.
- Validacao: `npx eslint src/features/fichas/data.ts` e `npm run typecheck` passaram.

### Fichas busca: variante acentuada no fallback legado

- Diagnostico: nomes como `Jhonê Émanuel` ainda nao apareciam ao pesquisar `jhone` quando a app caia no fallback legado sem `busca_normalizada`.
- Implementacao: `src/features/fichas/data.ts` passou a expandir o termo pesquisado em variantes acentuadas controladas antes de montar o `or(...ilike...)` do fallback.
- Exemplo coberto: `jhone` agora gera combinacoes como `jhonê`, permitindo encontrar registros com acento mesmo antes da migration do banco.
- Escopo: a heuristica cobre variantes comuns de `a`, `c`, `e`, `i`, `o` e `u`, com limite de expansao para nao explodir a query.
- Validacao: `npx eslint src/features/fichas/data.ts` e `npm run typecheck` passaram.

### Fichas busca: migration compatível com Postgres

- Diagnostico: ao rodar `supabase db push` / SQL Editor, a migration original falhava com `ERROR: 42P17: generation expression is not immutable`.
- Causa: a versão inicial usava `busca_normalizada` como coluna `generated always as (...) stored`, mas a expressão dependia de `unaccent(...)`, que não atende o requisito de imutabilidade dessa feature.
- Implementacao: `supabase/migrations/202605040001_fichas_busca_normalizada.sql` foi reescrita para usar:
- coluna normal `busca_normalizada`
- função `public.normalize_search_text(...)` marcada como `stable`
- trigger `public.sync_fichas_busca_normalizada()` em `before insert or update`
- `update` de backfill para popular/atualizar os registros existentes
- indice GIN `gin_trgm_ops` preservado
- Resultado: a migration fica executável no Supabase/Postgres sem depender de generated column incompatível com `unaccent`.

### Fichas busca: teste forçado no caminho da migration

- Ajuste: o fallback legado de busca foi removido de `src/features/fichas/data.ts`.
- Resultado: `/fichas` e `/fichas/pdf` agora usam exclusivamente `busca_normalizada` via `ilike`, sem voltar silenciosamente para `or(...ilike...)` por colunas.
- Motivo: garantir que os testes atuais realmente validem a migration aplicada e o caminho indexado novo, em vez de passar por compatibilidade antiga.
- Efeito esperado: se houver qualquer problema futuro em `busca_normalizada`, a tela volta a acusar erro diretamente, o que é desejado enquanto estamos fechando esta validação.
- Validacao: `npx eslint src/features/fichas/data.ts` e `npm run typecheck` passaram.

### Fichas atrasadas: CTA unico de entrega

- Ajuste: na rota `/fichas?status=atrasado`, a coluna de acoes deixa de mostrar preview, imprimir, editar e entregar em icones separados.
- Implementacao: `src/features/fichas/ficha-row-actions.tsx` ganhou a variante `fullDeliverButton`, que reaproveita `markFichaEntregueFormAction` e renderiza um botao verde completo com spinner/estado pending.
- Implementacao: `src/features/fichas/fichas-overview.tsx` ativa essa variante apenas quando o filtro atual e exatamente `status === "atrasado"`.
- Estilo: `src/styles/globals.css` passou a ter `ficha-row-actions--deliver-only` e `ficha-row-actions__deliver-button`, fixando a largura em `162px` para ocupar a mesma faixa dos quatro botoes padrao (`4 x 36px` com `3` gaps de `6px`).
- Validacao: `npx eslint src/features/fichas/ficha-row-actions.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck` passaram.

### Fichas atrasadas: CTA com menu preservado e visual claro

- Ajuste: a variante de atrasadas foi refinada para manter o ultimo slot como botao de menu de contexto, em vez de substituir toda a coluna por um unico CTA.
- Implementacao: `src/features/fichas/ficha-row-actions.tsx` continua renderizando o formulario largo de entrega com `162px`, mas agora deixa o `FloatingMenu` ao lado no quinto espaco, preservando preview, imprimir, editar e deletar dentro do menu.
- Estilo: `src/styles/globals.css` trocou o estado padrao do CTA para fundo verde claro (`var(--color-success-bg)`), texto e borda verdes, seguindo a referencia visual aprovada.
- Hover: o CTA agora inverte para fundo verde solido com texto claro no hover/focus, diferenciando nitidamente do estado padrao sem perder a hierarquia visual.
- Validacao: `npx eslint src/features/fichas/ficha-row-actions.tsx` e `npm run typecheck` passaram.

### Fichas observacoes: cursor reiniciando no contentEditable

- Diagnostico: o texto invertido em `Observações` nao era mais um problema de direcao RTL; o print com `teste -> etset` confirmou que o cursor estava voltando para o inicio a cada tecla.
- Causa real: `src/features/fichas/ficha-form.tsx` renderizava o editor com `dangerouslySetInnerHTML={{ __html: observacoes }}` em toda atualizacao de estado, entao o React reescrevia o DOM do `contentEditable` continuamente durante a digitacao.
- Implementacao: removido o `dangerouslySetInnerHTML` do bloco editavel e adicionada sincronizacao por `useEffect`, que so reaplica `innerHTML` quando o valor externo realmente diverge do DOM atual.
- Resultado esperado: a digitacao manual permanece com o cursor na posicao correta, enquanto auto-preenchimento e carga inicial continuam conseguindo injetar HTML no editor.
- Validacao: `npx eslint src/features/fichas/ficha-form.tsx` e `npm run typecheck` passaram.

### UX loading: spinner e barra, skeleton nunca

- Diretriz consolidada: spinner para itens sendo carregados e botoes em estado pending; barra de carregamento para toasts e transicao entre paginas; skeleton proibido no Next atual.
- Diagnostico: ainda existia um skeleton visual na previa de impressao em `src/features/fichas/ficha-print-preview-modal.tsx`, com CSS em `src/styles/globals.css`.
- Implementacao: removido o bloco `ficha-print-preview__skeleton` e mantido apenas o estado textual com `button-spinner button-spinner--contrast`.
- Verificacao: `rg -n "skeleton" src` ficou sem resultados, confirmando que nao restou skeleton loader no App Router atual.
- Validacao: `npx eslint src/features/fichas/ficha-print-preview-modal.tsx` e `npm run typecheck` passaram.

### Fichas PDF: exportacao coerente com resultado

- Ajuste: o botao `Exportar PDF` em `/fichas` agora respeita o resultado da listagem atual.
- Regra: se `result.kind !== "ok"` ou `result.total === 0`, o botao fica desabilitado para evitar exportacao sem dados.
- Comportamento de loading: ao clicar com resultados validos, o botao troca para `Exportando`, mostra `button-spinner` e dispara a rota de download do PDF.
- Implementacao: `src/features/fichas/fichas-overview.tsx` passou a informar `canExportPdf`, e `src/features/fichas/fichas-filter-toolbar.tsx` passou a controlar o estado local de exportacao com timeout de seguranca.
- Validacao: `npx eslint src/features/fichas/fichas-filter-toolbar.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck` passaram.

### Fichas PDF: operacional com o mesmo padrao visual dos semanais

- Ajuste: o PDF padrao de Fichas operacional deixou de sair pelo placeholder textual e passou a reutilizar o mesmo esqueleto visual dos modos Esta semana e Proxima semana.
- Implementacao: src/features/fichas/operational-pdf.ts agora monta cabecalho, cards de resumo e secoes paginadas por data de entrega, com grupos internos por personalizacao e o mesmo miolo tabular compacto ja usado nos PDFs semanais.
- Regra visual: quando uma data agrupada contem fichas atrasadas, a secao inteira assume o tom de alerta para priorizar leitura operacional.
- Caveat: o fallback textual antigo ficou no arquivo apenas como residuo interno sem uso, porque o trecho legado ainda merece uma limpeza dedicada de encoding antes de ser removido por completo.
- Validacao: `npx eslint src/features/fichas/operational-pdf.ts` e `npm run typecheck` passaram.

### Fichas PDF: limpeza UTF-8 final no operacional

- Ajuste: `src/features/fichas/operational-pdf.ts` foi limpo em UTF-8 de ponta a ponta para eliminar os ultimos textos quebrados no caminho operacional.
- Implementacao: textos como `Relatorio Operacional de Fichas`, `Visao operacional`, `Personalizacao` e o separador `·` foram normalizados, e o fallback textual antigo foi removido junto de `buildOperationalLines`, `createSimpleTextPdf` e helpers associados.
- Resultado: o arquivo ficou com um unico caminho ativo para gerar o PDF operacional, sem residuos de placeholder nem mojibake remanescente.
- Validacao: `rg -n "Ã|Â|â|NÃ|PrÃ|Ãƒ|Ã‚" src/features/fichas/operational-pdf.ts` sem resultados, `npx eslint src/features/fichas/operational-pdf.ts` e `npm run typecheck` passaram.

### UX loading: botoes padronizados com spinner

- Ajuste: os botoes de acao foram normalizados para usar sempre o mesmo `button-spinner` e trocar o rotulo para refletir a acao em andamento.
- Implementacao: `login-form`, `cliente-form`, `catalogo-form`, `usuario-form`, `ficha-form`, `ficha-status-actions` e `ficha-row-actions` agora exibem estados como `Entrando...`, `Salvando...`, `Removendo...` e `Marcando...` junto do spinner comum, sem recorrer a barras de carregamento dentro de botoes.
- Regra duravel: registrada em `AGENTS.md` e consolidada assim - spinner para itens sendo carregados e botoes em estado de carregamento; barra de carregamento para toasts e transicao entre paginas; skeleton nunca.
- Validacao: `npx eslint src/features/auth/login-form.tsx src/features/clientes/cliente-form.tsx src/features/fichas/ficha-form.tsx src/features/fichas/ficha-status-actions.tsx src/features/fichas/ficha-row-actions.tsx src/features/catalogos/catalogo-form.tsx src/features/usuarios/usuario-form.tsx` e `npm run typecheck` passaram.

### UX confirmacoes: radix no lugar de confirm nativo

- Diagnostico: o `AlertDialog` do Radix ja estava instalado e sendo usado no Next atual, mas ainda restava um `window.confirm` no fluxo de auto-preenchimento de observacoes em `src/features/fichas/ficha-form.tsx`.
- Implementacao: a confirmacao para substituir observacoes digitadas manualmente foi migrada para um `AlertDialog` com o mesmo padrao visual de `confirm-dialog` ja usado no app.
- Resultado: no App Router atual nao sobrou `window.confirm`; as confirmacoes migradas agora seguem o mesmo comportamento visual e acessivel do restante da interface.
- Validacao: `rg -n "window\\.confirm|confirm\\(" src/features src/components src/app` sem resultados, `npx eslint src/features/fichas/ficha-form.tsx` e `npm run typecheck` passaram.

### Fichas entregues: reverter para pendente com confirmacao

- Ajuste: na listagem filtrada de fichas entregues, o botao verde desabilitado de status foi trocado por um botao laranja de reversao para pendente.
- Implementacao: `src/features/fichas/ficha-row-actions.tsx` agora renderiza um `icon-action--warning` quando `status === "entregue"` e abre um `AlertDialog` antes de submeter a reversao. No backend, `src/features/fichas/actions.ts` ganhou `revertFichaToPendenteAction`, que volta `status` para `pendente`, limpa `delivered_at` e revalida `/fichas`, `/relatorios` e a rota de detalhe.
- UI: `src/styles/globals.css` passou a ter as variantes `icon-action--warning` e `ui-button--warning` para manter o CTA laranja consistente com o restante do sistema.
- Validacao: `npx eslint src/features/fichas/actions.ts src/features/fichas/ficha-row-actions.tsx` e `npm run typecheck` passaram.

### UX loading: spinner dos botoes com cor visivel

- Diagnostico: o `button-spinner` ainda estava preso a `--color-primary` / `--color-primary-contrast`, entao podia desaparecer em botoes com outras cores ou em estados claros.
- Implementacao: `src/styles/globals.css` foi ajustado para usar `currentColor` tanto na trilha quanto no feixe animado do spinner, inclusive na variante `button-spinner--contrast`.
- Resultado: o spinner agora herda a mesma cor visivel do texto/icone do botao, mantendo contraste coerente em botoes primarios, secundarios, success, warning e danger.
- Validacao: `rg -n "button-spinner|currentColor" src/styles/globals.css` confirmou a troca, e `npm run typecheck` passou.

### UX tooltip: regra para descricoes de hover

- Regra duravel: quando a intencao for descrever ou explicar uma acao/controle da interface, nao usar o atributo HTML nativo `title=""`; usar o componente `Tooltip`.
- Registro: a regra foi adicionada em `AGENTS.md` e `agents.md` para orientar proximas implementacoes.
- Observacao: a varredura `rg -n 'title=' src/app src/features src/components` mostrou que os `title=` atuais no Next sao majoritariamente props semanticas de componentes como `EmptyState`, `Modal` e `AlertDialog`, nao dicas nativas de hover.

### Fichas busca: input sem perder foco durante a digitacao

- Diagnostico: o campo de busca da listagem podia perder foco no meio da digitacao porque `FichasFilterToolbar` estava recebendo uma `key` baseada nos filtros, o que permitia remount do componente inteiro durante as atualizacoes por query string.
- Implementacao: em `src/features/fichas/fichas-overview.tsx`, a `key` artificial da toolbar foi removida. Em `src/features/fichas/fichas-filter-toolbar.tsx`, a busca passou a usar um draft local apenas enquanto o input esta focado, preservando o texto digitado durante os refreshes da listagem e voltando a espelhar a URL quando sai de edicao.
- Resultado: a listagem continua atualizando conforme a pesquisa, mas o input deixa de derrubar o foco e interromper a digitacao no meio do fluxo.
- Validacao: `npx eslint src/features/fichas/fichas-filter-toolbar.tsx src/features/fichas/fichas-overview.tsx` e `npm run typecheck` passaram.

### Fichas PDF: exportar apenas a pagina atual da listagem

- Diagnostico: o `PDF operacional` ainda consultava ate 500 fichas filtradas na rota `/fichas/pdf`, entao em estado puro acabava exportando o sistema inteiro em vez de refletir apenas o que estava na tela.
- Implementacao: `src/features/fichas/data.ts` passou a paginar `listFichasForOperationalPdf(...)` com o mesmo `FICHAS_PAGE_SIZE` da listagem. `src/features/fichas/fichas-overview.tsx` passou a incluir `page` no `pdfHref`. `src/app/fichas/pdf/route.ts` agora le `page`, usa esse recorte real da listagem e monta o `Content-Disposition` com nome derivado do estado atual da tela: busca, status, evento, intervalo, pagina e atalhos semanais quando aplicavel.
- Ajuste de comportamento: o modo semanal continua reaproveitando o layout especializado, mas sem acrescentar um bloco extra de atrasadas que nao esteja na tela atual.
- Resultado: o PDF operacional agora espelha a pagina atual da listagem em vez do conjunto inteiro filtrado.
- Validacao: `npx eslint src/app/fichas/pdf/route.ts src/features/fichas/data.ts src/features/fichas/fichas-overview.tsx` e `npm run typecheck` passaram.
### Plugins recomendados: instalacao concluida e plano de adocao

- Status: os pacotes que faltavam em `plugins-recomendados.md` foram instalados com sucesso: `@tanstack/react-table`, `nuqs`, `date-fns`, `@tanstack/react-query`, `react-resizable-panels`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `recharts` e `zustand`.
- Confirmacao: `sonner` e `react-day-picker` ja estavam presentes, entao a rodada completou o conjunto recomendado em vez de duplicar instalacoes.
- Planejamento registrado: `plugins-recomendados.md` agora traz um plano por ondas para substituir partes manuais por plugins, com prioridade para `nuqs` nos filtros/URL state, `date-fns` + `react-day-picker` em datas, `@tanstack/react-table` no `DataTable` compartilhado e `Tiptap` no editor de observacoes.
- Validacao: `npm run typecheck` passou apos a instalacao.
- Caveat: o `npm audit` ainda reporta 4 vulnerabilidades; nenhuma feature foi migrada nesta rodada, apenas a base foi instalada e o plano foi amarrado.
### Consolidacao dos docs da raiz

- Ajuste: a documentacao da raiz foi reduzida para os arquivos realmente ativos no ciclo atual do projeto.
- Mantidos: `README.md`, `AGENTS.md`, `plano-migracao-next-supabase.md` e `registro-migracao-next.md`.
- Consolidacao: o conteudo operacional de `CHECKLIST_HOMOLOGACAO_NEXT.md` foi absorvido pelo plano principal, especialmente na Fase 9 de homologacao; a trilha de `plugins-recomendados.md` tambem passou a viver no plano principal, na secao de bibliotecas/adocao.
- README: `README.md` foi reescrito para refletir a arquitetura atual Next.js + Supabase, os comandos principais e o mapa curto de documentacao.
- Resultado: a raiz deixa de ter docs paralelos para checklist e plugins, reduzindo redundancia e diminuindo o custo de manutencao.
- Caveat: o historico antigo no plano e no registro ainda menciona os nomes removidos porque esses arquivos existiam quando aquelas etapas aconteceram.
### AGENTS.md reescrito para o estado atual

- Problema: o `AGENTS.md` antigo ainda refletia parte do desenho inicial da migracao e chegou a orientar errado em pontos ja consolidados, como API de toast, superfices ativas e papel de rotas antigas.
- Reescrita: o arquivo foi substituido integralmente para descrever o produto atual em operacao, incluindo stack real, docs vivos da raiz, ownership por pasta, gate de auth em `src/app/layout.tsx`, centralidade de `/fichas`, funcao real de `/relatorios`, restricao de `/catalogos` e `/usuarios` a `superadmin`, e o status do legado como referencia funcional apenas.
- UI: tambem ficaram explicitas as regras duraveis ja adotadas no app atual, como `sonner` direto no Next, `AlertDialog` no lugar de `window.confirm`, `Tooltip` no lugar de `title=""`, spinner para botoes/itens, barra para loading de toast/transicao e `skeleton` nunca.
- Bibliotecas: o novo texto separa o que ja e baseline (`sonner`, `react-hook-form`, `zod`, `@hello-pangea/dnd`, `react-day-picker`, Radix Dialog/AlertDialog) do que esta apenas instalado e ainda em adocao gradual (`nuqs`, `date-fns`, `@tanstack/react-table`, `@tanstack/react-query`, `recharts`, `zustand`, `react-resizable-panels`, `@tiptap/react`).
- Validacao: revisao cruzada com `README.md`, `package.json`, `src/app/layout.tsx`, `src/components/ui/index.ts`, rotas reais em `src/app/*` e uso corrente de `sonner`, `react-day-picker`, `AlertDialog`, `DataTable` e `contentEditable` nas features.
- Caveat: o arquivo foi regravado em ASCII intencionalmente para reduzir risco de encoding quebrado no fluxo atual do repositorio.

### Plano principal auditado e atualizado

- Problema: o `plano-migracao-next-supabase.md` ainda mantinha varios checkboxes desmarcados ou wording antigo em fases ja executadas, o que estava escondendo as pendencias realmente relevantes para a proxima etapa.
- Ajuste: o plano foi revisado contra evidencias objetivas do proprio `registro-migracao-next.md`, sem marcar nada por suposicao.
- Itens consolidados: bootstrap do Next dentro do repo atual, conexao Supabase em desenvolvimento, estrategia de importacao/migracao, criterios de aceite de Fichas, Clientes e Relatorios, export/backup e validacoes da Fase 8, alem da configuracao de ambiente de producao ja validada localmente.
- Reenquadramento: a antiga Fase 6 deixou de pressupor uma rota `/dashboard` dedicada e passou a refletir a realidade atual, em que indicadores e atalhos foram absorvidos por `/fichas`, `/relatorios` e pela home. O item de Kanban virou reavaliacao pos-corte, em vez de parecer pendencia imediata.
- Pendencias que ficaram abertas de proposito: janela final de migracao, congelamento do legado, publicacao em producao, testes reais em producao, monitoramento inicial e a paridade fina ainda nao fechada do formulario/auto-preenchimento de observacoes.
- Resultado: o plano agora aponta melhor para o que ainda importa, em vez de misturar trabalho concluido com trabalho futuro.

### Importacao de JSON legado como rascunho

- Entrega: `/fichas/nova` agora aceita importacao de JSON legado apenas para `superadmin`, preenchendo o formulario atual como rascunho local sem criar registro intermediario e sem gravar nada no banco antes do clique em `Salvar ficha`.
- Parser: `src/features/fichas/legacy-import.ts` faz deteccao de ficha unica ou backup com exatamente 1 ficha, normaliza chaves em camelCase/snake_case, reaproveita a prioridade `observacoesHtml -> observacoes -> observacoesPlainText` e preserva `comNomes` pelo valor explicito ou pela mesma heuristica textual do legado.
- Estado inicial: `src/features/fichas/ficha-form-seed.ts` consolidou o seed do formulario para aceitar tanto ficha do banco quanto rascunho importado, permitindo remount limpo do `FichaForm` apos a importacao sem converter o formulario inteiro para controlado.
- Imagens: a importacao separa imagens em tres grupos. URLs remotas com `publicId` entram como salvaveis; URLs HTTP(S) sem `publicId` entram apenas como preview com aviso; `data:`/`blob:`/estruturas invalidas sao descartadas com warning explicito.
- Seguranca de persistencia: `src/features/fichas/ficha-form.tsx` passou a bloquear o submit quando ainda existem imagens importadas apenas como rascunho, evitando perda silenciosa no `imagensJson`, que continua aceitando apenas imagens com `publicId` + `secureUrl`.
- UX: se o formulario ja tiver conteudo, a importacao pede confirmacao antes de sobrescrever o rascunho atual. Depois da carga, um toast resume o resultado e um banner lista avisos de conversao parcial.
- Auditoria de paridade: `src/features/fichas/legacy-import-audit.ts` registra a matriz interna com `1:1 confirmado`, `coberto com adaptacao` e `ainda pendente`. A unica pendencia funcional mantida de proposito e a validacao fina do auto-preenchimento de observacoes contra exemplos reais do legado.
- Validacao: `npm run typecheck` passou.

### Spinner do botao salvar ficha

- Diagnostico: o botao `Salvar ficha` estava usando o markup correto de loading (`<span className="button-spinner" />`), mas o estilo global de `button-spinner` ainda era uma barra horizontal, o que conflita com a regra do projeto de usar spinner para botoes e barra apenas para toast/transicao.
- Ajuste: `src/styles/globals.css` foi corrigido para que `button-spinner` volte a ser circular, com borda girando e cor herdada de `currentColor`.
- Resultado: o loading do `Salvar ficha` volta a parecer spinner de botao, sem afetar a barra de loading dos toasts.
- Validacao: `npm run typecheck` passou.

### Toast de sucesso ao salvar ficha + galeria centralizada

- Feedback de salvamento: como o fluxo de `createFichaAction` e `updateFichaAction` termina em redirect para `/fichas`, o sucesso real foi implementado no pós-redirect. `src/features/fichas/actions.ts` agora envia `saved=created` ou `saved=updated`, e `src/features/fichas/ficha-save-toast.tsx` mostra um `toast.success` uma unica vez e limpa o param da URL com `router.replace(..., { scroll: false })`.
- Integracao: `src/features/fichas/fichas-overview.tsx` passou a renderizar `FichaSaveToast` no topo da superficie de listagem, mantendo o feedback visivel logo apos salvar sem depender de estado local do formulario.
- Galeria: `src/styles/globals.css` ajustou `image-upload-grid` para `justify-content: center`, centralizando os cards quando houver 1, 2 ou 3 imagens no formulario.
- Resultado: salvar ficha agora devolve confirmacao visual clara, e a secao de imagens deixa de parecer desalinhada quando a grade nao esta cheia.
- Validacao: `npm run typecheck` passou.

### Importacao legado: valores crus agora viram rotulos canonicos

- Problema observado: alguns JSONs legados traziam valores em minusculo ou em codigo interno de select, como `padre_ziper`, `redonda`, `punho_ribana` e ids de material como `dry_fit`. Isso fazia a importacao hidratar a ficha com textos crus que nao batiam com o catalogo visivel do sistema novo.
- Ajuste no parser: `src/features/fichas/legacy-import.ts` passou a importar `public/data/catalogo.json` e montar lookups canonicos para produtos, materiais, mangas, cores, larguras, locais de filete/faixa e faixas refletivas. Alem disso, ganhou uma tabela de aliases explicitos dos selects antigos para `gola`, `acabamentoGola` e `acabamentoManga`.
- Exemplo pratico: `padre_ziper` agora entra como `Gola Padre com Zíper`; `redonda` vira `Gola Redonda`; `punho_ribana` vira `Punho de Ribana`; `dry_fit` vira `Dry Fit`; cores em minusculo passam a usar a grafia canonica do catalogo quando houver correspondencia.
- Render imprimivel: `src/features/fichas/print-ficha.tsx` tambem foi endurecido para reconhecer `polo` e `social` por comparacao normalizada, nao apenas por igualdade exata do valor cru legado. Isso evita inconsistencias quando a ficha importada ja foi canonicalizada para rótulo.
- Resultado: a importacao passa a preencher a UI com os mesmos textos que o usuario espera ver no formulario novo e reduz o risco de regras condicionais ou montagem visual falharem por conta de valores internos do legado.
- Validacao: `npm run typecheck` e `eslint` dirigido em `src/features/fichas/legacy-import.ts` e `src/features/fichas/print-ficha.tsx` passaram.

### Catalogos: aliases oficiais e limpeza de redundancias preparados

- Diagnostico arquitetural: a camada de compatibilidade no parser era util, mas incompleta como fonte de verdade. O ponto correto para amarrar legado e Next e o proprio `catalog_items`, porque e dele que `/catalogos` e o formulario novo devem passar a depender.
- Parser alinhado ao banco: `src/features/fichas/legacy-import.ts` foi ajustado para aceitar `catalogOptions` do banco durante a importacao e priorizar os aliases oficiais carregados de `/catalogos`. O fallback em `public/data/catalogo.json` continua so para nao quebrar importacao antes da limpeza completa do banco.
- Seed refeito: `scripts/seed-catalog-items.mjs` deixou de criar listas simplificadas e redundantes como `Redonda`, `V`, `Padre`, `Raglan`, `Regata`, `Barra simples` e `Gola pronta`. Agora ele gera apenas os valores canônicos e registra aliases legados oficiais, como `padre_ziper`, `v_polo`, `punho_ribana`, `ribana_molde` e ids de tecidos como `dry_fit`.
- Migration real: foi criada `supabase/migrations/202605050002_catalog_items_canonical_cleanup.sql` para limpar as redundâncias já existentes nas families `manga`, `gola`, `acabamento_manga`, `acabamento_gola` e `bolso`, inserir os canônicos que faltavam e anexar `legacyId` dos tecidos ao array `aliases`.
- Checagem do seed: o dry-run de `node scripts/seed-catalog-items.mjs` retornou um catálogo consolidado com 219 itens: `produto 65`, `tamanho 45`, `tecido 35`, `cor 40`, `manga 6`, `gola 8`, `acabamento_manga 6`, `acabamento_gola 5` e `bolso 9`.
- Estado desta rodada: preparei a migration e o seed canônico, mas nao apliquei no banco ainda. Isso foi intencional para nao alterar dados remotos sem executar a rodada de migrate/seed no ambiente alvo.
- Validacao local: `npm run typecheck`, `eslint` dirigido e o dry-run do seed passaram.
