# Registro de alteracoes

## 2026-05-27 - Revisao visual: acentuacao, consistencia de status e eyebrow

- Modulo: UI transversal (fichas, clientes, catalogos, quadro, shell).
- Arquivos alterados:
  - `src/components/ui/app-shell.tsx`
  - `src/features/fichas/fichas-overview.tsx`
  - `src/features/fichas/ficha-preview.tsx`
  - `src/features/fichas/fichas-filter-toolbar.tsx`
  - `src/features/clientes/cliente-detail.tsx`
  - `src/features/catalogos/catalogos-overview.tsx`
- Resultado: corrigida acentuacao ausente em aria-labels do app-shell ("Navegacao" -> "Navegação", "Usuario" -> "Usuário") e nos toasts de exclusao de catalogo ("excluido" -> "excluído").
- Resultado: padronizado o label de status "Cancelado" para "Cancelada" em fichas-overview, ficha-preview e cliente-detail, alinhando com ficha-status-actions.tsx que ja usava a forma feminina; "ficha" e substantivo feminino.
- Resultado: padronizado o label de overdue "Atrasado" para "Atrasada" (badge e mensagem de dias) em fichas-overview.tsx.
- Resultado: corrigido eyebrow de "Módulo prioritário" para "Fichas" em fichas-overview.tsx, alinhando com o padrao de todas as outras telas (clientes, catalogos, usuarios, relatorios).
- Resultado: corrigida opcao "Atrasados" do select de status em fichas-filter-toolbar.tsx para "Atrasado", tornando-a consistente com as opcoes singulares "Pendente" e "Entregue".
- Decisao: nenhuma mudanca em data layer, schema ou actions; todas as alteracoes sao estritamente de texto visivel e acessibilidade.
- Validacao: `npm run lint` e `npm run typecheck` passaram sem erros.

## 2026-05-27 - Quadro de producao: estabilidade do drag and drop

- Modulo: quadro de producao.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: o movimento otimista dos cards agora atualiza o cache do React Query antes de qualquer espera assincrona, evitando o flash em que o card voltava para a coluna anterior logo apos o drop.
- Resultado: o estado visual de arraste deixa de ser limpo no proximo tick e passa a ser encerrado apenas no fim da mutation; o `dragEnd` tambem limpa a referencia ativa imediatamente para impedir commits duplicados do mesmo arraste.
- Decisao: manter `fluid-dnd` como fonte transitoria durante o arraste e React Query como fonte canonica fora dele, sem animar `transform` dos cards.
- Validacao: `npx eslint src\features\quadro-producao\quadro-producao-client.tsx`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Playwright em `localhost:3100/quadro-producao` confirmou login, 5 colunas, 86 cards, pagina com conteudo, ausencia de overlay e ausencia de erros de console; o arraste real nao foi automatizado para evitar persistir movimento em cards reais.

## 2026-05-27 - Operacao: fronteiras de agentes

- Modulo: documentacao operacional.
- Arquivos alterados: `agent-boundaries.md`, `registro-alteracoes.md`.
- Resultado: criado `agent-boundaries.md` com divisao pratica entre Claude Code e Codex adaptada ao App Router atual do ficha_prod.
- Decisao: o arquivo entra como excecao operacional solicitada para coordenar edicoes entre agentes; a regra anti-conflito exige `git status --short` antes de editar e aprovacao humana para arquivos compartilhados.
- Validacao: revisao documental; sem execucao de build por nao haver alteracao de codigo.

## 2026-05-14 - Fichas: impressao de listas no modal

- Modulo: fichas / listas de nomes.
- Arquivos alterados: `src/features/fichas/ficha-name-list-badge.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o modal aberto pelos badges de lista bruta ou organizada ganhou o botao `Imprimir lista`.
- Resultado: a impressao usa um `iframe` temporario invisivel, sem abrir janela ou popup; listas organizadas saem como tabela e listas brutas saem como texto pre-formatado, sem incluir a pagina de `/fichas`.
- Refinamento posterior: o titulo do modal e da impressao passou a usar `Lista - NOMEDOCLIENTE`, deixando a venda/contexto em badge separado acima; tambem foi adicionado fallback para evitar `Lista - undefined` quando o payload vier sem `clienteNome`.
- Refinamento posterior: quando nao houver numero de venda, o contexto passa a renderizar `-` em vez de `Sem venda`, tanto no modal quanto na impressao.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. Playwright em `localhost:3000/fichas` abriu um badge de lista, confirmou o botao `Imprimir lista`, validou que nenhum popup foi aberto, que o iframe temporario foi removido apos a chamada de impressao e que o cabecalho do modal e da impressao renderiza `-` + `Lista - Crislaine Freitas`.

## 2026-05-14 - Fichas: limpar busca

- Modulo: fichas / filtros.
- Arquivos alterados: `src/features/fichas/fichas-filter-toolbar.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o campo `Busca` em `/fichas` ganhou um botao iconico `Limpar busca`, exibido apenas quando houver texto.
- Resultado: ao acionar o botao, o texto local e o parametro `busca` da URL sao limpos imediatamente, sem aguardar debounce.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. Playwright em `localhost:3000/fichas?busca=teste` confirmou o botao visivel, clique limpando o input e URL voltando para `/fichas`.

## 2026-05-14 - Clientes: renomear fichas vinculadas

- Modulo: clientes / fichas.
- Arquivos alterados: `src/features/clientes/cliente-form.tsx`, `src/features/clientes/actions.ts`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o editor de cliente ganhou o checkbox `Renomear fichas vinculadas`, disponivel somente em modo de edicao.
- Resultado: quando marcado, salvar o cliente tambem atualiza `fichas.cliente_nome_snapshot` em todas as fichas com `cliente_id` do cliente editado, usando o nome ja normalizado.
- Decisao: a opcao fica desligada por padrao para preservar snapshots historicos quando o operador quiser corrigir apenas o cadastro do cliente.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. Playwright em `localhost:3000/clientes/<id>/editar` confirmou o checkbox `Renomear fichas vinculadas` visivel e desligado por padrao.

## 2026-05-14 - Fichas: calendario e data inicial

- Modulo: fichas / formulario.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-form-seed.ts`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o calendario do `DayPicker` passou a iniciar a semana no domingo, alinhado ao uso brasileiro.
- Refinamento posterior: sabados e domingos do calendario passaram a ser exibidos em cinza, sem destaque de fim de semana.
- Resultado: fichas novas passam a preencher `Data de Inicio` com a data operacional atual por padrao, usando `getBusinessTodayInput()` e o timezone `America/Cuiaba`.
- Resultado: o bloco de cliente ganhou um alerta de prazo baseado na data de entrega, usando verde acima de 14 dias, laranja com 14 dias ou menos e vermelho com 7 dias ou menos.
- Refinamento posterior: o alerta manteve a regra de cor baseada em dias corridos, mas passou a exibir tambem os dias uteis restantes em parenteses e negrito, descontando sabados e domingos.
- Decisao: fichas editadas continuam usando a data salva; duplicacoes continuam recebendo os dados mapeados da ficha de origem.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. Playwright em `localhost:3000/fichas/nova` confirmou `Data de Inicio` preenchida com `14 de mai. de 2026`, calendario de entrega abrindo, fim de semana visivel com classe `rdp-day--weekend` e cor cinza, e alerta laranja com `Prazo Moderado. Restam 14 dias para a entrega desse pedido! (10 dias úteis!)`.

## 2026-05-14 - Clientes: normalizacao de nomes

- Modulo: clientes / fichas / quadro de producao / Supabase.
- Arquivos alterados: `src/lib/name-normalizer.ts`, `src/features/clientes/actions.ts`, `src/features/fichas/actions.ts`, `src/features/fichas/ficha-form.tsx`, `src/features/quadro-producao/data.ts`, `supabase/migrations/20260514044306_normalize_client_names.sql`, `registro-alteracoes.md`.
- Resultado: criado normalizador compartilhado para nomes de pessoas e empresas, preservando conectores em minusculo, sufixos empresariais e siglas conhecidas.
- Refinamento posterior: adicionadas as siglas `SESI`, `FIEMS`, `GOV` e `SENAI`; termos curtos conectados por `&`, como `M&M` e `R&B`, tambem passam a ser preservados em maiusculas.
- Refinamento posterior: siglas desconhecidas em maiusculas agora so sao preservadas automaticamente ate 3 caracteres, evitando que nomes como `Supermercado THOME LTDA` sejam mantidos como `THOME`.
- Resultado: criacao/edicao de clientes, criacao/edicao de fichas, cards manuais do quadro e impressao de rascunho passam a usar o nome normalizado antes de gravar ou renderizar snapshot tecnico.
- Banco: adicionada migration com funcao SQL, backfill de `clientes.nome` e `fichas.cliente_nome_snapshot`, alem de triggers para normalizar inserts/updates futuros nessas colunas.
- Caveat: `npx supabase db push --linked --dry-run` nao chegou a consultar o projeto porque a CLI esta sem `SUPABASE_ACCESS_TOKEN`/login nesta sessao; a migration ficou pronta, mas ainda precisa ser aplicada no banco autenticado.
- Validacao parcial: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. `supabase:check` retornou `ready` com 218 clientes, 363 fichas, 2036 itens, 461 imagens e 185 catalogos. O helper tambem foi conferido diretamente com `Supermercado THOME LTDA`, `SUPERMERCADO THOME LTDA`, `sesi`, `FIEMS`, `gov`, `senai`, `m&m`, `R&B`, `MJ Feo`, `ABC comercio` e `Loja ABC LTDA`.

## 2026-05-14 - Fichas: total de produtos e lista bruta na impressao

- Modulo: fichas / formulario e impressao individual.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/features/fichas/print-ficha.tsx`, `src/app/fichas/[id]/imprimir/page.tsx`, `src/styles/globals.css`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: o editor de produtos passou a mostrar o total somado das quantidades ao fim da lista, atualizando conforme o operador edita, duplica, remove ou reordena itens.
- Resultado: a tela de criacao/edicao ganhou o checkbox `Imprimir lista bruta` ao lado do botao de impressao; quando marcado e houver lista bruta anexada, a impressao inclui uma secao monoespacada com o texto original.
- Refinamento posterior: o checkbox passou a exibir `Imprimir Lista de Nomes`, e a ordenacao por tamanho foi alinhada para `RN, 1, 2, 4, 6, 8, 10, 12, 14, 16, P, M, G, GG, 52, 54, 56, 58, 60, 62, 64` no editor de produtos e no modal da lista organizada.
- Refinamento posterior: a mesma ordenacao passou a tratar equivalencias operacionais de tamanho: `16=PP`, `52=XG/G1`, `54=EG/G2`, `56=EGG/XGG/G3`, `58=EEGG/XXGG/G4`, `60=ESP1/G5`, `62=ESP2/G6` e `64=ESP3/G7`.
- Refinamento posterior: a lista de nomes anexada deixou de entrar no corpo da ficha; quando selecionada para impressao, agora renderiza como pagina 2 propria e o gerador rasterizado cria uma pagina PDF por bloco `.print-page`.
- Refinamento posterior: a fonte da lista de nomes na pagina 2 foi ampliada de `12px` para `14px`.
- Refinamento posterior: listas de nomes extensas passam a quebrar em 3 colunas somente quando ultrapassam 51 linhas preenchidas, preservando listas medias em uma coluna para evitar espaco em branco excessivo.
- UI posterior: o botao `Imprimir ficha` no formulario recebeu borda na cor primaria.
- Decisao: a lista bruta continua fora da impressao por padrao e entra somente por parametro (`listaNomesRaw=1`) ou no rascunho quando o checkbox estiver marcado, sem alterar persistencia.
- Caveat: listas brutas muito longas podem aumentar o tamanho final da ficha impressa.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge em `localhost:3000/fichas/nova` confirmou o total reagindo a alteracao de quantidade e o checkbox habilitando apos adicionar lista bruta; `/fichas/39d84756-3038-4865-a7da-4f925d9754d1/imprimir?autoprint=0&listaNomesRaw=1` renderizou a secao `Lista de nomes bruta`, enquanto a mesma rota sem `listaNomesRaw=1` nao renderizou a secao.

## 2026-05-12 - UI compartilhada: base Motion

- Modulo: UI compartilhada e Motion.
- Arquivos alterados: `src/components/ui/motion-presets.ts`, `src/components/ui/button.tsx`, `src/components/ui/modal.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/motion-page.tsx`, `src/components/ui/loading-bar.tsx`, `src/components/ui/custom-datalist.tsx`, `src/components/ui/floating-menu.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/index.ts`, `src/styles/globals.css`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: criada uma base compartilhada de presets de Motion para dialog, pagina, popover, tooltip, collapse, lista e loading. `Button`, `MotionPage`, `Modal`, `AlertDialog`, `LoadingBar`, `CustomDatalist`, `FloatingMenu` e `Tooltip` passaram a usar os mesmos timings/easings e respeitar `prefers-reduced-motion`.
- Resultado: modais e alert dialogs agora usam `AnimatePresence` para entrada e saida real; popovers pequenos renderizados em portal mantem foco, teclado, clique fora e posicionamento, mas com animacao curta via Motion.
- Limpeza: a barra de loading deixou de depender de animacao CSS propria, tooltips perderam transicoes manuais de transform/opacity e keyframes antigos sem uso (`fadeIn`, `modalOverlayIn`, `modalScaleIn`, `fichaPreviewSkeleton`) foram removidos.
- Decisao: nao instalar bibliotecas novas. As referencias externas ficaram como repertorio visual, enquanto a implementacao usa `motion` ja presente no projeto.
- Caveat: saida de linhas em `/fichas`, refinamento de reordenacao no quadro e feedback Motion no editor de produtos/observacoes ficaram registrados no `TODO.md` como etapas seguintes. A regra do quadro permanece: nao animar `transform` do card enquanto `fluid-dnd` controla o drag.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge em `localhost:3000` confirmou menu de contexto em `/fichas`, tooltip por foco, modal de previa abrindo/fechando, `CustomDatalist` em `/fichas/nova`, ausencia de erros de console e cards do `/quadro-producao` sem `transform` em `transition`.

## 2026-05-12 - Relatorios: Recharts localizado

- Modulo: relatorios e bibliotecas.
- Arquivos alterados: `src/features/relatorios/relatorios-overview.tsx`, `src/features/relatorios/relatorios-charts.tsx`, `src/features/relatorios/relatorios-motion.tsx`, `src/styles/globals.css`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: `/relatorios` passou a usar `recharts` em um leaf client dedicado para o comparativo do periodo e rankings de vendedor, materiais, produtos, clientes, tamanhos e personalizacoes. O loader server-side e o heatmap manual foram preservados.
- Refinamento posterior: removidas as listas repetidas abaixo dos rankings, deixando os graficos como representacao principal; os labels dos eixos passaram a usar truncamento em uma linha e os valores aparecem no fim das barras.
- UI posterior: os containers internos dos graficos perderam borda/fundo proprios para evitar card dentro de card e reduzir poluicao visual.
- Animacao posterior: os graficos passaram a usar o primitivo Motion da tela, e as funcoes antigas de animacao de lista/barra sem uso foram removidas de `relatorios-motion`.
- Regra do projeto: `AGENTS.md` orienta usar `motion` para animacoes de UI quando a biblioteca ja resolver o caso, evitando keyframes, timers ou transicoes manuais locais sem necessidade clara.
- Decisao: manter `@tanstack/react-query` no quadro de producao, nao migrar `DataTable` para `@tanstack/react-table` neste ciclo e nao criar store `zustand`, porque as superficies atuais seguem cobertas por dados server-side, URL state, React Query e estado local.
- Caveat: o medidor de entrega permaneceu no CSS atual por estar aderente ao layout e nao exigir client-side adicional.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge local em `/relatorios` confirmou os graficos em light/dark mode sem erro de console; Playwright headless validou 1366x768 e 390x844 com 7 SVGs de Recharts, 0 listas duplicadas, labels sem quebra, sem overflow horizontal e com links PDF/Excel preservando os parametros do recorte.

## 2026-05-11 - Lista IA vinculada a ficha

- Modulo: ferramentas de IA e fichas.
- Arquivos alterados: `src/components/ai/uniform-list-parser-demo.tsx`, `src/app/api/ai/uniform-list-ficha/route.ts`, `src/lib/supabase/database.types.ts`, `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `supabase/migrations/20260511162401_fichas_lista_ia.sql`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: `/ferramentas/organizar-nomes-ia` agora permite revisar a tabela gerada pela IA em campos editaveis, localizar uma ficha pelo `Nº venda`/pedido, vincular a lista revisada e carregar uma lista ja vinculada ao mesmo pedido.
- Refinamento posterior: a busca deixou de depender de `numero_venda`; agora carrega uma lista enxuta de pedidos/fichas por cliente ou venda, limitada a 30 registros, sem trazer `lista_ia` nessa consulta. O JSON vinculado so e carregado em uma chamada separada quando uma ficha especifica e selecionada.
- Refinamento posterior: o resultado da IA voltou a abrir em modo leitura, preservando o comportamento anterior de copia em `Nome` e `Numero`; os campos editaveis so aparecem ao acionar `Editar`.
- Refinamento posterior: o seletor da ficha encontrada passou a usar `CustomDatalist`, mantendo o UUID apenas como metadata interna e exibindo venda/cliente/entrega para selecao.
- Refinamento posterior: a busca e a selecao da ficha foram unificadas em um unico `CustomDatalist`, com indicador `Lista anexada`/`Sem lista`.
- Refinamento posterior: o campo de ficha ficou mais largo/alinhado na barra de acoes, e `Enter` no `CustomDatalist` dispara a busca quando nao ha sugestao ativa para selecionar.
- Listagem: `/fichas` passou a mostrar os badges `Lista organizada` e `Lista pendente` junto aos metadados da ficha somente quando os respectivos indicadores leves forem true.
- Fichas: o formulario passou a aceitar uma lista de nomes ainda nao organizada em modal abaixo de `Observacoes`; a lista bruta fica salva na ficha e a listagem mostra a acao `Organizar Lista de Nomes` no menu de contexto somente quando esse texto pendente existe.
- Ferramentas: `/ferramentas/organizar-nomes-ia?fichaId=<uuid>` carrega a lista bruta da ficha no campo de texto e ja deixa a ficha selecionada para organizar e vincular o JSON revisado depois.
- Persistencia posterior: adicionadas `fichas.lista_nomes_raw` e a coluna gerada `fichas.lista_nomes_raw_anexada`, mantendo payload minimo em `/fichas` para indicar lista pendente sem carregar o texto completo.
- Persistencia posterior: adicionada a coluna gerada `fichas.lista_ia_anexada` para listar o estado do vinculo sem carregar o JSON completo de `lista_ia`.
- Check Supabase: `scripts/check-supabase-config.mjs` passou a carregar `.env.local` antes de `.env`, sem sobrescrever os valores locais e sem logs auxiliares do `dotenv`.
- UI posterior: o menu de contexto das fichas ficou mais largo para evitar quebra em `Organizar Lista de Nomes`, e o botao de lista abaixo de `Observacoes` ganhou destaque visual.
- UI posterior: quando a ficha ja possui lista organizada, o badge `Lista pendente` deixa de aparecer mesmo que a lista bruta original ainda esteja salva.
- UI posterior: `FloatingMenu` passou a renderizar o menu em portal no `document.body`, com posicionamento fixo ancorado ao botao, evitando corte, deslocamento e overflow dentro do wrapper de `/fichas`.
- Listas: o menu de contexto das fichas ganhou `Remover lista de nomes (organizada)` e `Remover lista de nomes (bruta)`, limpando respectivamente `lista_ia` ou `lista_nomes_raw` e revalidando a listagem.
- UI posterior: o modal de adicionar lista de nomes no editor de ficha recebeu padding, cabecalho e rodape de acoes mais refinados.
- Fix posterior: `FloatingMenu` deixou de fechar imediatamente ao clicar em botoes `submit`, evitando desmontar o formulario antes da server action de remover lista executar.
- Consulta posterior: os badges `Lista organizada` e `Lista pendente` em `/fichas` passaram a ser clicaveis e abrir modal sob demanda; a listagem continua carregando apenas os booleanos leves, enquanto o modal busca somente `lista_ia` ou somente `lista_nomes_raw` da ficha clicada.
- Fix posterior: o modal de consulta da lista organizada recebeu regras especificas para alinhar as colunas da tabela e o `Modal` passou a renderizar `Dialog.Description`, removendo warnings de acessibilidade do Radix.
- UI posterior: a tabela da lista organizada no modal passou a marcar como ativa a ultima celula de nome/numero clicada, igual a tabela da ferramenta de IA.
- UI posterior: no modal da lista organizada, hover e estado ativo passaram a destacar a celula inteira, nao apenas o texto do nome/numero.
- Ordenacao posterior: o cabecalho `Tamanho` da lista organizada no modal passou a ordenar por blocos, com tamanhos numericos antes dos alfabeticos, sequencia operacional de `P` ate extensoes `EEGG`, e Baby Look em bloco separado.
- UI posterior: a ferramenta `/ferramentas/organizar-nomes-ia` passou a mostrar uma animacao SVG de geracao no lugar da tabela enquanto a IA processa a lista, adaptada aos tokens de cor do app.
- UI posterior: a animacao da ferramenta de IA ficou flat, sem sombra/brilho/wrapper visual extra, e o status passou para `Organizando a sua lista`.
- UI posterior: o texto `Organizando a sua lista...` foi movido para o cabecalho do SVG da animacao e recebeu efeito de typing com cursor.
- UI posterior: o estado vazio da tabela da ferramenta de IA passou a usar uma versao estatica do mesmo SVG como placeholder.
- UI posterior: o placeholder estatico passou a usar texto orientativo no cabecalho, cores neutras e sem frase auxiliar inferior.
- Persistencia: criada a coluna `fichas.lista_ia` (`jsonb`) para salvar o JSON revisado junto da ficha com `items`, modelo usado, timestamp de vinculo, usuario responsavel e texto original quando disponivel.
- API: adicionada `src/app/api/ai/uniform-list-ficha/route.ts` com `GET` por pedido e `POST` por ficha, ambos protegidos por sessao atual.
- Decisao: manter o JSON em coluna dedicada, em vez de misturar em `metadados`, para facilitar consulta, reexportacao e auditoria posterior; o pedido operacional continua sendo `numero_venda`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` e `npm run supabase:check` passaram apos os refinamentos de payload minimo, modo de edicao, `CustomDatalist` unico, indicador de lista anexada, alinhamento, busca por Enter, badge em `/fichas`, lista bruta pendente e carregamento correto de `.env.local`. Edge em `localhost:3000/ferramentas/organizar-nomes-ia` redirecionou corretamente para `/login`, sem overlay e sem erros de console; a validacao autenticada da ferramenta ficou pendente de sessao logada.

## 2026-05-10 - Ferramentas: hub e rota de IA

- Fase/modulo: Ferramentas / organizacao de nomes com IA.
- Arquivos alterados: `src/app/ferramentas/page.tsx`, `src/app/ferramentas/organizar-nomes-ia/page.tsx`, `src/lib/navigation.ts`, `src/components/ui/app-navigation.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: a antiga entrada `/ia` foi substituida por `/ferramentas`; a ferramenta de organizar nomes com IA passou a viver em `/ferramentas/organizar-nomes-ia`.
- Resultado: `/ferramentas` virou um hub simples para futuras microfuncoes internas.
- Decisao: manter a ferramenta acessivel para usuarios autenticados em geral, preservando o comportamento anterior de acesso.
- Validacao: `npm run lint`, `npm run build`, `npm run typecheck` e `git diff --check` passaram; `npm run supabase:check` falhou por ausencia de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente atual.

## 2026-05-10 - Fichas: PDF operacional simplificado

- Fase/modulo: Fichas / exportacao PDF operacional.
- Arquivos alterados: `src/app/fichas/pdf/route.ts`, `src/features/fichas/fichas-filter-toolbar.tsx`, `src/features/fichas/operational-pdf.ts`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o PDF de `/fichas/pdf` deixou de separar a lista por datas dentro do proprio filtro; agora usa uma secao unica `Fichas do recorte`, com grupos por personalizacao.
- Resultado: o campo vazio especial de anotacao ao lado do status foi removido, deixando a tabela mais direta.
- Correcao posterior: o PDF deixou de remover acentos dos textos antes de desenhar, preservando `Sublimação`, `Produção`, `Personalizações` e demais labels em PT-BR.
- Correcao posterior: removidos os sufixos/cabecalhos redundantes de continuidade como `continua` e `continuação` nas quebras de pagina.
- Refinamento: a coluna de cliente ganhou mais largura, a coluna de status foi reduzida e o resumo trocou `Datas` por `Atrasadas`.
- Correcao posterior: no PDF semanal, o resumo passou a separar `Atrasadas anteriores` e `Atrasadas atuais`, tratando como anteriores as fichas da propria lista que ja venceram antes do dia atual.
- Correcao posterior: o PDF de `Proxima semana` passou a incluir tambem o bloco de atrasadas com prioridade, a tabela ganhou a coluna `Etapa` com label ajustado pela personalizacao, e o cabecalho passou a exibir o periodo em formato legivel.
- Decisao: o botao `Exportar PDF` virou um menu com `Somente periodo selecionado` e `Incluir atrasadas`; a rota so inclui atrasadas quando recebe `incluirAtrasadas=true`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e varredura dirigida por termos sem acento/continuidade redundante passaram.

## 2026-05-10 - Relatorios: reforma visual do overview

- Fase/modulo: Relatorios / overview e exportacao.
- Arquivos alterados: `src/features/relatorios/data.ts`, `src/features/relatorios/relatorios-overview.tsx`, `src/features/relatorios/relatorios-motion.tsx`, `src/app/relatorios/excel/route.ts`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: `/relatorios` passou a usar `eyebrow` no header, titulo curto, toolbar com os cinco filtros alinhados, cards de resumo com acento visual, comparativo com contraste melhor, heatmap com orientacao por meses/dias e tooltips, ranking numerado com destaque para top 3, limite visual de 8 itens e indicador de excedentes.
- Correcao posterior: removido qualquer destaque de vendedor no overview e na exportacao; os campos derivados de top vendedor tambem sairam de `RelatorioData`.
- Correcao posterior: removidos icones de medalha e marcadores visuais de podium das listas, mantendo leitura analitica simples.
- Correcao posterior: o heatmap foi aumentado, preso ao overflow horizontal interno do painel e passou a usar escala propria de verde em light/dark mode.
- Correcao posterior: a animacao dos paineis passou a disparar no mount com duracao mais perceptivel, as barras ganharam preenchimento animado e os blocos foram alinhados pelo inicio em vez de aparentarem centralizacao.
- Correcao posterior: o disparo de animacao foi trocado para `useInView`, mantendo paineis fora da dobra em estado inicial ate o scroll acionar a entrada; o gatilho foi antecipado para evitar entrada tardia demais.
- Correcao posterior: o heatmap foi recomposto em tamanho compacto sem overflow horizontal e os labels de personalizacao passaram a sair humanizados, como `Sublimação`, `Serigrafia` e `Bordado`.
- Correcao posterior: o heatmap passou a renderizar apenas dias uteis, removendo sabados e domingos da grade.
- Correcao posterior: o bloco `Entrega` ganhou medidor circular com escala vermelho/laranja/amarelo/verde conforme a taxa, contagem de entregues no periodo e comparativos de mes anterior e ano todo.
- Correcao posterior: o comparativo de entrega passou a usar `recorte atual`, `recorte anterior` e `recorte anual`; o PDF de `/relatorios` agora tem rota propria em `/relatorios/pdf`, e o XLSX ganhou uma secao `Entrega` com esses mesmos dados.
- Decisao: usar `motion` em um leaf client dedicado para micro-animacoes da tela e `exceljs` na rota `/relatorios/excel`, substituindo o HTML `.xls` por workbook `.xlsx` real.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Browser em `localhost:3000/relatorios` validado em light e dark mode sem destaque de vendedor, sem medalhas e sem overflow externo no heatmap.
- Caveat: `npm run supabase:check` falhou porque o ambiente atual nao expôs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` para o script. Na validacao final desta rodada, o `next dev` em foreground chegou a `Ready`, mas o processo local nao permaneceu ativo em background para nova captura visual.

## 2026-05-10 - IA: modelos OpenRouter adicionais

- Fase/modulo: IA interna / modelos.
- Arquivos alterados: `src/lib/ai/model-options.ts`, `registro-alteracoes.md`.
- Resultado: o seletor de `/ia` passou a oferecer `OpenRouter - GPT-4o mini` e `OpenRouter - Qwen 2.5 72B` alem do `OpenRouter - Llama 3.3 70B`.
- Decisao: adicionar uma alternativa OpenAI barata/estavel e uma alternativa Qwen com bom suporte a JSON/saidas estruturadas. A variante gratuita do Llama foi testada, mas retornou rate-limit upstream no provedor gratuito.

## 2026-05-10 - IA: Gemini Pro no seletor

- Fase/modulo: IA interna / modelos.
- Arquivos alterados: `src/lib/ai/model-options.ts`, `registro-alteracoes.md`.
- Resultado: o seletor de `/ia` passou a oferecer `Gemini - 2.5 Flash-Lite` e `Gemini - 2.5 Pro` alem de `Gemini - 2.5 Flash`.
- Decisao: manter `gemini-2.5-flash` como padrao do provider Gemini e expor `gemini-2.5-pro` como alternativa manual para casos que precisem de mais qualidade.
- Caveat: limites do Gemini dependem do modelo e do tier do projeto Google AI, entao Flash, Flash-Lite e Pro nao devem ser tratados como equivalentes. O teste local de `gemini-2.5-pro` retornou quota 0 para o projeto atual.

## 2026-05-10 - IA: rotulo de exportacao

- Fase/modulo: IA interna / exportacao.
- Arquivos alterados: `src/components/ai/uniform-list-parser-demo.tsx`, `registro-alteracoes.md`.
- Resultado: o botao `XLSX` passou a exibir `Exportar para Excel`, mantendo o mesmo comportamento de exportacao.

## 2026-05-10 - IA: estado vazio da tabela

- Fase/modulo: IA interna / tabela de revisao.
- Arquivos alterados: `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: o estado vazio passou a exibir `Tabela vazia :/` em destaque e a instrucao curta abaixo.
- Refinamento visual: reduziu o espaco entre as linhas, suavizou a cor do titulo e aumentou levemente o tamanho dos textos.
- Copy: a instrucao passou a usar `Use o campo de texto ao lado para organizar uma lista.`.

## 2026-05-10 - IA: regras de tamanho sem pendencias

- Fase/modulo: IA interna / organizacao de listas.
- Arquivos alterados: `src/lib/ai/schemas/uniform-list.ts`, `src/lib/ai/prompts/uniform-list.ts`, `src/app/api/ai/parse-uniform-list/route.ts`, `src/components/ai/uniform-list-parser-demo.tsx`, `registro-alteracoes.md`.
- Resultado: a saida estruturada deixou de pedir/exibir `pendencias`, mantendo apenas os itens revisaveis na tabela.
- Decisao: o prompt passou a tratar idade seguida de tamanho par como tamanho infantil arredondado, a reconhecer `XXG`, `XXXG` e `XXXGG`, e a preservar iniciais coladas ao nome como em `gabriel g. num 12 tam`.
- Refinamento: letra de tamanho solta entre nome e numero, como `joao g 10`, passou a ser interpretada como tamanho; inicial de nome precisa estar marcada com ponto, como `g.`.
- Refinamento: termos operacionais como `confirmado`, `aprovado`, `aceito`, `adulto`, `infantil`, `de criança` e `modelo feminino` foram explicitamente proibidos no campo nome.
- Refinamento: termos de modelo como `babylook`, `baby look`, `bl`, `regata` e `polo` tambem foram proibidos no campo nome, com exemplo especifico para `Amanda babylook`.
- Decisao: `adulto`, `infantil` e `de criança` passaram a ser apenas contexto de grade/tamanho; sem indicacao de baby look, regata ou polo, o modelo fica `tradicional`.
- UX: a tabela de resultado agora abre na ordem retornada pela IA, sem ordenar por nome automaticamente; os cabecalhos continuam disponiveis para ordenacao manual.
- Compatibilidade Groq: `observacao` deixou de ser opcional no schema e passou a ser nullable, evitando campos omitidos em Structured Outputs.
- Resiliencia Groq: quando `Output.object` falhar no Groq, o endpoint tenta uma segunda chamada em JSON puro e valida a resposta com o mesmo schema antes de retornar.
- Limite Groq: chamadas Groq passaram a usar teto de saida menor e chunks menores para respeitar o limite atual de 8000 TPM do plano on-demand, evitando recusa por `Request too large`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram; busca por `pendencias` nos arquivos de IA nao encontrou mais usos. Chamadas diretas pequenas com Groq `openai/gpt-oss-20b` e `openai/gpt-oss-120b` retornaram objeto valido no schema novo.
- Caveat: a interpretacao de tamanho continua sendo recomendacao operacional para IA; casos ambiguos devem usar `observacao` e confianca menor.

## 2026-05-10 - IA: seletor de modelo

- Fase/modulo: IA interna / organizacao de listas.
- Arquivos alterados: `src/lib/ai/model-options.ts`, `src/lib/ai/providers.ts`, `src/lib/ai/models.ts`, `src/lib/ai/google.ts`, `src/app/ia/page.tsx`, `src/app/api/ai/parse-uniform-list/route.ts`, `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: `/ia` ganhou seletor de modelo por requisicao, validado no server contra allowlist antes de acionar o provider.
- Decisao: Groq ficou restrito no seletor aos modelos `openai/gpt-oss-120b` e `openai/gpt-oss-20b`, que sao os modelos indicados pela documentacao atual para Structured Outputs; OpenRouter e Gemini continuam disponiveis como alternativas.
- Refinamento visual: select de modelo e botao de organizar passaram a empilhar dentro do painel lateral, evitando overflow horizontal em largura estreita.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Browser em `localhost:3000/ia` redirecionou para `/login` por sessao expirada, entao a validacao visual autenticada ficou pendente.
- Caveat: chaves seguem server-side; o seletor so envia o identificador permitido do modelo.

## 2026-05-10 - IA: multiplos providers

- Fase/modulo: IA interna / providers.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/lib/ai/providers.ts`, `src/lib/ai/models.ts`, `src/lib/ai/google.ts`, `src/app/api/ai/parse-uniform-list/route.ts`, `src/app/api/ai/generate-technical-description/route.ts`, `registro-alteracoes.md`.
- Resultado: a camada de IA passou a suportar Groq, OpenRouter e Gemini via Vercel AI SDK, selecionados por `AI_PROVIDER`.
- Decisao: `groq` e o provider padrao; modelos padrao centralizados em `src/lib/ai/models.ts` (`llama-3.3-70b-versatile`, `meta-llama/llama-3.3-70b-instruct`, `gemini-2.5-flash`).
- Segurança: endpoints continuam server-side, sem expor chaves no client; cada provider valida sua propria variavel (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`).

## 2026-05-10 - IA: erros de listas extensas

- Fase/modulo: IA interna / organizacao de listas.
- Arquivos alterados: `src/app/api/ai/parse-uniform-list/route.ts`, `src/components/ai/uniform-list-parser-demo.tsx`, `registro-alteracoes.md`.
- Resultado: o endpoint passou a classificar erros controlados de timeout, limite de saida, schema invalido, rate limit e falha do provedor, retornando mensagem especifica sem stack trace.
- UX: a pagina `/ia` agora exibe o erro no painel de resultado e dispara toast de falha, evitando erro silencioso quando a lista extensa nao conclui.
- Ajuste operacional: o processamento de listas ganhou timeout de 120s, `maxDuration` de 120s e limite explicito de saida para reduzir cortes em listas maiores.
- Refinamento: listas extensas agora sao divididas em blocos menores no server-side, processadas em chamadas estruturadas separadas e reunidas no JSON final validado.

## 2026-05-10 - TODO: lista IA vinculada a ficha

- Fase/modulo: IA interna / fichas.
- Arquivos alterados: `TODO.md`, `registro-alteracoes.md`.
- Resultado: registrada a pendencia futura para permitir vincular uma lista organizada pela IA a uma ficha.
- Decisao: a lista deve ser salva como JSON revisado junto da ficha, permitindo consulta, reexportacao e auditoria posterior, sem acoplar a tela atual de revisao a uma persistencia automatica.

## 2026-05-10 - IA: ordenacao por cabecalho

- Fase/modulo: IA interna / tabela de revisao.
- Arquivos alterados: `src/components/ui/data-table.tsx`, `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: os cabecalhos da tabela em `/ia` agora ordenam alfabeticamente os itens por coluna, alternando crescente e decrescente a cada clique.
- Exportacao: o XLSX usa a mesma ordenacao ativa na tela.
- Acessibilidade: `DataTable` passou a aceitar ordenacao opcional por coluna com `aria-sort`, sem mudar as tabelas que nao usam esse recurso.
- Ajuste visual: as colunas `Número` e `Tamanho` ficaram mais largas para evitar quebra do cabecalho.

## 2026-05-10 - IA: score visual e celula copiavel

- Fase/modulo: IA interna / tabela de revisao.
- Arquivos alterados: `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: a coluna `Confiança` passou a exibir um score visual com barra colorida por nivel; celulas de `Nome` e `Número` agora usam botao preenchendo toda a celula para copia.
- UX: o hover/foco das celulas copiaveis continua em cor primaria, mas a area clicavel deixa de depender apenas do texto.
- Refinamento: o texto de confianca foi compactado dentro da barra para nao aumentar a altura das linhas da tabela.
- Active: a ultima celula copiavel clicada passa a manter uma borda discreta ate outra celula de nome ou numero ser clicada.
- Refinamento visual: a coluna `Confianca` deixou de usar barra de score e passou a usar badge compacto colorido por nivel.

## 2026-05-10 - IA: XLSX unico e hover por celula

- Fase/modulo: IA interna / tabela e exportacao.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: removida a exportacao em PDF da pagina `/ia`; a tela agora mantem apenas XLSX.
- UX: o hover da tabela de resultado passou de linha inteira para celula individual, e as celulas copiaveis de `Nome` e `Numero` ocupam toda a celula, nao apenas o texto.
- Copy: termos visiveis da UI da ferramenta foram corrigidos para PT-BR com acentuacao, incluindo `Número`, `Confiança`, `Observação`, `Pendências`, `Média` e `revisão`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. A sessao do navegador atual estava expirada e `/ia` redirecionou para `/login`.

## 2026-05-09 - IA: schema enxuto para lista

- Fase/modulo: IA interna / custo e schema de extracao.
- Arquivos alterados: `src/lib/ai/schemas/uniform-list.ts`, `src/lib/ai/prompts/uniform-list.ts`, `src/components/ai/uniform-list-parser-demo.tsx`, `registro-alteracoes.md`.
- Resultado: a IA deixou de processar e retornar `status`, `tipo` e `linhaOriginal` na organizacao de listas, mantendo apenas os campos usados pela tela e exportacao.
- Decisao: preservar a checagem mental de nome contra a linha de origem no prompt, mas sem pedir a linha original como campo de saida para evitar gasto de tokens sem utilidade operacional.

## 2026-05-09 - IA: copia rapida na tabela

- Fase/modulo: IA interna / revisao de lista.
- Arquivos alterados: `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: os paineis de entrada e resultado agora esticam com a mesma altura na grade da pagina `/ia`; valores reais nas colunas `Nome` e `Numero` podem ser copiados diretamente para a area de transferencia.
- UX: nome e numero ganharam hover com cor primaria, cursor pointer, foco visivel e toast de sucesso via `sonner` ao copiar.
- Ajuste visual: a coluna de entrada ficou mais estreita, o painel de resultado passou a ocupar mais largura e a tabela recebeu larguras fixas por coluna para evitar sobreposicao de status, confianca e observacao dentro do wrapper.
- Refinamento de tabela: removidas as colunas `Status`, `Tipo` e `Linha original`; `tradicional` aparece como `Camiseta`, `baby_look` como `Baby Look`, e a confianca passa a ser exibida capitalizada. A celula de nome voltou ao comportamento nativo de tabela para acompanhar a altura da linha quando houver observacao longa.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. A rota `/ia` segue protegida; a sessao do navegador atual estava expirada e voltou para `/login`.

## 2026-05-09 - IA: tabela lateral e exportacao

- Fase/modulo: IA interna / revisao e exportacao de listas.
- Arquivos alterados: `package.json`, `package-lock.json`, `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: a pagina `/ia` passou a organizar o campo de texto e a tabela em duas colunas, com painel de resultado ao lado e botoes para exportar a lista revisada em XLSX e PDF.
- Exportacao: `exceljs` gera `.xlsx` com cabecalho azul, texto branco, bordas, linhas alternadas, larguras definidas, quebra de linha, autofiltro e primeira linha congelada; `jspdf-autotable` gera PDF em paisagem com tabela gradeada, cabecalho destacado e linhas alternadas.
- Decisao: manter exportacao client-side porque os dados ja estao em revisao local e nao devem ser salvos no banco neste ciclo.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge em `localhost:3000/ia` confirmou a pagina em duas colunas, atalho ativo no shell e botoes de exportacao visiveis.
- Caveat: ao tentar executar uma extracao real pelo navegador, a sessao local expirou e voltou para `/login`; a geracao efetiva de arquivos depende de uma resposta de IA autenticada com itens na tabela.

## 2026-05-09 - IA: pagina e atalho no shell

- Fase/modulo: IA interna / acesso operacional.
- Arquivos alterados: `src/app/ia/page.tsx`, `src/lib/navigation.ts`, `src/components/ui/app-navigation.tsx`, `registro-alteracoes.md`.
- Resultado: criada a rota autenticada `/ia` com o demo de organizacao de listas e adicionado o atalho `IA` na navegacao principal do shell.
- Decisao: manter a ferramenta acessivel para usuarios autenticados em geral, sem restringir a `superadmin`, porque a rota usa apenas IA server-side e nao grava dados.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. O build listou `/ia` entre as rotas App Router.

## 2026-05-09 - IA: camada server-side Gemini

- Fase/modulo: IA interna / listas de uniformes e descricoes tecnicas.
- Arquivos alterados: `package.json`, `package-lock.json`, `.env.local`, `src/lib/ai/google.ts`, `src/lib/ai/schemas/uniform-list.ts`, `src/lib/ai/prompts/uniform-list.ts`, `src/lib/ai/schemas/technical-description.ts`, `src/lib/ai/prompts/technical-description.ts`, `src/app/api/ai/parse-uniform-list/route.ts`, `src/app/api/ai/generate-technical-description/route.ts`, `src/components/ai/uniform-list-parser-demo.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: criada a infraestrutura server-side para Gemini com saidas estruturadas por Zod, endpoints protegidos por sessao e demo isolado para revisar listas antes de qualquer persistencia.
- Decisao: usar `generateText` com `Output.object` no AI SDK v6, mantendo o comportamento de objeto validado e evitando a API `generateObject` marcada como deprecated.
- Seguranca: a chave fica apenas em `GOOGLE_GENERATIVE_AI_API_KEY`, sem `NEXT_PUBLIC`, sem chamada client-side para Gemini e sem escrita em banco.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. O build reconheceu `/api/ai/parse-uniform-list` e `/api/ai/generate-technical-description`; `git check-ignore -v .env.local` confirmou que a chave local nao entra no Git; buscas direcionadas confirmaram que nao ha `generateObject`, `NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY` nem normalizacao de nome em codigo.
- Caveat: os testes reais de extracao com Gemini dependem de preencher uma chave Google valida em `.env.local` e usar uma sessao autenticada.

## 2026-05-09 - TODO: rascunho e AlertDialog

- Fase/modulo: fichas / rascunho local e primitivo de dialog.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/components/ui/alert-dialog.tsx`, `src/features/clientes/cliente-delete-action.tsx`, `src/features/catalogos/catalog-item-actions.tsx`, `src/features/catalogos/catalog-items-table.tsx`, `src/features/fichas/ficha-row-actions.tsx`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: o botão `Descartar` do toast de rascunho local voltou a remover o snapshot do `localStorage` e fechar o toast persistente.
- Acessibilidade: o primitivo compartilhado `AlertDialog` agora exige uma descrição e renderiza `AlertDialogDescription` em `sr-only`, eliminando o warning do Radix sem adicionar texto visual redundante aos dialogs atuais.
- Backlog: as pendências correspondentes em `TODO.md` foram marcadas como concluídas e o texto longo do warning foi encurtado.
- Decisão: manter o toast de rascunho não descartável por clique externo/tempo; apenas o botão explícito `Descartar` executa a limpeza.
- Validação: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge em `localhost:3000/fichas/nova` confirmou que `Descartar` remove o draft e fecha o toast; o dialog de saída renderizou `aria-describedby` apontando para uma descrição existente e não gerou novo warning do Radix.

## 2026-05-09 - Catalogos: ordenacao por arrastar

- Fase/modulo: catalogos / ordenacao de itens.
- Arquivos alterados: `src/components/ui/data-table.tsx`, `src/features/catalogos/actions.ts`, `src/features/catalogos/catalog-items-table.tsx`, `src/features/catalogos/catalogo-form.tsx`, `src/features/catalogos/catalogos-overview.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: a lista de itens do catalogo passou a aceitar reordenacao por drag-and-drop; ao soltar um item, a ordem visivel e salva em `catalog_items.sort_order` para a categoria atual.
- Correcao: a tabela passou a deduplicar os itens por `id` durante o render e a normalizar o estado interno do `fluid-dnd` quando o drop gera duplicata transitoria, evitando erro de React por keys repetidas ao reordenar.
- Correcao: o corpo nativo de tabela foi substituido por uma grade compacta com semantica ARIA de tabela, porque `fluid-dnd` aplica posicionamento fixo durante o arraste e isso deixava `<tr>` instavel, alterava o CSS durante o movimento e bloqueava novo arraste do item movido.
- Correcao: a ordem salva deixou de depender do array interno do `fluid-dnd` apos o drop. O componente agora guarda o item arrastado e calcula explicitamente a nova sequencia a partir do indice de destino, evitando POSTs que reenviavam a ordem antiga.
- UX: o campo numerico `Ordem` saiu do formulario. Itens novos entram no fim da categoria e podem ser reposicionados diretamente na lista. A tabela de itens foi compactada com linhas mais baixas, alca de arraste menor, badges reduzidos e aliases/metadados truncados em uma linha.
- Bulk actions: a tabela ganhou selecao por linha, selecao geral da lista visivel, limpar selecao e exclusao em massa com confirmacao. As acoes de linha deixaram de usar menu e passaram a mostrar editar/excluir como botoes icon-only diretos.
- Criacao: o modal `Novo item` passou a permitir escolher a categoria no formulario, independente da categoria atualmente exibida. Na edicao, a categoria permanece travada.
- Decisao: manter `DataTable` como primitivo visual e usar `fluid-dnd` para a interacao, sem migrar esta superficie simples para `@tanstack/react-table`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. O app local respondeu, mas a sessao aberta no navegador nao era `superadmin` e redirecionou `/catalogos` para `/`, entao a validacao visual ficou limitada ao carregamento sem erro de console da sessao existente.

## 2026-05-09 - Catalogos: limpeza de descricao e ajuda de campos

- Fase/modulo: catalogos / formulario de itens.
- Arquivos alterados: `src/features/catalogos/actions.ts`, `src/features/catalogos/catalogo-form.tsx`, `src/styles/globals.css`, `registro-alteracoes.md`.
- Resultado: salvar um item de catalogo com `Descricao` vazia agora envia `null` para `catalog_items.description`, permitindo remover uma descricao preenchida por engano em vez de preservar o valor antigo.
- UX: campos tecnicos do formulario receberam botao de informacao com `Tooltip` para explicar o impacto na montagem da ficha: categoria, aliases, composicao e descricao.
- Decisao: manter a ajuda contextual em tooltip, sem texto fixo adicional na tela, para preservar a UI silenciosa do modulo.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. O app local respondeu em `localhost:3000`; a sessao atual nao tinha acesso direto a `/catalogos`, entao a validacao visual ficou limitada ao carregamento autenticado existente.

## 2026-05-08 - Fichas: padrao tecnico das observacoes

- Fase/modulo: fichas / auto-preenchimento de observacoes.
- Arquivos alterados: `src/components/ui/custom-datalist.tsx`, `src/features/fichas/actions.ts`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-form-seed.ts`, `src/features/fichas/form-state.ts`, `src/features/fichas/legacy-import.ts`, `src/features/fichas/observacoes-autofill.ts`, `src/features/fichas/print-ficha.tsx`, `src/features/fichas/schema.ts`, `src/lib/supabase/database.types.ts`, `src/styles/globals.css`, `supabase/migrations/202605090001_fichas_cor_detalhe_gola.sql`, `registro-alteracoes.md`.
- Resultado: a escrita automatica das observacoes saiu do componente e passou para helper dedicado. O texto deixou de listar itens, quantidades e tamanhos do pedido como detalhe de produtos e agora compoe somente a descricao tecnica de producao em blocos separados por `/`: produto-base quando aplicavel, malha/cor, manga/acabamento, gola/acabamento/largura/cor e personalizacao.
- Casos sociais: o helper passou a tratar `Camisa Social` e `Camisete Social` como produto-base sem repetir a manga no primeiro bloco. Gola social nao gera bloco `GOLA SOCIAL`; em vez disso entram `BOTÃO`, `PÉ DE GOLA` interno/externo, bolso e personalizacao conforme preenchidos.
- Produto-base: o primeiro bloco nao descreve mais manga, porque essa informacao aparece no bloco tecnico de manga. Exemplo: `CAMISETA / MALHA DRY FIT / MANGA CURTA EM BARRA / SEM PERSONALIZAÇÃO`.
- Casos polo: gola polo passou a usar a mesma logica de composicao tecnica separada, mantendo `GOLA POLO` com cor quando preenchida e adicionando blocos independentes de `BOTÃO`, `PEITILHO` interno/externo e `ABERTURA LATERAL`.
- Casos de punho/vies: o bloco de manga agora recebe `larguraManga` e cor do acabamento quando o acabamento e `PUNHO` ou `VIÉS`, compondo exemplos como `MANGA CURTA COM PUNHO 5.0 AZUL ROYAL` e `MANGA CURTA COM VIÉS 3.0 VERMELHO`. `BARRA` permanece sem detalhe adicional: `MANGA CURTA EM BARRA`.
- Extras: bolso, filete e faixa refletiva permanecem como blocos tecnicos quando preenchidos; `Nomes / números` agora entra como `COM NOMES`, `COM NOMES E NÚMEROS` ou `SOMENTE NÚMEROS`; quando houver cor da sublimacao, a personalizacao inclui `COR <valor>`.
- Gola padre esportiva: foi criado o campo `Cor do detalhe`, persistido em `cor_detalhe_gola`, para compor `COM DETALHE NA COR <cor>` antes do reforco quando preenchido.
- Refinos de frase: cor `Sublimacao` no acabamento de manga com punho/vies passa a sair como `SUBLIMADO`, e filete passa a ordenar cor antes do local: `FILETE PRETO NA BARRA DA MANGA`.
- Materiais sociais: `Tecido de Camisaria`, `Profit Camisaria` e `Tricoline Camisaria` agora saem como `TECIDO DE CAMISARIA`, `TECIDO PROFIT` e `TECIDO TRICOLINE`.
- Padrao visual/dados: o editor TipTap passou a forcar letras maiusculas no HTML salvo e no texto digitado manualmente. A superficie de edicao usa texto preto.
- Recalculo imediato: o `CustomDatalist` passou a emitir eventos nativos de `input`/`change` ao selecionar sugestoes por clique, e o auto-preenchimento agora le os valores atuais via `getValues()` no momento do recalculo. Isso evita o atraso em que a observacao so atualizava na escolha seguinte.
- Exemplos validados: `CAMISETA MANGA CURTA / MALHA DRY FIT SUBLIMADA / MANGA CURTA EM BARRA / GOLA REDONDA DE RIBANA 5.0 SUBLIMADA / PERSONALIZADO EM SUBLIMAÇÃO`; `CAMISA SOCIAL / TECIDO DE CAMISARIA MARINHO MESCLA / MANGA LONGA / BOTÃO TRANSPARENTE / PÉ DE GOLA INTERNO E EXTERNO AZUL ROYAL / COM BOLSO NO PEITO / PERSONALIZAÇÃO EM BORDADO`; `CAMISA SOCIAL / TECIDO PROFIT PRETO / MANGA CURTA EM BARRA / BOTÃO PRETO / PÉ DE GOLA INTERNO CINZA MÉDIO E EXTERNO CINZA CHUMBO / SEM BOLSO / PERSONALIZAÇÃO EM DTF TÊXTIL`; `CAMISETE SOCIAL / TECIDO TRICOLINE AMARELO / MANGA CURTA / BOTÃO AMARELO / PÉ DE GOLA EXTERNO LARANJA / SEM BOLSO / PERSONALIZAÇÃO EM SERIGRAFIA`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. O helper foi executado diretamente com os tres casos sociais, dois casos polo, casos de manga curta com barra, punho e viés, a remocao da redundancia de manga no bloco de produto, os extras de bolso/filete/faixa/nomes/cor da sublimacao e o caso de gola padre esportiva com detalhe, retornando as saidas esperadas. Edge em `localhost:3000/fichas/nova` confirmou recalculo imediato ao selecionar sugestoes de material, manga e acabamento da manga, alem da exibicao do campo `Cor do detalhe` ao preencher `Gola Padre Esportiva`.

## 2026-05-08 - Fichas: observacoes com Tiptap e auto-preenchimento curto

- Fase/modulo: fichas / formulario e observacoes.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `package.json`, `package-lock.json`, `TODO.md`, `registro-alteracoes.md`.
- Resultado: o editor de observacoes foi migrado de `contentEditable` manual para Tiptap, mantendo toolbar de negrito, italico, sublinhado, listas, limpar formatacao e auto-preenchimento. O auto-preenchimento passou a gerar um resumo curto em frases naturais, incluindo produtos/tamanhos/quantidades/detalhes, tecido/cor, manga, gola, bolso, filete, faixa, personalizacao e cor de sublimacao quando aplicavel.
- Preservacao manual: o recalculo automatico agora compara o trecho gerado anteriormente com o conteudo atual. Se o operador apenas acrescentou texto ao fim do bloco automatico, o complemento manual e preservado; se o conteudo foi reescrito de forma independente, o auto-preenchimento continuo fica bloqueado ate confirmacao explicita.
- Decisao: usar `@tiptap/extension-underline` como dependencia direta porque o controle de sublinhado ja existia na toolbar e deve continuar suportado no editor novo.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Edge em `localhost:3000/fichas/nova` confirmou renderizacao da superficie Tiptap e auto-preenchimento gerando `Produção: Camiseta Dry Fit tam. M. Tecido Dry Fit Azul Marinho.` no campo oculto salvo.

## 2026-05-08 - Workspace: limpeza de temporarios e gitignore

- Fase/modulo: higiene do workspace / arquivos locais.
- Arquivos alterados/removidos: `.gitignore`, `registro-alteracoes.md`; removidos logs locais `.next-*.log`, `.next-auth-dev.log`, `tsconfig.tsbuildinfo`, `data/fichas.db` e snapshots locais em `data/backups/`.
- Resultado: o workspace ficou sem logs soltos e sem artefato de build TypeScript na raiz. O `.gitignore` foi reorganizado por categoria e passou a cobrir dependencias, build output, estado local da Vercel, envs locais, logs, bancos locais, artefatos de cutover, coverage e relatorios de teste.
- Decisao: manter `node_modules/`, `.next/` e `.vercel/` ignorados, mas nao apagar esses diretorios automaticamente porque sao caches/estado local uteis para desenvolvimento e deploy.
- Caveat: `node_modules/`, `.next/` e `.vercel/` continuam presentes localmente, mas ignorados.

## 2026-05-08 - Migração encerrada e backlog futuro criado

- Fase/modulo: documentação operacional / encerramento de migração.
- Arquivos alterados/removidos: `README.md`, `AGENTS.md`, `TODO.md`, `registro-alteracoes.md`; removido `plano-migracao-next-supabase.md`; `registro-migracao-next.md` foi renomeado para `registro-alteracoes.md`.
- Resultado: a migração foi encerrada como frente ativa. As pendências futuras saíram do plano de migração e passaram para `TODO.md`, usando esse arquivo como backlog vivo de features, refinos e decisões.
- Decisão: manter na raiz apenas `README.md`, `AGENTS.md`, `TODO.md` e `registro-alteracoes.md` como documentos operacionais. O registro continua sendo o diário cronológico de mudanças, validações, decisões e caveats.
- Caveat: entradas históricas antigas dentro deste registro ainda mencionam nomes de arquivos removidos/renomeados porque fazem parte do histórico da migração.

## 2026-05-08 - Legado: limpeza fisica pos-corte

- Fase/modulo: corte / limpeza controlada do legado.
- Arquivos alterados/removidos: `package.json`, `package-lock.json`, `scripts/check-production-readiness.mjs`, `scripts/seed-catalog-items.mjs`, `src/features/fichas/legacy-import.ts`, `src/features/fichas/data/legacy-catalog-fallback.json`, `public/manifest.webmanifest`, `README.md`, `AGENTS.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`; removidos `server.js`, scripts Turso de import/backup/check de corte, `src/config`, `src/controllers`, `src/middlewares`, `src/repositories`, `src/routes`, `src/services`, `src/validators`, `public/css`, `public/data`, `public/img`, `public/index_files`, `public/js`, HTMLs legados e `public/sw.js`.
- Resultado: apos autorizacao explicita do usuario, a limpeza fisica do legado foi executada. `public/` ficou restrito a assets atuais (`favicon`, `robots`, `manifest` e `icons`); o fallback de catalogo versionado ficou em `src/features/fichas/data/legacy-catalog-fallback.json`.
- Dependencias/scripts: removidos `express`, `cors`, `@libsql/client`, `dev:legacy`, `start:legacy`, `migrate:legacy`, `backup:cutover` e `cutover:check`. `prod:check` deixou de exigir `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
- Decisao: `html2canvas` e `jspdf` continuam porque ainda sao usados pelo fluxo Next de impressao/PDF (`src/features/fichas/print-pdf.ts` e `src/features/fichas/operational-pdf.ts`). Se surgir duvida historica, a referencia passa a ser a branch `main` intacta ou o commit pre-migracao, nao arquivos legados neste branch.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`, `npm run prod:check`, `node scripts/seed-catalog-items.mjs` e `git diff --check` passaram depois da limpeza. O `prod:check` agora retorna `ready-for-production`.
- Continuidade: a Fase 10/Fase 11 do plano foi marcada como fechada, `RelatoriosLegadoOverview` foi renomeado para `RelatoriosOverview`, o arquivo antigo sem uso de relatorios foi substituido e a regra obsoleta do shim `window.toast` legado saiu do `AGENTS.md`.

## 2026-05-08 - Fichas/Upload: feedback assincromo com Sonner

- Fase/modulo: fichas / salvamento com imagens.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o envio de imagens pendentes ao Cloudinary antes do submit da ficha passou a usar `toast.promise`, com estados de carregamento, sucesso e erro no mesmo feedback. O fluxo continua submetendo a ficha somente depois de atualizar o payload serializado de imagens.
- Validacao inicial: eslint dirigido em `src/features/fichas/ficha-form.tsx`, `src/app/relatorios/page.tsx` e `src/features/relatorios/relatorios-overview.tsx` passou; `npm run typecheck` passou.

## 2026-05-08 - Vercel: deploy direto em producao a partir da branch de migracao

- Fase/modulo: producao / publicacao Vercel.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a branch local `next-supabase-migration` estava gerando preview pela integracao Git da Vercel, como esperado para branch que nao e a Production Branch. Para publicar o estado atual diretamente em producao, foi executado `npx vercel --prod --yes`.
- Deployment: `dpl_7fxx5jRCF8ApGMgTYGfTgZ4PUUp9` ficou `READY` em `target production`; o alias `https://fichaprimalhas.vercel.app` foi atualizado para essa versao.
- Build remoto: Vercel executou `npm run build`, compilou Next/App Router com sucesso, rodou TypeScript e gerou 21 paginas estaticas sem erro bloqueante. Caveat: o aviso sobre `engines.node >=20.9.0` continua recomendando fixar uma major de Node para evitar upgrade automatico futuro.
- Decisao: para commits futuros subirem automaticamente como producao, ainda e preciso trocar a Production Branch do projeto Vercel para `next-supabase-migration` ou mergear/pushar em `main`; `--prod` resolve a publicacao imediata, nao a politica da integracao Git.

## 2026-05-08 - Inicio: cumprimento inline com Playfair

- Fase/modulo: inicio / dashboard operacional.
- Arquivos alterados: `src/app/page.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o titulo da home agora renderiza nome e cumprimento na mesma linha/logica de texto (`Ola, usuario, boa tarde!`), com o trecho do cumprimento usando `Playfair Display` via `--font-family-serif-display`, italico e sem o paragrafo separado que quebrava a composicao.
- Decisao: manter a fonte carregada no layout global e aplicar apenas no trecho destacado do `h1`, preservando a home como entrada operacional silenciosa.
- Hotfix: `Playfair_Display` passou a carregar tambem o estilo `italic` via `next/font`, e o CSS do cumprimento passou a apontar diretamente para `--font-serif-display`, evitando falso italico sintetizado.
- Validacao: `npm run typecheck`, `npx eslint src/app/layout.tsx src/app/page.tsx`, `npm run build` e `git diff --check` passaram. Edge em `localhost:3000/?fontcheck=playfair` confirmou o titulo em linha unica e o trecho `boa tarde!` com a Playfair real aplicada.

## 2026-05-08 - Fichas: rascunho local e alerta de saida

- Fase/modulo: fichas / criacao e protecao de dados nao salvos.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-save-toast.tsx`, `src/features/fichas/ficha-draft-storage.ts`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a tela `/fichas/nova` agora grava um snapshot local no `localStorage` durante a edicao, ao tentar salvar e tambem antes de sair com alteracoes pendentes. Se o salvamento falhar e a aba for fechada, ao abrir a criacao novamente um toast warning persistente avisa que existe rascunho local e oferece `Restaurar` ou `Descartar`. Imagens locais ainda nao enviadas nao entram no snapshot por limitacao do navegador; imagens ja enviadas ao Cloudinary entram como referencia serializavel.
- Decisao: nao restaurar rascunho automaticamente, para evitar sobrescrever a intencao do operador quando ele quer comecar uma ficha limpa.
- Hotfix: apos teste manual sem toast, o rascunho deixou de depender apenas de submit/saida e passou a ser salvo com debounce em alteracoes de campos, produtos, imagens e datas. Se um teste anterior nao chegou a gravar snapshot no `localStorage`, esse rascunho antigo nao e recuperavel; a correcao vale para os novos rascunhos.
- Hotfix adicional: ao navegar pelo shell do app, o desmontar do formulario agora faz flush do snapshot antes de cancelar timers de autosave, cobrindo cliques na navegacao interna mesmo quando o debounce ainda nao executou.
- Ajuste visual: o toast de rascunho recebeu classe propria para posicionar as acoes abaixo da descricao; `Descartar` usa tom vermelho, `Restaurar` usa tom verde, e o alinhamento do icone dos toasts foi estabilizado no topo do conteudo.
- Protecao de saida: links internos passam por `AlertDialog` quando ha dados nao salvos; fechamento/reload da aba usa `beforeunload`, que so permite o dialogo nativo do navegador.
- Sucesso: ao voltar para `/fichas?saved=created`, o snapshot local de criacao e removido.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. Scan de encoding nos arquivos tocados nao encontrou mojibake novo; os matches restantes sao palavras pt-BR validas com acento.

## 2026-05-08 - Inicio: polimento visual da visao geral

- Fase/modulo: inicio / dashboard operacional.
- Arquivos alterados: `src/app/page.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a home atual ganhou saudacao baseada no usuario logado, data local em `America/Cuiaba`, KPIs com o primitivo `Card` e acentos semanticos, atalhos mais compactos e lista de ultimas fichas com avatar, `Badge` compartilhado e status alinhado no fim da linha.
- Decisao: tratar como refinamento da rota `/`, sem recriar `/dashboard` e sem adicionar texto explicativo/onboarding.
- Validacao: `npm run typecheck`, `npx eslint src/app/page.tsx`, `npm run lint`, `npm run build`, `npm run supabase:check`, `git diff --check` e Edge em `localhost:3000` autenticado como Fernanda. A home exibiu `Olá, Fernanda`, data local, KPIs reais e badges de ultimas fichas alinhados com o mesmo recuo no fim de todas as linhas; console sem erros.

## 2026-05-08 - Producao: aceite funcional do usuario

- Fase/modulo: producao / aceite funcional.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o usuario homologou manualmente em producao a criacao de ficha com upload de imagem, o arraste real no quadro de producao e a persistencia do quadro apos movimentacao. Relato: tudo funciona; restam apenas refinos visuais.
- Decisao: marcar como concluidos os fluxos criticos de producao, incluindo upload de imagem e drag/drop real do quadro, e marcar a paridade funcional como aprovada. Manter abertos os refinos visuais pos-corte e a etapa separada de remocao do legado, que ainda depende de confirmacao operacional.

## 2026-05-08 - Producao: homologacao mutativa controlada

- Fase/modulo: producao / homologacao controlada dos fluxos mutativos pendentes.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Fichas: em `https://fichaprimalhas.vercel.app`, com usuario operador, foi criada uma ficha temporaria `Codex Homologacao Ficha 20260508`, validada na listagem, aberta em previa de impressao, editada (`numero_venda` alterado), marcada como entregue, revertida para pendente e removida pela acao de exclusao com codigo. A contagem voltou para `334` fichas e a busca por fichas `Codex Homologacao%` retornou `0`.
- Clientes: criado cliente temporario `Codex Homologacao Cliente 20260508`, validada busca, edicao de contato, detalhe/historico e exclusao controlada. A contagem voltou para `200` clientes.
- Quadro de producao: via API autenticada de producao, foram criados cartoes temporarios, validando criacao manual, movimento entre colunas, ordenacao por data, entrega e alteracao de status de insumo (`sem_tecido`). Os cartoes temporarios foram removidos via Supabase ao final e a contagem voltou para `334` fichas, sem fichas `Codex Homologacao%`.
- Catalogos/usuarios: criado superadmin temporario `codexsuper20260508` para homologar superficies restritas. Em `/catalogos`, foi criado, editado e excluido o item `Codex Produto Homologacao 20260508` com alias canonico. Em `/usuarios`, foi criado, editado e desativado o operador `codexop20260508`. Ao final, o superadmin, o operador, suas sessoes e qualquer item de catalogo temporario foram removidos; a verificacao retornou `codexUsers=0` e `codexCatalogItems=0`.
- Plano: a auditoria dos checkboxes abertos tambem marcou como concluidos os itens ja comprovados de janela final planejada, estrutura Next escolhida dentro do repo atual e backup preservado em `data/backups/cutover-snapshot-2026-05-07T23-40-57-956Z.json`.
- Decisao: marcar no plano os mutativos principais de producao como homologados, mantendo abertos apenas os pontos que dependem de interacao manual fina: upload novo de imagem com arquivo real e sensacao final do drag and drop real.
- Caveat: a validacao do quadro cobriu as APIs autenticadas e a persistencia das acoes, mas nao substitui uma sessao manual de arrastar e soltar com mouse/touch em producao.

## 2026-05-08 - Vercel: producao publicada e smoke com usuario real

- Fase/modulo: corte para producao / publicacao Vercel e homologacao inicial.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: `npx vercel deploy --prod --yes` publicou o deployment `dpl_BJrFWxBfPyXirk9uKrAGRTGWNPQW`, que ficou `Ready` em `target production` e recebeu o alias `https://fichaprimalhas.vercel.app`. `npx vercel inspect https://fichaprimalhas.vercel.app` confirmou a producao ativa e `npx vercel logs dpl_BJrFWxBfPyXirk9uKrAGRTGWNPQW --no-follow --level error --since 30m` retornou sem erros.
- Smoke tecnico: `vercel curl` confirmou `/login` com HTTP 200 e `/fichas` sem sessao redirecionando para `/login?next=%2Ffichas`, preservando o gate server-side.
- Smoke autenticado: pelo navegador em producao, o login com `fernanda` entrou no app, a home mostrou indicadores reais (`334` fichas, `92` pendentes, `242` entregues, `200` clientes e `43` atrasadas), `/fichas` carregou 25 de 334 fichas, `/quadro-producao` carregou 92 cards em aberto, `/clientes` carregou 200 registros, `/relatorios` carregou indicadores e `/fichas/eba1df56-35fb-4f2d-a9bc-16dbe4be4f95/imprimir?autoprint=0` carregou a versao de impressao com `#print-version`.
- Exports: chamadas autenticadas retornaram HTTP 200 para `/relatorios/excel?periodo=mes` (`application/vnd.ms-excel`) e `/fichas/pdf?status=pendente` (`application/pdf`).
- Autorizacao: com usuario operador, `/usuarios` e `/catalogos` redirecionaram para `/`, confirmando o bloqueio de superficies de `superadmin`. O logout pela UI voltou para `/login`.
- Caveat: ainda falta homologacao manual controlada dos fluxos mutativos em producao: criar/editar ficha, upload de imagens, entregar/reverter, mover/ordenar cards no kanban, CRUD de clientes, CRUD de catalogos e CRUD de usuarios com `superadmin`.

## 2026-05-08 - Corte: checks finais apos revogar token Supabase

- Fase/modulo: corte para producao / validacao final pre-publicacao.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: apos o usuario revogar o token pessoal usado pela Supabase CLI, os checks finais foram repetidos sem depender de novo SQL remoto. `npm run cutover:check` retornou `ready-for-cutover-data`; `npm run typecheck`, `npm run lint` e `npm run build` passaram; `npm run prod:check` retornou `ready-for-production-cutover` fora do sandbox.
- Decisao: marcar o bloco de checks finais do plano como concluido. As pendencias abertas agora sao operacionais de corte: congelar escrita no legado, publicar/promover para producao acessivel, validar fluxos com usuario real e monitorar logs.

## 2026-05-08 - Banco: warnings do Security Advisor corrigidos

- Fase/modulo: Supabase / seguranca pre-corte.
- Arquivos alterados: `supabase/migrations/20260508004128_security_advisor_cleanup.sql`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: criada e aplicada a migration `20260508004128_security_advisor_cleanup.sql` para resolver os warnings informados no dashboard da Supabase. A migration fixa `search_path` nas funcoes `resolve_kanban_column_id`, `sync_fichas_kanban_column`, `reorder_kanban_columns`, `sort_kanban_cards_by_delivery_date`, `set_updated_at`, `move_kanban_card`, `normalize_search_text` e `sync_fichas_busca_normalizada`.
- Extensoes: `pg_trgm` e `unaccent` foram movidas de `public` para o schema `extensions`, com grants para `anon`, `authenticated` e `service_role`. `normalize_search_text` e `sync_fichas_busca_normalizada` receberam `search_path = public, extensions, pg_temp`, preservando a chamada a `unaccent`.
- RLS: removidas as policies antigas `authenticated users can manage ...` com `USING (true)`/`WITH CHECK (true)` das tabelas operacionais. Decisao: o App Router atual acessa o banco server-side com `SUPABASE_SERVICE_ROLE_KEY`; nao ha fluxo client-side usando Supabase Auth para operar essas tabelas, entao manter policies permissivas para `authenticated` era desnecessario e gerava alerta real.
- Verificacao SQL: funcoes retornaram `proconfig` com `search_path` fixo; `pg_extension` mostrou `pg_trgm` e `unaccent` no schema `extensions`; `pg_policies` nao retornou policies `authenticated users can manage%`; `public.normalize_search_text('Paróquia Áéí 123')` retornou `paroquia aei 123`.
- Validacao: `npm run supabase:check`, `npm run cutover:check`, `npm run typecheck`, `npm run lint`, `npm run build` e `npm run prod:check` passaram. `npx supabase db advisors --linked --type security --level warn --fail-on none -o json` retornou `No issues found`.
- Caveat: o token pessoal da Supabase usado nesta sessao foi revogado pelo usuario apos a aplicacao das migrations e validacoes.

## 2026-05-08 - Banco: migrations pendentes aplicadas

- Fase/modulo: corte para producao / aplicacao de migrations Supabase.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o repo foi linkado ao projeto Supabase `qgqoxzbncbcmuaqmytou` com a CLI local. `npx supabase db query --linked` foi validado com query read-only (`current_database() = postgres`, `current_schema() = public`, `ok = 1`).
- Migrations aplicadas no banco alvo via `npx supabase db query --linked -f`: `supabase/migrations/202605050002_catalog_items_canonical_cleanup.sql` e `supabase/migrations/202605060001_fix_kanban_move_dense_order.sql`.
- Verificacao SQL: catalogos canonicos conferidos com contagens `gola=8`, `acabamento_manga=6`, `acabamento_gola=5`, `bolso=13`; amostras como `gola-padre-com-ziper`, `punho-sublimado`, `ribana-em-molde` e `2-bolsos-na-frente-e-2-atras` retornaram com nomes/aliases esperados.
- Verificacao Kanban: `pg_get_functiondef(public.move_kanban_card(uuid,uuid,integer))` contem `clamped_target` e `row_number() over`, confirmando a versao com ranking denso; a checagem de divergencia de ordem dos pendentes retornou `out_of_order = 0`.
- Checks pos-SQL: `npm run supabase:check` passou com 200 clientes, 334 fichas, 1871 itens, 416 imagens e 224 catalogos; `npm run cutover:check` retornou `ready-for-cutover-data`; `npm run prod:check` retornou `ready-for-production-cutover` ao repetir fora do sandbox por causa do EPERM conhecido do cache npm/Vercel.
- Caveat: como um token pessoal da Supabase foi usado nesta sessao para destravar a CLI, ele foi revogado pelo usuario apos a aplicacao e validacao.

## 2026-05-08 - Ferramentas: Supabase CLI instalada

- Fase/modulo: corte para producao / ferramentas de banco.
- Arquivos alterados: `.gitignore`, `package.json`, `package-lock.json`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: instalada a Supabase CLI como dev dependency do projeto com `npm install supabase --save-dev`, seguindo a orientacao atual da documentacao de usar `npx supabase` ou dependency local em vez de `npm install -g`. `npx supabase --version` retornou `2.98.2`; `npx supabase db --help` confirmou `db query`, `db push`, `db pull`, `db dump` e `db advisors`.
- Higiene: `supabase/.temp/` foi adicionado ao `.gitignore` porque a CLI grava cache local como `cli-latest`.
- `psql`: nao foi instalado nesta etapa porque `.env` nao contem `SUPABASE_DB_URL`/`DATABASE_URL`, entao o cliente direto nao teria string de conexao para usar. Como a CLI instalada ja oferece `npx supabase db query --linked -f <arquivo.sql>`, ela deve ser suficiente para aplicar as migrations apos autenticar.
- Caveat: `npx supabase projects list` ainda falha com `Access token not provided`; para aplicar as migrations pendentes pela CLI, falta executar `npx supabase login` ou definir `SUPABASE_ACCESS_TOKEN` no ambiente.

## 2026-05-08 - Ferramentas: CLI validada e bloqueio de token isolado

- Fase/modulo: corte para producao / preparacao para aplicar migrations.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a CLI local continuou funcional (`npx supabase --version` = `2.98.2`), mas o fluxo interativo `npx supabase login` nao roda nesta sessao por ser non-TTY. A CLI retornou: `Cannot use automatic login flow inside non-TTY environments. Please provide --token flag or set the SUPABASE_ACCESS_TOKEN environment variable.`
- Ambiente: `npx vercel env ls` confirmou que Vercel tem `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Turso e Cloudinary, mas nao tem `SUPABASE_DB_URL`/`DATABASE_URL`. Portanto, `psql` ainda nao destrava a execucao SQL sem uma connection string.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram depois da instalacao da CLI. O build compilou Next/App Router com as rotas atuais e o Supabase check segue `ready` com 200 clientes, 334 fichas, 1871 itens, 416 imagens e 224 catalogos.
- Proximo passo objetivo: fornecer `SUPABASE_ACCESS_TOKEN` ou rodar `npx supabase login --token <token>`; em seguida aplicar as migrations pendentes com `npx supabase db query --linked -f supabase/migrations/202605050002_catalog_items_canonical_cleanup.sql` e `npx supabase db query --linked -f supabase/migrations/202605060001_fix_kanban_move_dense_order.sql`.

## 2026-05-08 - Vercel: preview publicado e pronto

- Fase/modulo: corte para producao / publicacao Vercel em preview.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o `npx vercel inspect` executado pelo usuario confirmou o deployment `dpl_7cWfNJywKVHcNYWbEecuT2TP158C` como `Ready`, com `target preview`, para `https://fichaprimalhas-7qpmh5ida-lucascellis-projects.vercel.app`. O inspect tambem mostrou build remoto com funcoes Next/App Router, incluindo `_not-found`, `api/cloudinary/config` e `api/cloudinary/image/[...publicId]`.
- Decisao: marcar a publicacao Vercel em preview como concluida no plano, mas manter abertas a validacao com usuario real, a promocao/troca de dominio em producao e o monitoramento inicial de logs.
- Caveat: este registro usa o output do inspect informado pelo usuario; nao houve nova validacao interativa de login/rotas neste ciclo.

## 2026-05-08 - Vercel: smoke tecnico do preview

- Fase/modulo: corte para producao / validacao tecnica do preview Vercel.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: `supabase:check` continua `ready` com 200 clientes, 334 fichas, 1871 itens, 416 imagens e 224 catalogos; `cutover:check` continua `ready-for-cutover-data`, com 333 fichas legadas cobertas, 1 ficha nativa e 0 cards manuais. A maquina ainda nao tem `supabase` CLI nem `psql`, entao as duas migrations pendentes seguem exigindo SQL Editor, ambiente com CLI/DB URL ou MCP Supabase com `execute_sql`.
- Preview: `npx vercel inspect` foi repetido fora do sandbox e confirmou novamente o deployment `dpl_7cWfNJywKVHcNYWbEecuT2TP158C` como `Ready`. Pelo browser comum, `/login` abre a protecao/login da Vercel; pela CLI autenticada, `npx vercel curl /login --deployment https://fichaprimalhas-7qpmh5ida-lucascellis-projects.vercel.app` atravessou a protecao e retornou 200 com `Login | Fichas Tecnicas`.
- Rotas: via `vercel curl`, `/fichas` sem sessao retornou 307 para `/login?next=%2Ffichas`, confirmando o gate server-side no preview. `/api/cloudinary/config` e uma rota inexistente tambem foram interceptadas pelo gate sem sessao e redirecionaram para login, comportamento esperado enquanto sem cookie de app.
- Logs: `npx vercel logs dpl_7cWfNJywKVHcNYWbEecuT2TP158C --no-follow --level error --since 30m` retornou `No logs found`.
- Caveat: ainda nao houve homologacao com usuario real no preview/producao porque o navegador comum fica na protecao da Vercel; para validar UI autenticada remotamente, liberar/bypassar Deployment Protection ou promover para um ambiente acessivel durante a janela de corte.

## 2026-05-07 - Corte: carga manual fechada e checks finais

- Fase/modulo: corte de dados / validacao final local.
- Arquivos alterados: `README.md`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: apos a importacao manual por JSON feita pelo usuario, `npm run cutover:check` retornou `ready-for-cutover-data`. O Supabase ficou com 334 fichas totais: 333 fichas legadas cobertas por `legacy_ficha_id` ou correspondencia de JSON manual, 1 ficha nativa do Next/Supabase e 0 cards manuais.
- Contagens atuais: `npm run supabase:check` retornou `ready` com 200 clientes, 334 fichas, 1871 itens, 416 imagens e 224 itens de catalogo.
- Checks finais pos-carga manual: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `npm run prod:check` passaram. O primeiro `prod:check` dentro do sandbox falhou apenas no acesso do `npx vercel` ao cache do npm; repetido fora do sandbox, retornou `ready-for-production-cutover` com Vercel CLI 53.2.0.
- Documentacao: `README.md` passou a listar `npm run cutover:check` entre os comandos principais, e o plano registrou que a aplicacao das migrations pendentes exige SQL Editor/Supabase CLI/`execute_sql`, ja que esta sessao nao tem Supabase CLI, `psql`, `SUPABASE_DB_URL` nem ferramenta MCP de SQL remoto.
- Proxima pendencia de corte: aplicar/confirmar as migrations pendentes no banco alvo e entao publicar a versao Next/Supabase na Vercel.

## 2026-05-07 - Corte: checagem repetivel da lacuna de fichas

- Fase/modulo: corte de dados / validacao de importacao manual.
- Arquivos alterados: `package.json`, `scripts/check-cutover-gap.mjs`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: criado `npm run cutover:check`, um verificador read-only que compara as fichas nao manuais do Turso com o Supabase. Ele aceita duas formas de cobertura: `legacy_ficha_id` preenchido ou ficha criada manualmente no Next/Supabase com mesmo cliente normalizado, data de entrega e numero de venda.
- Validacao: `node --check scripts/check-cutover-gap.mjs` passou. `npm run cutover:check` retornou `pending-cutover-data`, com 333 fichas legadas nao manuais, 331 fichas no Supabase, 318 com `legacy_ficha_id`, 12 cobertas por JSON manual sem `legacy_ficha_id`, 1 ficha nativa sem legado e 0 cards manuais.
- Pendencia real apos a carga manual parcial: faltam somente `368` (Paroquia Nsra. da Abadia - Sidrolandia, venda 6313, entrega 2026-05-11), `369` (Nathan Ferreira, entrega 2026-05-27) e `370` (Gabriela Carvalho, entrega 2026-05-19).
- Caveat: `vercel build` local e `vercel build --standalone` compilaram o Next, mas a CLI falhou ao empacotar `.vercel/output` por `EPERM` ao criar symlink de funcao no Windows. A validacao local confiavel segue sendo `npm run build`; a validacao Vercel final deve ser remota ou em ambiente com permissao de symlink.

## 2026-05-07 - Corte: snapshot e checks pre-carga manual

- Fase/modulo: corte para producao / validacao pre-corte.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: workspace estava limpo apos o commit do estado anterior. Foram executados `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check`, `npm run prod:check` e `npm run migrate:legacy` em dry-run. Typecheck, lint, build e Supabase check passaram; `prod:check` passou ao repetir fora do sandbox porque o `npx vercel` precisava acessar o cache do npm. O dry-run do import nao gravou dados.
- Snapshot: `npm run backup:cutover` gerou `data/backups/cutover-snapshot-2026-05-07T23-40-57-956Z.json`, com 333 fichas legadas nao manuais, 330 fichas no Supabase, 1839 itens, 411 imagens, 224 itens de catalogo e 7 usuarios no resumo.
- Diagnostico de lacuna: comparando `legacy_ficha_id`, ha 318 fichas importadas com origem legada e 15 fichas legadas ainda ausentes no Supabase: `356`, `357`, `358`, `359`, `360`, `361`, `362`, `363`, `364`, `365`, `366`, `367`, `368`, `369` e `370`.
- Contagem esperada: o Supabase tera uma ficha a mais que o legado porque ja existe 1 ficha criada diretamente no novo sistema. Portanto, apos a carga manual, a validacao correta e `333` fichas legadas com `legacy_ficha_id` + `1` ficha nativa do Next/Supabase, totalizando pelo menos `334` fichas operacionais, sem contar cards manuais se houver.
- Decisao do usuario: nao rodar `npm run migrate:legacy -- --apply`; as fichas faltantes serao adicionadas manualmente por JSON.
- Caveat: a tentativa de iniciar `npx vercel build` foi interrompida pelo usuario antes de produzir resultado e nao deve ser tratada como validacao.

## 2026-05-07 - Plano: corte final e legado reposicionados

- Fase/modulo: documentacao executiva / fechamento da migracao.
- Arquivos alterados: `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Analise: o inventario atual do App Router confirma que a nova aplicacao ja cobre as superficies operacionais principais: `/`, `/fichas`, `/quadro-producao`, `/clientes`, `/catalogos`, `/usuarios`, `/relatorios`, auth/logout, APIs de Cloudinary, APIs do quadro, PDF/exportacoes e scripts de validacao/corte.
- Resultado: o topo do plano agora mostra apenas o que realmente falta para subir e abandonar o legado: congelar escrita no legado, gerar snapshot, rodar importacao final, aplicar migrations pendentes no banco alvo, executar checks finais, publicar na Vercel, validar fluxos reais em producao, monitorar logs e depois remover `server.js`/`public`/residuos legados com novo ciclo de checks.
- Decisao: refinos visuais, sensacao final de drag real, paridade fina do auto-preenchimento de observacoes e possivel migracao do editor para Tiptap foram classificados como pos-corte, desde que a homologacao de producao nao revele bloqueador funcional.
- Caveat: o `git status --short` ja tinha alteracoes existentes em varias features e nos documentos antes desta rodada; esta atualizacao respeitou esse estado e limitou a edicao aos documentos vivos.

## 2026-05-07 - Quadro de producao: entrega otimista corrigida

- Fase/modulo: `/quadro-producao` / entrega final de card.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnostico: a API de entrega ja marcava a ficha correta por `fichas.id`/UUID, mas a UI podia manter o card visivel porque a lista renderizada vinha do estado interno do `fluid-dnd` (`fluidCards`) em vez da lista canonica do React Query quando nao havia arraste ativo. Em cenarios com cache/placeholder, a remocao otimista tambem ficava limitada a uma unica chave de filtro.
- Resultado: a mutation de entrega agora remove o card de todos os caches `quadro-producao` e restaura todos eles em caso de erro. A coluna renderiza `column.cards` fora de drag ativo e usa `fluidCards` apenas durante arraste, permitindo que o `AnimatePresence` veja a remocao do card e execute a animacao de saida.
- Validacao: `npx eslint src\features\quadro-producao\quadro-producao-client.tsx`, `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. O dev server foi iniciado em `http://localhost:3000` e `/quadro-producao` respondeu HTTP 200; a validacao visual de clique/animacao ficou pendente porque a sessao nao tinha browser interativo/`agent-browser` disponivel.

## 2026-05-07 - Quadro de producao: largura, flash inicial e entrega final

- Fase/modulo: `/quadro-producao` / responsividade visual e acoes do card.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a troca de layout desktop do quadro passou para `useLayoutEffect`, reduzindo o flash em que a grade aparecia e depois virava painel redimensionavel. O container principal agora libera largura maior para paginas com `quadro-producao-view`, aproveitando melhor monitores ultrawide.
- Acoes: na ultima coluna, o botao de avancar foi substituido por `Marcar pedido como entregue`, com icone de check e destaque verde. A entrega usa a API existente `/api/quadro-producao/cards/[id]/entregar`, remove o card de forma otimista do board e invalida os dados depois.
- Motion: cards removidos do quadro agora usam `AnimatePresence`/`motion.article` para sair com fade, escala leve e colapso de altura, sem animar layout continuo para nao disputar com o `fluid-dnd`.
- Validacao: `npm run typecheck` passou; `npm run lint`, `npm run build`, `npm run supabase:check` e checagem visual ainda precisam ser executados apos esta anotacao.

## 2026-05-07 - UI: Motion adotado nos primitivos

- Fase/modulo: design system compartilhado / microinteracoes.
- Arquivos alterados: `package.json`, `package-lock.json`, `AGENTS.md`, `src/components/ui/button.tsx`, `src/components/ui/modal.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/app-shell.tsx`, `src/components/ui/motion-page.tsx`, `src/components/ui/index.ts`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: `motion` foi instalado e passou a ser usado em leafs client compartilhados. `Button` ganhou feedback sutil de tap, `Modal` e `AlertDialog` ganharam entrada suave de overlay/conteudo, e o shell autenticado passou a animar transicoes de rota com `MotionPage`, respeitando `prefers-reduced-motion`.
- Decisao: concentrar Motion nos primitivos e na camada de pagina para gerar sensacao premium sem espalhar animacoes locais por modulo.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. A primeira tentativa de build sem permissao externa falhou apenas no fetch da fonte Google do `next/font`; o build rerodado com permissao passou. Edge DevTools em `http://localhost:3000/clientes` confirmou login, listagem e modal `Novo cliente` renderizados sem erros de console capturados.

## 2026-05-06 - Fichas: metadados compactos na listagem

- Fase/modulo: `/fichas` / refinamento visual da listagem operacional.
- Arquivos alterados: `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a listagem passou a buscar `ficha_itens(quantidade)` junto com as fichas, calcular o total de itens da ficha e exibir esse total antes do numero da venda. Os dois metadados agora usam `Badge` neutro com classe compacta local, em vez de texto secundario solto.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. No Edge em `/fichas`, as primeiras linhas renderizaram badges neutros compactos de 18px com o total de itens antes da venda.

## 2026-05-06 - DnD migrado para Fluid DnD

- Fase/modulo: fichas e quadro de producao / troca completa da biblioteca de drag and drop.
- Arquivos alterados: `package.json`, `package-lock.json`, `AGENTS.md`, `src/features/fichas/ficha-form.tsx`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: Atlassian Pragmatic deixou de ser dependencia ativa e `fluid-dnd` passou a ser a unica biblioteca DnD do App Router.
- Fichas: produtos e imagens agora usam `useDragAndDrop` de `fluid-dnd/react`, com handle dedicado para produtos e para o topo do card de imagem; a ordem retornada pelo Fluid e sincronizada com `react-hook-form` por ids estaveis, preservando `itensJson`, `imagensJson` e a persistencia de `ordem`.
- Quadro de producao: cada coluna virou uma lista Fluid no grupo compartilhado `quadro-producao-cards`; o drop e convertido para `{ cardId, destinationColumnId, destinationIndex }` e segue pela mutation otimista existente.
- Visual/UX: estados de drag/drop passaram a usar classes Fluid explicitas, os shadows manuais da biblioteca anterior foram removidos, o scroll interno das colunas foi mantido e cards ganharam handle de arraste proprio para nao disputar com botoes/selects.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e varredura por residuos da biblioteca anterior passaram. No Edge em `http://localhost:3000/fichas/nova`, a tela renderizou a lista de produtos com 1 item, sem erros de console e sem residuos Pragmatic no DOM. Em `http://localhost:3000/quadro-producao`, a tela renderizou 5 colunas, 82 cards, 82 handles de arraste, listas com `overflow-y: auto`, sem erros de console e sem residuos Pragmatic no DOM.
- Hotfix: apos teste manual, a sincronizacao generica entre Fluid e `react-hook-form` no formulario foi trocada por sincronizacao dirigida. Add/remover/duplicar/ordenar/editar agora atualizam explicitamente RHF e Fluid, enquanto o efeito de drag apenas persiste a ordem final quando a lista volta a ter ids unicos. Tambem foram zerados os delays de inserir/remover e reduzida a animacao para 90ms, evitando duplicacao visual de produto e a sensacao de camera lenta. Revalidado com `npm run typecheck`, `npm run lint`, `npm run build` e Edge em `/fichas/nova`: adicionar produto passou a renderizar 2 linhas e o drag simulado manteve 2 linhas, sem warning de key duplicada.
- Correcao de uso Fluid: a configuracao de `useDragAndDrop` deixou de ser criada inline a cada render e passou a ser memoizada em produtos, imagens e colunas do quadro. As keys dos itens tambem deixaram de incluir o indice, preservando o mesmo no DOM durante reordenacao. No quadro, os callbacks de mover card/status foram estabilizados antes de chegar em `ColumnSurface`, evitando recriacao desnecessaria da configuracao Fluid.
- Validacao adicional: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram. Edge em `http://localhost:3000/fichas/nova` confirmou adicionar produto com 2 linhas e console limpo; Edge em `http://localhost:3000/quadro-producao` confirmou 5 colunas, 82 cards e 82 handles, tambem sem warnings/erros de console. Caveat: a tentativa de simular drag completo por JS nao reproduziu um gesto fisico confiavel, entao a validacao visual desta rodada ficou como smoke de renderizacao/console e estabilidade estrutural.
- Correcao de fluidez real: comparando com o exemplo React oficial de listas agrupadas da Fluid, o app tinha `transition` em `transform` nos itens arrastaveis. Como a Fluid move os itens por `transform`, isso atrasava cada frame do ponteiro. `src/styles/globals.css` removeu `transform` das transicoes de `products-editor__row` e `quadro-producao-card`, removeu translate/rotate decorativos de hover/drag dos cards DnD e adicionou `will-change: transform` nos itens controlados pela Fluid. No Edge, o CSS computado passou a mostrar `transformInTransition: false` em produtos e cards do quadro.
- Correcao de colunas Kanban: o quadro deixou de depender da alca `.quadro-producao-card__drag-handle`; a Fluid agora marca o proprio `.quadro-producao-card` como `handler-class`, deixando o card inteiro arrastavel. O movimento entre colunas passou a ser persistido diretamente no `onDragEnd` da lista de destino, usando a coluna atual como `destinationColumnId` e normalizando `destinationIndex` para nunca ficar negativo em drops no topo. Botoes/selects internos param `pointerdown/mousedown` para continuar clicaveis sem iniciar arraste.
- Validacao Kanban: no Edge, `.quadro-producao-card` apareceu com `handler-class grab draggable`, enquanto a antiga alca visual deixou de ser handler. Uma simulacao de drag da primeira para a segunda coluna, com `fetch` interceptado para nao gravar no banco, moveu o card no UI e gerou payload `/move` com `destinationColumnId` da segunda coluna e `destinationIndex: 0`. Depois do reload, o quadro voltou ao snapshot real com 82 cards.
- Primeira mitigacao de alvo de ponteiro: o log `t.closest is not a function` vinha de uma suposicao interna da Fluid ao chamar `.closest()` no alvo do evento. Para reduzir alvos nao interativos durante o drag, `src/styles/globals.css` colocou `pointer-events: none` nos spans, chips, icones e alca visual nao interativos do card, mantendo `button`/`select` clicaveis com `pointer-events: auto` e `stopPropagation`. A correcao definitiva para eventos globais sem alvo `Element` veio no guard descrito abaixo.
- Ajuste visual: removida a alca/dropzone visivel dos cards do Kanban. Como o card inteiro ja e a area de arraste, `src/features/quadro-producao/quadro-producao-client.tsx` deixou de renderizar `.quadro-producao-card__drag-handle` e `src/styles/globals.css` removeu os estilos correspondentes. O grip do cabecalho da coluna foi mantido.
- Correcao de tooltip durante drag: o botao de preview de imagem agora consulta o drag ativo antes de abrir por hover/focus/click e fecha o preview se o ponteiro passar por ele durante um arraste. A regra CSS que ativava o footer de acoes em `.quadro-producao-card--dragging` tambem foi removida, evitando que os controles do card acordem por causa da classe de drag. Validado com `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e Edge em `/quadro-producao`: 82 cards, 0 handles antigos, card como `handler-class`, seletor de footer-drag removido, drag simulado entre colunas gerando payload `/move` correto e 0 previews no DOM durante todo o arraste.
- Correcao definitiva do `t.closest`: inspecionado o bundle da `fluid-dnd@2.6.3`, o stack vinha de `usePositioning`, que chama `event.target.closest(...)` assumindo que todo alvo de `mousedown/mousemove/mouseup` e `Element`. Como a biblioteca escuta `mousemove` no `document`, alguns eventos reais chegam com alvo `Document`/`Node` sem `.closest`. Criado `src/lib/fluid-dnd-event-target-guard.ts` para normalizar somente esses eventos invalidos antes da Fluid, redisparando o mouse event no `parentElement` ou no elemento sob o ponteiro. O guard foi ligado em `src/features/fichas/ficha-form.tsx` e `src/features/quadro-producao/quadro-producao-client.tsx`.

## 2026-05-06 - Quadro de produção: persistência de ordem e filtros

- Fase/modulo: quadro de produção / correção do drag and drop e filtros.
- Arquivos alterados: `supabase/migrations/202605060001_fix_kanban_move_dense_order.sql`, `src/app/quadro-producao/page.tsx`, `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnóstico: a API de filtros respondia corretamente quando chamada direto, mas o cliente reaplicava `initialData` para chaves filtradas novas, exibindo o snapshot sem filtro durante a troca. No movimento dos cards, a RPC recebia o índice denso da UI e comparava contra `kanban_ordem`; como a coluna já tinha buracos de ordenação, o card podia voltar para a posição anterior depois do refresh/refetch.
- Implementação: o cliente agora recebe `initialFilters`, só usa `initialData` quando a query atual bate com esses filtros iniciais e mantém `placeholderData: keepPreviousData` nas trocas. A mutation de mover card deixou de invalidar/refazer o board imediatamente após o drop e o aviso visual por coluna foi removido para evitar flash/layout shift.
- Correção posterior: quando o ponteiro soltava sobre o próprio shadow, o alvo da coluna tratava o drop como fim da lista. A lista do quadro passou a guardar o último shadow ativo e usar esse card/edge como fallback de destino, preservando a posição visual indicada. A busca também passou a usar debounce de 350ms antes de gravar `busca` na URL, reduzindo as chamadas repetidas por caractere.
- Banco/migração: criada a migration `202605060001_fix_kanban_move_dense_order.sql`, redefinindo `move_kanban_card(...)` para recalcular a ordem por ranking denso, inserir o card no índice solicitado e normalizar os cartões pendentes existentes por coluna.
- Validação: `npm run typecheck`, eslint dirigido em `src/features/quadro-producao/quadro-producao-client.tsx` e `src/app/quadro-producao/page.tsx`, `npm run build` e `npm run supabase:check` passaram. No Edge DevTools em `http://localhost:3000/quadro-producao`, a busca por `zzzzzz-nao-existe` atualizou a URL, zerou os cards e mostrou `0 em aberto`; limpar filtros restaurou os 82 cards.
- Caveat: a migration foi versionada, mas não aplicada por CLI local porque esta máquina não tem `supabase` CLI nem `psql` no PATH. Aplicar essa migration no banco alvo é necessário para a persistência sobreviver a refresh.

## 2026-05-06 - Quadro de produção: cards e colunas alinhados ao legado

- Fase/modulo: quadro de produção / refinamento visual e ações rápidas.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/quadro-producao/config.ts`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: os filtros e botões do quadro passaram a seguir o mesmo comportamento visual de hover/focus dos campos e botões compartilhados do app. As colunas perderam o fundo próprio e ficaram com superfície transparente, borda discreta e acento colorido apenas no topo.
- Colunas: o contador de cards ficou no topo à direita e os ícones utilitários da coluna foram movidos para uma linha abaixo do título, reduzindo a disputa visual no header.
- Cards: o nome do cliente virou a primeira informação, venda/manual foi removido do resumo, personalização/material/evento viraram chips, a data de entrega foi para o rodapé do card e o status da ficha virou um select compacto em formato de chip com `Tudo OK`, `Sem tecido`, `Sem tinta`, `Sem papel` e `Pendências`.
- Ações: o olho abre o detalhe e, no hover/focus, mostra a miniatura da primeira imagem da ficha em um preview flutuante. O antigo check de entrega saiu do card; no lugar, o botão com seta move o card para a próxima coluna.
- Validação: `npm run typecheck`, eslint dirigido em `src/features/quadro-producao/quadro-producao-client.tsx` e `src/features/quadro-producao/config.ts`, `npm run build` e `npm run supabase:check` passaram. No Edge DevTools em `http://localhost:3000/quadro-producao`, a inspeção confirmou 82 cards, colunas com fundo transparente e borda superior de 3px, header separado em título/contador + ações, título do card como primeira informação, chips/status-chip renderizados, venda ausente do resumo e entrega no rodapé.

## 2026-05-05 - DnD Pragmatic com shadow de encaixe

- Fase/modulo: fichas e quadro de produção / refinamento de drag and drop.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Correção: a primeira tentativa de pré-ordenar a lista durante o drag foi descartada por ser frágil. O comportamento foi refeito no padrão de shadow: o estado real da lista não muda durante o arraste; cada alvo renderiza apenas um placeholder visual no ponto de encaixe.
- Fichas: produtos e imagens passaram a medir o item arrastado e renderizar placeholders antes/depois do alvo.
- Quadro de produção: cards e listas renderizavam um placeholder no ponto de drop, preservando o scroll interno e deixando o cálculo final de índice apenas para o drop real.
- Correção do pisca-pisca: o shadow ativo deixou de ser estado interno de cada card. Agora a coluna/lista mantém um único shadow ativo e os cards não apagam o placeholder em `onDragLeave`, porque esse leave pode ser causado pelo próprio espaço inserido pelo shadow. O mesmo padrão foi aplicado aos itens de produto/imagem no formulário.
- Validação: `npm run typecheck`, eslint dirigido em `src/features/fichas/ficha-form.tsx` e `src/features/quadro-producao/quadro-producao-client.tsx`, e `npm run build` passaram.

## 2026-05-05 - DnD migrado para Atlassian Pragmatic

- Fase/modulo: fichas e quadro de produção / troca completa da biblioteca de drag and drop.
- Arquivos alterados: `package.json`, `package-lock.json`, `AGENTS.md`, `src/features/fichas/ficha-form.tsx`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o pacote DnD anterior foi removido do projeto e o baseline passou a ser Atlassian Pragmatic Drag and Drop com os pacotes Pragmatic usados naquela rodada.
- Fichas: a ordenação de produtos e imagens deixou de depender de wrappers globais e passou a usar registros diretos de drag/drop, com cálculo de destino por item. A grade de imagens manteve auto-scroll no próprio container.
- Quadro de produção: cards e listas foram migrados para targets independentes do Pragmatic. A lista de cada coluna voltou a ter `overflow-y: auto`, removendo a limitação de nested scroll que motivou a troca.
- Decisão: manter uma única solução de DnD no projeto. As referências operacionais no plano e no `AGENTS.md` agora apontam para Pragmatic; menções históricas antigas foram descritas sem o nome do pacote removido para facilitar varreduras por resíduo real.
- Validação: `npm run typecheck`, eslint dirigido em `src/features/fichas/ficha-form.tsx` e `src/features/quadro-producao/quadro-producao-client.tsx`, `npm run build` e `npm run supabase:check` passaram. No Edge DevTools em `http://localhost:3000/quadro-producao`, a página renderizou 82 cartões, as listas voltaram com `overflow-y: auto`, as colunas longas mantiveram scroll interno e a varredura de DOM retornou zero atributos internos da biblioteca DnD anterior.

## 2026-05-05 - Quadro de Produção sem nested scroll no DnD

- Fase/modulo: quadro de produção / correção de drag and drop.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnóstico: ao mover cards entre colunas, a biblioteca DnD anterior avisava em desenvolvimento que havia nested scroll container. A documentação do componente de destino confirmava que a biblioteca só suportava dois casos: o próprio destino como scroll container sem scroll parent, ou o destino com apenas um scroll parent. O guia de detecção também confirmava que a checagem usava os valores computados de `overflow-x` e `overflow-y` como `auto`/`scroll`.
- Implementação: `quadro-producao-column__list` deixou de usar `max-height` e `overflow-y: auto`. Assim, o destino de drop não virava mais um segundo scroll container dentro do layout; a rolagem passava a ficar no viewport/container externo compatível com a limitação da biblioteca.
- Validação: `npm run typecheck`, eslint dirigido nos arquivos do quadro/navegação e `npm run build` passaram. No Edge DevTools em `http://localhost:3000/quadro-producao`, cada `.quadro-producao-column__list` ficou com `overflow-x/y: visible` e apenas 1 scroll parent detectado, sem o aviso de nested scroll do DnD no console após recarregar.
- Caveat histórico: naquela rodada, a coluna longa passou a depender do scroll da página em vez de scroll interno por coluna. A migração posterior para Pragmatic reverteu esse caveat e restaurou scroll interno por coluna.

## 2026-05-05 - Quadro de Produção com cards e controles alinhados

- Fase/modulo: quadro de produção / correção visual pontual.
- Arquivos alterados: `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/lib/navigation.ts`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a toolbar do quadro passou a usar altura, raio e comportamento mais próximos dos filtros/botões do restante do App Router. O recorte semanal agora reaproveita a base visual de `ui-button`, os selects deixam de parecer controles isolados em formato pill e a ação de novo cartão não renderiza mais texto duplicado.
- Colunas/cartões: as colunas ficaram esticadas de forma consistente dentro dos painéis redimensionáveis, com cards centralizados verticalmente no próprio corpo, altura mínima real, padding menos espremido e metadados com espaçamento suficiente para parar o efeito de cards encavalados nas listas densas.
- Linguagem: o quadro, a navegação e os labels base voltaram para pt-BR com acentuação correta em `Quadro de Produção`, `Novo cartão`, `pendência`, `Costura/Em Revisão`, `Catálogos`, `Usuários`, `Relatórios` e descrições do menu.
- Validação: `npm run typecheck`, `npx eslint src\\features\\quadro-producao\\quadro-producao-client.tsx src\\features\\quadro-producao\\config.ts src\\lib\\navigation.ts`, `npm run build` e scan dirigido de mojibake/textos sem acento passaram. No Edge DevTools em `http://localhost:3000/quadro-producao`, a medição confirmou `overlaps: false`, lista de coluna em `display: flex`, controles com 44px de altura/10px de raio e nenhum mojibake no texto renderizado.

## 2026-05-05 - Quadro de Producao reestruturado para legado/kan

- Fase/modulo: quadro de producao / refatoracao visual estrutural.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnostico: mesmo depois das passadas anteriores, o board ainda tinha cara de pagina de app com hero + cards, em vez de quadro operacional. O topo competia com o proprio board, as colunas estavam arredondadas e profundas demais, e os cartoes ainda carregavam peso visual acima do legado e da referencia do `kan`.
- Topo/barra operacional: o bloco hero deixou de ser a leitura principal do fluxo autenticado. A superficie ativa passou a concentrar titulo, total em aberto, busca, filtros, recorte semanal, atualizar, novo cartao e criacao de coluna dentro de uma unica barra compacta, com acoes administrativas mais subordinadas.
- Colunas/cartoes: as colunas ganharam acento cromatico fino por etapa, header mais baixo com contador enxuto e acoes utilitarias discretas. Os cartoes perderam profundidade e excesso de chips: agora priorizam venda/manual + entrega, nome do cliente, metadados secos e badge de pendencia so quando necessario. O hover/focus continua revelando as acoes sem voltar a poluir a leitura.
- Blindagem visual: `src/styles/globals.css` passou a forcar `display: none` em `quadro-producao-view__header[hidden]` para garantir que o hero legado nao volte a vazar na primeira pintura quando o JSX o mantem apenas como residuo oculto.
- Browser: validado em sessao autenticada no Edge DevTools em `http://localhost:3000/quadro-producao`. A tela final mostrou a barra compacta acima do board, 82 cartoes carregados, header de coluna em ~58px e cartao simples em ~60px. Tambem foi conferido que o header antigo fica marcado como `hidden` no DOM e que a lista de cartoes realmente monta apos o loading inicial.
- Validacao: `npm run typecheck`, `cmd /c npx eslint src\\features\\quadro-producao\\quadro-producao-client.tsx`, `npm run build` e `npm run supabase:check` passaram. `npm run lint` completo continua falhando por residuos preexistentes em `.kilo/*`, minificados e arquivos legados fora desta frente.
- Caveat: o titulo operacional ficou deliberadamente mais compacto e pode quebrar em duas linhas nas larguras menores do desktop. Isso foi aceito nesta rodada porque a prioridade era devolver a leitura de quadro e reduzir o peso visual geral.

## 2026-05-05 - Quadro de Producao visual refinado

- Fase/modulo: quadro de producao / polimento visual e usabilidade do board.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: o quadro passou por uma rodada de compactacao real no navegador autenticado. Os cards ficaram menores, com largura controlada dentro da coluna, menos padding, badges mais contidas, lista interna rolavel e uma hierarquia mais curta entre venda, entrega, titulo, chips e acoes.
- Arraste: os atributos de drag handle foram movidos para o proprio `<article>` do card, deixando o cartao inteiro arrastavel em vez de depender de um botao pequeno no canto. O indicador visual de grip permaneceu no topo apenas como pista de affordance.
- Colunas: a superficie desktop ganhou comportamento mais operacional, com altura util concentrada na lista de cartoes (`max-height` da coluna/lista) e menor desperdicio vertical entre header, container e cards. No mobile, a largura minima do board horizontal tambem foi reduzida para melhorar o encaixe inicial.
- Browser: validado em `http://localhost:3000/quadro-producao` com sessao autenticada. A inspeção confirmou cards na faixa de ~148px de altura nos casos simples, largura real dentro da coluna e o atributo interno de drag da biblioteca anterior presente no proprio card.
- Validacao: `npm run typecheck` passou. `npx eslint src/features/quadro-producao/quadro-producao-client.tsx` ficou limpo; `src/styles/globals.css` continua fora da cobertura do ESLint atual do repo e foi validado por inspeção visual/DOM no navegador.
- Caveat: esta rodada foi focada em densidade e usabilidade imediata. Se quisermos um refinamento adicional depois, o proximo passo natural e simplificar ainda mais a coluna de acoes ou transformar parte das acoes do card em menu contextual para reduzir ruido visual.

## 2026-05-05 - Quadro de Producao simplificado para legado/kan

- Fase/modulo: quadro de producao / simplificacao visual final.
- Arquivos alterados: `src/components/ui/tooltip.tsx`, `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Diagnostico: o board ainda estava carregado demais em relacao ao legado e ao `kan`: chips grandes, subtitulo tecnico em cada coluna, acoes sempre expostas, nomenclatura do status pouco clara no topo e tooltip preso pelo overflow da coluna.
- Ajuste de linguagem: o filtro e a leitura do campo deixaram de apresentar o nome tecnico antigo como se fosse o status principal do quadro. A UI agora usa `Pendencia`, e os labels ficaram mais diretos (`Tudo pronto`, `Com pendencias`, etc.), preservando o dado legado sem confundir com a etapa do card.
- Ajuste de coluna/card: o subtitulo tecnico (`slug`) foi removido do header das colunas. Os cards ficaram menores e mais secos: venda + entrega em uma linha, cliente em destaque, chips minimos e pendencia exibida apenas quando existe. As acoes do card passaram a ficar discretas em repouso e aparecer no hover/focus, reduzindo a poluicao visual da lista.
- Tooltip: `src/components/ui/tooltip.tsx` passou a renderizar o balao via portal em `document.body`, com posicionamento `fixed` calculado por `getBoundingClientRect()`. Isso evita que o tooltip seja cortado pelo `overflow` da coluna/lista.
- Browser: validado novamente no board autenticado em `http://localhost:3000/quadro-producao`. A tela passou a mostrar cards de aproximadamente 109px nos casos simples, sem o subtitulo tecnico da coluna e com leitura geral bem mais proxima da referencia enxuta desejada.
- Validacao: `npm run typecheck` e `npx eslint src/components/ui/tooltip.tsx src/features/quadro-producao/quadro-producao-client.tsx` passaram.
- Caveat: o quick action de pendencia continua existindo por paridade funcional com o legado, mas a interface agora tenta deixa-lo subordinado ao card, em vez de competir com a etapa principal do quadro.

## 2026-05-05 - Quadro de Producao dinamico

- Fase/modulo: quadro de producao / Kanban operacional no App Router.
- Arquivos alterados: `supabase/migrations/202605050003_quadro_producao_dynamic_columns.sql`, `src/lib/supabase/database.types.ts`, `src/app/layout.tsx`, `src/components/ui/app-client-providers.tsx`, `src/components/ui/app-navigation.tsx`, `src/components/ui/index.ts`, `src/lib/navigation.ts`, `src/app/quadro-producao/page.tsx`, `src/app/api/quadro-producao/route.ts`, `src/app/api/quadro-producao/columns/route.ts`, `src/app/api/quadro-producao/columns/reorder/route.ts`, `src/app/api/quadro-producao/columns/[id]/route.ts`, `src/app/api/quadro-producao/columns/[id]/sort-by-date/route.ts`, `src/app/api/quadro-producao/cards/manual/route.ts`, `src/app/api/quadro-producao/cards/[id]/move/route.ts`, `src/app/api/quadro-producao/cards/[id]/insumo-status/route.ts`, `src/app/api/quadro-producao/cards/[id]/entregar/route.ts`, `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/search-params.ts`, `src/features/quadro-producao/schema.ts`, `src/features/quadro-producao/data.ts`, `src/features/quadro-producao/api.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/fichas/actions.ts`, `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/clientes/data.ts`, `src/features/clientes/cliente-detail.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Resultado: a nova rota autenticada `/quadro-producao` foi implementada como modulo proprio, mantendo o esquema visual da app atual e sem recriar uma UI paralela. O board agora le de `kanban_columns`, suporta criacao e renomeio de colunas, reordenacao persistida de colunas, drag/drop de cartoes, ordenacao por data dentro da coluna, acao rapida de status, marcar como entregue e criacao de cartao manual no mesmo dominio de `fichas`.
- Banco/migracao: a migration criou `public.kanban_columns`, semeou as 5 colunas base do fluxo legado, adicionou `kanban_column_id`, `kanban_ordem`, `is_manual_card` e `kanban_status_updated_at` em `fichas`, fez backfill a partir do `kanban_status` antigo e adicionou funcoes SQL para reordenar colunas, ordenar cartoes por data e mover cartoes entre colunas.
- Dados e contratos: `src/lib/supabase/database.types.ts` passou a tipar a nova tabela, os novos campos de `fichas` e as funcoes RPC. O modulo `src/features/quadro-producao/*` centraliza schemas Zod, parse de search params via `nuqs/server`, snapshot server-side, mutacoes e chamadas client-side.
- Plugins/bibliotecas aplicados: `nuqs` entrou no estado de URL dos filtros, `@tanstack/react-query` passou a sustentar refetch e mutacoes otimistas do board, a biblioteca DnD anterior foi reutilizada no drag/drop dos cartoes e `react-resizable-panels` passou a estruturar as colunas redimensionaveis no desktop. `AppClientProviders` foi adicionado no layout para expor `NuqsAdapter` e `QueryClientProvider` sem criar wrappers paralelos por pagina.
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
- Resultado: adicionada a biblioteca DnD anterior como base compartilhavel para drag/drop. O formulario Next passou a permitir reordenar produtos e imagens por wrappers da biblioteca, adicionar imagens por selecao, drop ou Ctrl+V, ordenar produtos automaticamente por tamanho, editar observacoes com toolbar simples e gerar auto-preenchimento aproximado da regra legada com texto em caixa alta, separadores `/` e blocos de tecido, manga, gola, bolso, filete, faixa, personalizacao e nomes/numeros.
- Confirmacao de paridade ja existente: criacao e edicao carregam os mesmos catalogos/datalists via `listCatalogOptionsForFichaForm()`, preservando produtos, tamanhos, tecidos, cores, mangas, acabamentos, golas e bolsos ativos.
- Validacao: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Abertura local de `/fichas/nova` redirecionou para `/login`, confirmando a protecao da rota; validacao visual autenticada ainda depende de PIN/sessao. A instalacao da biblioteca DnD anterior reportou 4 vulnerabilidades no grafo da epoca; nao foi rodado `npm audit fix` automatico para evitar upgrades fora de escopo.
- Decisao: registrar o polimento como checklist proprio no plano principal para separar itens ja implementados das pendencias criticas restantes.
- Caveat: ainda falta validar visualmente a regra de auto-preenchimento com sessao autenticada e reconstruir a impressao/PDF individual fiel ao legado antes de considerar a paridade critica fechada.

### Ajuste de fluidez do drag/drop

- Ajuste: produtos e imagens passaram a usar o snapshot do destino de drop para destacar a area durante o arraste, e os cards arrastados receberam elevacao visual.
- Ajuste: a grade de imagens passou a dimensionar cada card como 1/4 da largura disponivel em desktop, com minimo responsivo para nao esmagar em telas pequenas.
- Ajuste: botoes de reordenar/remover imagem foram movidos para uma barra propria no card; a badge `Pendente` deixou de ficar sobreposta ao handle de drag/drop.
- Ajuste: novas imagens adicionadas por selecao, drop ou Ctrl+V entram com a descricao vazia; o nome do arquivo fica apenas como fallback interno no upload.
- Ajuste: o card inteiro da imagem passou a ser o handle de drag/drop, economizando espaco; o input de descricao e o botao remover param a propagacao para nao iniciar arraste durante edicao/remocao.
- Ajuste: a grade de imagens agora segue a regra de largura por quantidade: 1 imagem com 1/3 da largura total, 2 imagens com 1/2 cada, 3 imagens com 1/3 cada e 4 imagens com 1/4 cada, mantendo minimos responsivos.
- Ajuste: o input de descricao recebeu estilo do sistema, foco visivel e placeholder especifico (`Ex: frente, costas, detalhe do bordado`), deixando de parecer input generico.
- Ajuste: corrigido estouro visual durante o arraste com largura maxima aplicada ao item em drag; 1 imagem passou para 1/2 da largura total.
- Ajuste: topo do card agora mostra `Imagem N`, a badge `Pendente` fica no topo e o botao remover recebeu hover/focus vermelho.
- Ajuste: clone de arraste das imagens voltou a manter o mesmo formato do card em repouso; removido override manual de largura/preview durante drag e fixada a largura do card pela variavel `--image-card-width`, deixando a biblioteca DnD anterior preservar as dimensoes medidas.
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
- Bibliotecas: o novo texto separa o que ja era baseline (`sonner`, `react-hook-form`, `zod`, biblioteca DnD anterior, `react-day-picker`, Radix Dialog/AlertDialog) do que estava apenas instalado e ainda em adocao gradual (`nuqs`, `date-fns`, `@tanstack/react-table`, `@tanstack/react-query`, `recharts`, `zustand`, `react-resizable-panels`, `@tiptap/react`).
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

### Quadro de producao: chips, prazo e thumbnails

- Ajuste visual: `src/features/quadro-producao/quadro-producao-client.tsx` removeu o chip de tecido dos cards e manteve a leitura compacta em personalizacao, evento e status da ficha.
- Prazo: a entrega ganhou um indicador circular com a mesma regra do legado: cards em `na_costura` nao alertam, `<= 1` dia fica vermelho e `<= 7` dias fica amarelo.
- Status: `src/styles/globals.css` aplicou as cores legadas por status da ficha: `Tudo OK` sucesso, `Sem tecido` alerta, `Sem tinta` erro, `Sem papel` informativo e `Pendencias` em alerta discreto.
- Tooltips: os botoes do card voltaram a usar `Tooltip`, incluindo abrir detalhes/preview e mover para a proxima coluna.
- Imagens: o hover da primeira imagem agora transforma URLs Cloudinary em thumbnail; a imagem do preview tambem recebeu `height: auto` para evitar o warning do Next/Image sobre aspect ratio.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint` e scan de mojibake nos arquivos tocados passaram.

### Quadro de producao: modal como card aberto

- Modal: `src/features/quadro-producao/quadro-producao-client.tsx` refez o detalhe do card para mostrar a primeira imagem da ficha, identificacao, coluna atual, entrega, evento, arte, tecido, venda, responsavel e acoes operacionais.
- Remocoes: sairam do modal os botoes `Abrir previa` e `Abrir ficha completa`, alem do bloco de `Observacoes`, que deixava o modal pesado e expunha texto bruto demais para leitura de quadro.
- Acoes: o modal agora permite trocar o status da ficha e mover o card para a proxima etapa, com label curto e `aria-label` mantendo o nome da coluna de destino.
- Colunas/chips: `src/styles/globals.css` colocou fundo neutro nas colunas sem voltar ao degrade; `Tudo OK` passou a ser neutro; o select-chip do card saiu do wrapper de `Tooltip` e ganhou `stopPropagation` nos eventos de ponteiro/clique para nao disputar com o drag do card.
- Linguagem e imagens: a UI do quadro passou a exibir esse campo como status da ficha/pedido, e as imagens do tooltip e do modal foram padronizadas em 16:9 com thumbnails Cloudinary `320x180` e `640x360`.
- Validacao: `npm run typecheck`, eslint dirigido em `src/features/quadro-producao/quadro-producao-client.tsx`, scan de mojibake nos arquivos tocados e inspeção no Edge em `/quadro-producao`.

### Quadro de producao: labels dos filtros

- Ajuste: os filtros principais do quadro agora exibem labels visiveis acima dos campos de busca, tecido, personalizacao e status da ficha.
- Acessibilidade: os `aria-labels` existentes foram mantidos, entao a mudanca melhora a leitura visual sem reduzir suporte a leitores de tela.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` e eslint dirigido no cliente do quadro.

### Quadro de producao: evento, tooltip e modal compactos

- Card: o chip `Evento` saiu da linha de metadados e passou para a esquerda do nome do cliente, com destaque azul/primary.
- Tooltip de imagem: a preview agora abre abaixo e a direita do ponteiro, acompanha o movimento do mouse e preserva o recorte 16:9 via thumbnail Cloudinary.
- Modal: removido o metadado `Ficha real`; a imagem principal usa dimensoes 16:9 explicitas, os espacamentos foram compactados e o select de status da ficha e o botao de mover foram alinhados para parecerem do mesmo conjunto.
- Acoes: o botao de mover no modal voltou a usar o componente `Tooltip`, mantendo descricao da acao sem `title` nativo.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no cliente do quadro e checagem visual no Edge.

### Quadro de producao: evento como icone no card

- Ajuste: o marcador de evento deixou de usar a palavra `Evento` no card e passou a renderizar uma estrela azul/primary antes do nome do cliente.
- Layout: o titulo do card agora fica sempre em uma linha; nomes longos usam ellipsis para nao aumentar nem estourar o card.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no cliente do quadro e checagem visual no Edge.

### Quadro de producao: respiro vertical dos cards

- Ajuste: os cards receberam +2px de padding vertical e +1px de gap interno, criando mais respiro entre titulo, chips/status e data.
- Escopo: a mudanca ficou restrita ao CSS do quadro para preservar largura, truncamento do nome e densidade geral das colunas.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: checagem visual no Edge em `/quadro-producao`.

### Quadro de producao: tooltips restaurados nas acoes

- Ajuste: a barra principal do quadro passou a envolver `Para essa semana`, `Limpar filtros`, `Atualizar`, `Novo cartao` e `Coluna` com o componente compartilhado `Tooltip`.
- Card: o botao textual do nome do cliente tambem recebeu `Tooltip` com a descricao `Abrir detalhes do cartao`, preservando a largura completa e o truncamento em uma linha.
- Cobertura: os tooltips ja existentes em botoes de coluna, preview da imagem, mover card e mover no modal foram mantidos.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no cliente do quadro e checagem visual no Edge.

### UI compartilhada: Tooltip visivel em portal

- Diagnostico: o `Tooltip` compartilhado renderiza o conteudo em portal, mas o CSS de visibilidade ainda dependia de seletores aninhados no wrapper. Como o conteudo sai da arvore do wrapper, ele era criado com `opacity: 0`.
- Ajuste: `src/components/ui/tooltip.tsx` agora marca o conteudo portaled como aberto e tambem usa listeners nativos de mouse/focus como fallback dos pointer events; `src/styles/globals.css` aplica a visibilidade diretamente no conteudo do portal.
- Resultado: as descricoes das acoes do quadro voltaram a aparecer no hover/focus sem usar `title` nativo.
- Arquivos alterados: `src/components/ui/tooltip.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no componente e no cliente do quadro, e checagem no Edge.

### Quadro de producao: tooltip removido do olho

- Ajuste: o botao com icone de olho deixou de usar tooltip textual, mantendo apenas `aria-label` e a preview 16:9 da primeira imagem no hover.
- Decisao: nesse controle, a preview visual ja descreve a funcao melhor que uma legenda textual e evita sobreposicao de dois popovers.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` e eslint dirigido no cliente do quadro.

### Dark mode: card do quadro e navegacao ativa

- Quadro: no tema escuro, `.quadro-producao-card` ganhou fundo um pouco mais escuro que a coluna, com borda/acento preservados, para destacar o card sem aumentar ruido visual.
- Shell: no tema escuro, `.app-nav__link[aria-current="page"]` passou a usar `surface-2`, o mesmo fundo do hover, mantendo a cor primaria no icone para indicar a rota atual.
- Escopo: os overrides usam `html[data-theme="dark"]`, sem afetar o tema claro.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` e checagem no Edge em `/quadro-producao`.

### Dark mode: borda dos cards suavizada

- Ajuste: a borda dos cards do quadro no tema escuro passou de mistura com 18% do acento da coluna para 8%; no hover, a mistura caiu para 16% e a sombra tambem foi reduzida.
- Resultado: os cards continuam destacados do fundo da coluna, mas o contorno deixa de chamar mais atencao que o conteudo.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` e checagem visual no Edge.

### Quadro de producao: filtro de tecido removido

- Ajuste: o select de tecido foi removido da barra principal do quadro por ser redundante com a busca.
- Compatibilidade: a query/API continuam aceitando `tecido` internamente para nao quebrar links antigos, e `Limpar filtros` ainda remove esse parametro quando ele existir.
- Card: a entrega exibida no card passou de data com mes por extenso para `DD/MM/AA`.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no cliente do quadro e scan de mojibake no cliente do quadro.

### Quadro de producao: acoes da toolbar em linha

- Ajuste: a grid base da toolbar passou de tres colunas de filtro para duas, acompanhando a remocao do filtro de tecido e deixando a area de acoes cair na coluna `auto` correta.
- Resultado: os botoes `Para essa semana`, `Limpar filtros`, `Atualizar`, `Novo cartao` e `Coluna` permanecem na mesma linha no desktop e no breakpoint mobile, usando scroll horizontal quando o espaco for menor que o conjunto.
- Escopo: a mudanca ficou restrita ao CSS do quadro; `.quadro-producao-header-actions` continua podendo empilhar no mobile.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, scan de mojibake no CSS e checagem do CSS renderizado no Edge.

### Quadro de producao: abas por personalizacao

- Ajuste: o select `Status da ficha` foi removido da pesquisa principal do quadro, mantendo esse status apenas no card e no modal.
- Personalizacao: o antigo select virou uma faixa de abas horizontais baseada em `currentResult.snapshot.filterOptions.artes`, com `Todos` como aba inicial e uma aba por tipo de personalizacao.
- Comportamento: cada aba atualiza o mesmo filtro `arte` ja usado pela URL/API, entao o board passa a mostrar apenas os cards daquele tipo sem criar uma superficie paralela.
- Layout: a toolbar ficou concentrada em titulo, busca e acoes, evitando esconder `Para essa semana`.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido, scan de mojibake nos arquivos tocados e checagem no Edge.

### Fichas: DnD do editor sem shadow travado

- Diagnostico: o placeholder fisico desloca o alvo durante o drag e dispara `dragLeave` intermediario; limpar o shadow nesse momento fazia produtos e imagens piscarem e impedia um drop estavel.
- Ajuste: `dragLeave` voltou a limpar apenas `isOver`; o shadow ativo agora e removido no drop do alvo ou no `onDrop` do proprio draggable, cobrindo cancelamento/drop fora de alvo sem apagar o espaco de destino durante a movimentacao.
- Visual: os placeholders de produto e imagem receberam `box-sizing`, `pointer-events: none`, opacidade controlada e animacao curta de entrada para a abertura do espaco parecer mais fluida.
- Arquivos alterados: `src/features/fichas/ficha-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido no form de ficha, scan de mojibake nos arquivos tocados e checagem visual no Edge.

### Inicio: dashboard operacional polido

- Ajuste: `src/app/page.tsx` deixou de ser uma grade simples de modulos e passou a carregar uma visao executiva com KPIs reais de fichas, pendentes, entregues, clientes e atrasadas.
- Fluxos: a home agora oferece acoes primarias para nova ficha e atrasos, atalhos para `/fichas`, `/quadro-producao` e `/relatorios`, lista de fichas recentes e bloco de prontidao com catalogos/colunas configurados.
- Navegacao: `src/lib/navigation.ts` foi alinhado para exibir a home como `Visao geral operacional`, mantendo `/` como entrada do app sem reativar `/dashboard`.
- Estilo: `src/styles/globals.css` recebeu o layout responsivo da home com cards de KPI, paineis de rotina e estados de hover/focus usando tokens.
- Decisao: manter a home com tom de dashboard de verdade, mas sem duplicar as responsabilidades de `/fichas`, `/relatorios` ou do quadro.
- Caveat: ainda falta a checagem visual em navegador apos os checks locais.

### Fichas: thumbnails otimizados, zoom e duplicacao por rascunho

- Ajuste de imagem: a listagem de `/fichas` passou a renderizar `FichaRowThumbnail`, um leaf client que transforma URLs Cloudinary para miniaturas `160x90` com `f_auto/q_auto:eco`, mostra spinner enquanto a imagem carrega e usa cursor pointer.
- Zoom: ao passar o mouse/foco sobre o thumbnail, a listagem abre um preview fixo em portal no mesmo padrao do quadro de producao, mas maior, usando transformacao Cloudinary `520x360` com qualidade melhor para leitura.
- Duplicacao: a previa de impressao ganhou botao `Duplicar`; ele abre `/fichas/nova?duplicar=<id>` e a pagina de criacao carrega os dados da ficha original como `initialData`, excluindo imagens. Nada e gravado ate o usuario clicar em `Salvar ficha`, criando uma nova ficha com novo id.
- Arquivos alterados: `src/lib/cloudinary-images.ts`, `src/features/fichas/ficha-row-thumbnail.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`, `src/features/fichas/ficha-preview.tsx`, `src/features/fichas/ficha-form.tsx`, `src/app/fichas/page.tsx`, `src/app/fichas/nova/page.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` e eslint dirigido nos arquivos tocados passaram. Caveat: checagem visual refinada ficou para depois, conforme combinado.

### Quadro de producao: select e duplo clique protegidos do DnD

- Ajuste: os controles interativos dentro do card do quadro passaram a bloquear eventos de ponteiro/mouse/toque tambem na fase de captura e com `nativeEvent.stopImmediatePropagation()`, evitando que o select de status acorde o handler de arraste da Fluid.
- Duplo clique: o botao de titulo do card agora tambem bloqueia inicio de drag, e a lista renderizada por coluna deduplica cards por id antes do render. Se a Fluid gerar um frame intermediario com id repetido, o React nao recebe duas keys iguais.
- Arquivo alterado: `src/features/quadro-producao/quadro-producao-client.tsx`.
- Validacao: `npm run typecheck` e eslint dirigido no cliente do quadro passaram.

### Clientes, catalogos e usuarios: edicao centralizada em modal

- Clientes: `/clientes` passou a abrir cadastro e edicao por query string (`modal=novo` / `edit=<id>`) em `Modal`, preservando busca/pagina ao fechar ou salvar. A busca saiu do submit manual e virou um leaf client com debounce usando `nuqs`; a paginacao compartilhada foi centralizada.
- Catalogos: a listagem deixou de renderizar o formulario fixo e passou a criar/editar em modal. O select editavel de tipo foi removido do formulario; a categoria agora vem da tela aberta ou do proprio item e segue como campo hidden, evitando salvar tecido como produto por engano. A antiga nuvem de botoes foi substituida por menu de categorias com contadores.
- Usuarios: cadastro e edicao de operadores tambem migraram para modal sobre a listagem, mantendo resumo e tabela como contexto principal.
- Server actions: clientes, catalogos e usuarios aceitam `returnTo` local para voltar a listagem apos salvar sem cair em rota paralela de detalhe.
- Arquivos alterados: `src/app/clientes/page.tsx`, `src/features/clientes/actions.ts`, `src/features/clientes/cliente-form.tsx`, `src/features/clientes/clientes-overview.tsx`, `src/features/clientes/clientes-search-toolbar.tsx`, `src/app/catalogos/page.tsx`, `src/features/catalogos/actions.ts`, `src/features/catalogos/catalogo-form.tsx`, `src/features/catalogos/catalogos-overview.tsx`, `src/app/usuarios/page.tsx`, `src/features/usuarios/actions.ts`, `src/features/usuarios/usuario-form.tsx`, `src/features/usuarios/usuarios-overview.tsx`, `src/styles/globals.css`.
- Validacao: `npm run typecheck` passou antes e depois do lint; eslint dirigido nos arquivos TS/TSX tocados passou.
- Caveat: mostrar PIN/senha ja salvo nao entrou nesta etapa. O fluxo atual guarda `pin_hash`/`pin_salt`, entao nao existe senha recuperavel para exibir; armazenar PIN reversivel/plaintext continua exigindo aprovacao explicita por ser mudanca de seguranca.

### Modais administrativos: alinhamento de checkbox, labels e legendas

- Ajuste visual: `modal-form` ganhou padding interno e footer de acoes com separador consistente, deixando os modais de clientes, catalogos e usuarios menos crus.
- Catalogos: o checkbox `Ativo` saiu do bloco flex separado que ficava antes de `Descricao` e entrou na `catalog-form__grid`, alinhado ao fim da linha de campos ao lado de `Ordem`. A descricao agora ocupa a linha inteira da grid, sem label atravessando o checkbox.
- Usuarios: `Operador ativo` tambem entrou na grid do formulario, evitando um checkbox solto em linha propria dentro do modal.
- Prevenção de novas quebras: labels de `.field` e legends de `.form-section` receberam line-height/limites explicitos para reduzir sobreposicoes quando textos longos, acentuados ou quebrados aparecem em modais e formularios maiores.
- Arquivos alterados: `src/features/catalogos/catalogo-form.tsx`, `src/features/usuarios/usuario-form.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, eslint dirigido em `catalogo-form.tsx`/`usuario-form.tsx`, e varredura sem residuos de `catalog-form__bottom`/`catalog-form__full`.

### UX: regra de microcopy silenciosa e limpeza de textos

- Regra duravel: `AGENTS.md` agora explicita que a interface deve evitar textos descritivos, onboarding, explicacoes tecnicas, microcopy redundante, blocos de ambiente e cards explicativos automaticos. A preferencia documentada e por titulos curtos, labels objetivas, contexto implicito e UI densa/limpa.
- Limpeza de superficies: foram removidos summaries e frases tutorais de `/`, `/fichas`, `/fichas/nova`, edicao/impressao de ficha, `/clientes`, detalhe/edicao/criacao de cliente, `/catalogos`, `/usuarios`, `/relatorios`, `/quadro-producao`, login, erro global e 404.
- Mensagens tecnicas: empty states, toasts e server actions deixaram de citar Supabase, banco, API, variaveis de ambiente ou modelo novo quando isso nao ajuda a executar uma acao. Exemplos passaram para `Tente novamente.`, `Ajuste os filtros.`, `Fichas indisponiveis.` e equivalentes por modulo.
- Primitivos: `src/lib/navigation.ts` perdeu descricoes secundarias da navegacao; `AppNavigation` renderiza apenas labels; `ModuleOverview` deixou de aceitar/mostrar descricoes para evitar novo uso com cards explicativos redundantes.
- Arquivos alterados: `AGENTS.md`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/fichas/nova/page.tsx`, `src/app/fichas/[id]/page.tsx`, `src/app/fichas/[id]/imprimir/page.tsx`, `src/app/clientes/page.tsx`, `src/app/clientes/novo/page.tsx`, `src/app/clientes/[id]/editar/page.tsx`, `src/app/relatorios/excel/route.ts`, `src/components/ui/app-navigation.tsx`, `src/components/ui/module-overview.tsx`, `src/lib/navigation.ts`, `src/features/*` e `src/styles/globals.css`.
- Varredura: `rg -n "Supabase ainda|consulta ao Supabase|Configure as vari|variáveis de ambiente|Ambiente atual|app-summary|sem gravar nada no banco|novo modelo|fluxo legado|JSON legado|legado importado|A rota solicitada|preparad|API|banco" src/app src/features src/components/ui` ficou sem resultados apos a limpeza.
- Validacao: `npm run typecheck`, eslint dirigido nos arquivos TS/TSX tocados e `git diff --check` passaram. A varredura de mojibake nos arquivos principais retornou apenas falsos positivos de exemplos documentados no `AGENTS.md` e palavras pt-BR acentuadas validas.

### UX: toasts semanticos e feedbacks faltantes

- Ajuste visual: `src/app/layout.tsx` passou a configurar o Sonner com duracao maior, close button e icones Lucide por tipo; `src/styles/globals.css` agora aplica a casca branca do app com faixa/acento semantico para `info`, `success`, `warning`, `error` e `loading`.
- Feedback pos-redirect: criado `src/components/ui/route-toast.tsx`, que le um parametro curto da URL, mostra o toast uma unica vez e limpa o parametro com `router.replace(..., { scroll: false })`.
- Fluxos cobertos: clientes, catalogos e usuarios agora mostram sucesso ao salvar/editar quando voltam para a listagem/modal de origem; fichas mostram retorno ao concluir, reabrir ou remover; impressao mostra preparacao, conclusao ou falha com mensagens e cores distintas.
- Arquivos alterados: `src/app/layout.tsx`, `src/styles/globals.css`, `src/components/ui/route-toast.tsx`, `src/app/clientes/page.tsx`, `src/app/clientes/[id]/page.tsx`, `src/features/clientes/actions.ts`, `src/features/catalogos/actions.ts`, `src/features/catalogos/catalogos-overview.tsx`, `src/features/usuarios/actions.ts`, `src/features/usuarios/usuarios-overview.tsx`, `src/features/fichas/actions.ts`, `src/features/fichas/ficha-save-toast.tsx`, `src/features/fichas/print-trigger-button.tsx`, `src/features/fichas/ficha-print-preview-modal.tsx`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` e scan de mojibake nos arquivos tocados passaram. No Edge DevTools, `/clientes?toast=cliente-updated` e `/fichas?toast=ficha-reverted` renderizaram toasts success/warning com icone, faixa semantica, close button interno e URL limpa apos consumo; console sem erros capturados.

### Clientes e catalogos: exclusao controlada

- Ajuste: `/clientes` ganhou acao de exclusao na listagem e no detalhe, usando `AlertDialog`, Server Action, estado pending e toast por URL. A exclusao remove o cadastro do cliente; fichas existentes preservam o nome salvo no snapshot.
- Catalogos: cada item ganhou menu de acoes com editar/excluir, tambem com `AlertDialog`, Server Action, feedback de erro por Sonner e toast de sucesso apos redirect.
- Dados: removido do Supabase o item de catalogo `Teste` em `produto`; corrigido `Dry NBA Soft` de `produto` para `tecido`, mantendo aliases `Falcon NBA` e `Dry NBA Furadinho`, composicao `100% Poliester`, ativo e `sort_order=35`.
- Arquivos alterados: `src/features/clientes/actions.ts`, `src/features/clientes/form-state.ts`, `src/features/clientes/cliente-delete-action.tsx`, `src/features/clientes/clientes-overview.tsx`, `src/features/clientes/cliente-detail.tsx`, `src/app/clientes/page.tsx`, `src/features/catalogos/actions.ts`, `src/features/catalogos/form-state.ts`, `src/features/catalogos/catalog-item-actions.tsx`, `src/features/catalogos/catalogos-overview.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck` passou; queries Supabase confirmaram que `teste` e `dry-nba-soft` nao aparecem mais em `produto`, e `Dry NBA Soft` aparece em `tecido`.

### Quadro de producao: etapas por personalizacao

- Ajuste: os slugs tecnicos do quadro continuam iguais, mas os nomes visiveis agora sao calculados por personalizacao. Bordado, Patch e DTF mostram `Preparando Arte`, `Exportado PDF` e `PDF Enviado`, ocultando as etapas intermediarias; Serigrafia mostra `Cores Separadas`, `Fotolito Impresso`, `Na Estamparia` e `Estampado`; Sublimacao mostra `Exportado`, `Imprimindo`, `Impresso` e `Sublimado`; Todos/Outros ficam com rotulos combinados.
- Listagem: a coluna `Etapas` em `/fichas` passou a usar o mesmo helper do quadro com base na `arte` da propria ficha, entao cada linha exibe a etapa operacional correta mesmo fora do filtro do quadro.
- Dados: criada migration para alinhar os nomes base das colunas de sistema aos rotulos combinados de Todos/Outros sem alterar os slugs usados por movimentacao e compatibilidade.
- Arquivos alterados: `src/features/quadro-producao/config.ts`, `src/features/quadro-producao/data.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/lib/formatters.ts`, `supabase/migrations/20260508120000_quadro_producao_personalizacao_labels.sql`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram. Edge em `localhost:3000` confirmou `/quadro-producao?arte=dtf` com 3 colunas visiveis (`Preparando Arte`, `Exportado PDF`, `PDF Enviado`), `/quadro-producao?arte=serigrafia` com rótulos de cores/fotolito/estamparia, `/quadro-producao?arte=sublimacao` com exportacao/impressao/sublimado e `/fichas?busca=Larissa` exibindo a etapa calculada por ficha; console sem erros.

### Fichas: destaque da etapa na listagem

- Ajuste visual: a célula `Etapas` de `/fichas` agora mantém o tipo de personalização como contexto e mostra a etapa operacional em `Badge` informativo compacto, com `aria-label` específico para a etapa.
- Decisao: aumentar a leitura do metadado de etapa dentro da tabela existente, sem adicionar coluna, card ou texto explicativo.
- Arquivos alterados: `src/features/fichas/fichas-overview.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint` e `git diff --check` passaram. Edge em `localhost:3000/fichas?busca=Larissa` confirmou o badge de etapa renderizado para Sublimacao e Serigrafia; console sem erros.

### Fichas: espaçamento dos filtros de data

- Ajuste visual: os controles dentro de `.field` agora usam `min-width: 0`, permitindo que os inputs de data encolham dentro das colunas do grid sem invadir o espaço vizinho.
- Decisao: manter o espaçamento entre `Entrega inicial` e `Entrega final` pelo `gap` padrão da `.fichas-toolbar`, sem margem local ou classe específica para datas.
- Arquivos alterados: `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint` e `git diff --check` passaram. Edge em `localhost:3000/fichas?busca=Larissa` mediu `gap` visual de 12px entre os inputs, igual ao `gap` da toolbar; console sem erros.

### Fichas: datalist sem slugs tecnicos

- Ajuste visual/dados: `CustomDatalist` passou a separar aliases pesquisaveis de detalhes renderizados. Os aliases tecnicos continuam entrando no filtro de busca, mas a segunda linha da opção usa apenas `details` curados.
- Catalogos: `listCatalogOptionsForFichaForm()` agora filtra aliases com `_`, `-` ou token tecnico simples para exibicao, preserva todos em `aliases` para busca/importacao e adiciona composicao como detalhe humano quando existir.
- Formulario: os materiais fallback tambem passam a exibir composicao como detalhe, mantendo o mesmo padrao quando Supabase nao estiver configurado.
- Arquivos alterados: `src/components/ui/custom-datalist.tsx`, `src/features/catalogos/data.ts`, `src/features/fichas/ficha-form.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram. Edge em `localhost:3000/fichas/nova` confirmou que buscar `malha` mostra nomes com composicao, e buscar `malha_fria_pv` encontra `Malha Fria (PV)` sem exibir o slug; console sem erros.

### Shell: usuario sem perfil visivel

- Ajuste visual: o bloco `.app-user` da sidebar agora mostra apenas `displayName`; a linha `Superadmin`/`Operador` saiu da UI.
- Decisao: a regra de autorizacao continua baseada em `session.user.role`, mas o papel deixa de aparecer no shell para manter a interface mais silenciosa.
- Arquivos alterados: `src/components/ui/app-shell.tsx`, `src/styles/globals.css`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint` e `git diff --check` passaram. Edge em `localhost:3000/fichas?busca=Larissa` confirmou `.app-user` renderizando somente `Fernanda`; console sem erros.

### Quadro de producao: duplicacao e flash de cards

- Ajuste: o estado ativo de drag/drop dos cards foi elevado para o quadro inteiro. Todas as colunas passam a alternar juntas entre a lista local do `fluid-dnd` e os dados vindos do React Query, impedindo que a coluna de origem continue renderizando uma lista local antiga depois do drop.
- Cache: a mutacao de movimento agora cancela e atualiza otimisticamente todas as queries `quadro-producao`, nao apenas a query exata do filtro atual. Em erro, o rollback restaura todos os snapshots afetados.
- Hotfix: os botoes de mover para a proxima coluna passaram a chamar o mesmo fluxo de movimento usado no drag/drop, limpando o estado local do DnD tambem em interacoes por clique.
- Hotfix: os cards deixaram de renderizar como `motion.article`; o `fluid-dnd` agora e o unico responsavel por escrever `transform` no card durante o arraste, evitando que o item escape do ponteiro.
- Feedback: adicionados toasts de sucesso para `Atualizar`, `Ordenar cartões por entrega` e `Marcar pedido como entregue`, usando `sonner` direto no client do quadro.
- Hotfix de entrega: cards marcados como entregues entram em uma lista local de ocultos no mesmo clique; as colunas e o contador passam a ser derivados dessa lista filtrada, e o rollback remove o card da lista oculta se a mutacao falhar.
- Decisao: manter a persistencia na RPC `move_kanban_card`; o bug revisado estava na borda client-side entre listas locais do DnD, cache filtrado e revalidacao.
- Arquivos alterados: `src/features/quadro-producao/quadro-producao-client.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build` e `npm run supabase:check` passaram no primeiro ajuste; `npm run typecheck`, `npm run lint` e `npm run build` passaram apos os hotfixes; `npm run typecheck`, `npm run lint` e `npm run build` passaram apos os toasts; `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram apos o hotfix de entrega. Caveat: a validacao visual do arraste real ficou pendente porque o Edge local redirecionou para `/login?next=/quadro-producao`.

## 2026-05-08 - Otimizacao de Fast Origin Transfer na Vercel

- Fase/modulo: infraestrutura Vercel/CDN, proxy, exports e API do quadro.
- Analise: pela documentacao da Vercel, Fast Origin Transfer e cobrado em compute por bytes de request/response entre CDN e origem; Functions podem ser otimizadas reduzindo payload ou usando cache, e Middleware deve rodar apenas quando necessario porque pode duplicar a transferencia em uma chamada de Function.
- Ajuste: `src/proxy.ts` agora exclui `/api/*`, `/fichas/pdf`, `/relatorios/excel`, assets Next e arquivos com extensao do matcher. Isso evita passar pelo proxy antes de route handlers que ja sao Functions.
- Seguranca preservada: as rotas que deixaram de depender do proxy para auth ganharam checagem direta de sessao: Cloudinary config/signature/delete, PDF operacional e Excel de relatorios.
- Payload: `src/features/quadro-producao/data.ts` deixou de selecionar e serializar campos que a UI do quadro nao consome (`created_at`, `updated_at`, `kanban_status_updated_at`, `observacoes`), reduzindo bytes de resposta em um endpoint chamado por React Query.
- Decisao: nao aplicar cache publico em respostas autenticadas com dados operacionais; isso reduziria FOT, mas criaria risco de vazar dados entre sessoes. A otimizacao ficou em evitar middleware desnecessario e cortar payload.
- Arquivos alterados: `src/proxy.ts`, `src/app/api/cloudinary/config/route.ts`, `src/app/api/cloudinary/signature/route.ts`, `src/app/api/cloudinary/image/[...publicId]/route.ts`, `src/app/fichas/pdf/route.ts`, `src/app/relatorios/excel/route.ts`, `src/features/quadro-producao/data.ts`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram.

## 2026-05-08 - Home e timezone operacional de Cuiaba

- Fase/modulo: inicio/dashboard, datas operacionais, fichas e relatorios.
- Ajuste visual: a home agora mostra um cumprimento curto (`Bom dia`, `Boa tarde` ou `Boa noite`) abaixo do titulo, em italico com Playfair Display via `next/font`.
- Datas: criado `src/lib/dates.ts` como helper compartilhado para `America/Cuiaba`, cobrindo data atual de negocio, cumprimento por hora local, data longa do dashboard, range da semana atual/proxima e operacoes com inputs `YYYY-MM-DD`.
- Aplicacao: `/` deixou de manter helpers locais duplicados; atrasadas em `/fichas`, atalhos de semana, modo semanal do PDF operacional e periodos de `/relatorios` passaram a usar a mesma base de timezone.
- Decisao: o projeto ja tem `date-fns`, mas nao `date-fns-tz` como dependencia direta; por isso o timezone de negocio ficou no helper com `Intl.DateTimeFormat`, sem instalar pacote novo neste ciclo.
- Caveat: timestamps de auditoria (`created_at`, `updated_at`, `delivered_at`, sessoes) continuam em UTC/ISO, como esperado para persistencia; a mudanca mira calculo e exibicao operacional por Cuiaba.
- Arquivos alterados: `src/lib/dates.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `src/features/fichas/data.ts`, `src/features/fichas/fichas-overview.tsx`, `src/features/relatorios/data.ts`, `src/app/fichas/pdf/route.ts`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram; smoke HTTP em `localhost:3000` redirecionou para `/login`, entao a conferencia visual autenticada da home ficou pendente de sessao logada.

## 2026-05-08 - Padronizacao global de datas operacionais

- Fase/modulo: regra duravel de arquitetura, datas operacionais em App Router.
- Regra: `AGENTS.md` agora exige `src/lib/dates.ts` para qualquer data operacional nova ou alterada, com timezone de negocio `America/Cuiaba`; `toISOString()` fica reservado para auditoria, sessao e persistencia tecnica em UTC.
- Helper: `src/lib/dates.ts` ganhou formatadores de data de negocio, data/hora em Cuiaba, data compacta, data curta, dia/mes, parse/format para inputs `YYYY-MM-DD`, diferenca de dias e validacao de range por input ISO.
- Aplicacao: foram migrados formatadores e calculos locais em clientes, fichas, relatorios, usuarios, quadro de producao, impressao/PDF e nome de arquivo do Excel.
- Decisao: manter datas persistidas como `YYYY-MM-DD` para campos de negocio e timestamps ISO para eventos/auditoria; o helper separa essas duas naturezas para evitar drift de timezone.
- Arquivos alterados: `AGENTS.md`, `src/lib/dates.ts`, `src/app/relatorios/excel/route.ts`, `src/features/clientes/cliente-detail.tsx`, `src/features/clientes/clientes-overview.tsx`, `src/features/fichas/data.ts`, `src/features/fichas/ficha-form.tsx`, `src/features/fichas/ficha-preview.tsx`, `src/features/fichas/fichas-overview.tsx`, `src/features/fichas/operational-pdf.ts`, `src/features/fichas/print-ficha.tsx`, `src/features/quadro-producao/data.ts`, `src/features/quadro-producao/quadro-producao-client.tsx`, `src/features/relatorios/data.ts`, `src/features/relatorios/relatorios-legado-overview.tsx`, `src/features/relatorios/relatorios-overview.tsx`, `src/features/usuarios/usuarios-overview.tsx`, `plano-migracao-next-supabase.md`, `registro-migracao-next.md`.
- Validacao: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run supabase:check` e `git diff --check` passaram.
