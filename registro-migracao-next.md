# Registro da migracao Next

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
