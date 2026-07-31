# TODO

Backlog vivo de correções, refinos e decisões futuras. Itens concluídos estão marcados e detalhados em `registro-alteracoes.md`.

## Premissas

- Produção em Next.js na Vercel, com Functions efêmeras e potencialmente concorrentes.
- Persistência, coordenação e rate limit não dependem de memória local, processo residente ou filesystem da Function.
- Supabase/Postgres é a fonte de verdade para transações, locks, auditoria e agregações.
- O acesso por PIN permanece válido para operadores e superadmin.
- O fluxo operacional possui apenas `pendente`, `atrasada` e `entregue`; `atrasada` é derivada de ficha pendente cuja data de entrega já passou.

## Desempenho do quadro de produção - 2026-07-31

- [x] Remover a oscilação de altura do card após o drop, eliminando `content-visibility` e a altura intrínseca estimada incompatíveis com o ciclo de medição do DnD.
- [x] Tornar a reordenação durante o arraste imediata, sem o frame adicional de `requestAnimationFrame`, e reduzir a transição dos cards de 130 ms para 90 ms.
- [x] Reduzir rerenders durante o gesto com colunas memoizadas, callbacks estáveis e props locais, preservando o estado apenas nas colunas afetadas.
- [x] Cobrir a regressão com teste estrutural e concluir `typecheck`, `lint`, `build`, testes de qualidade, encoding e integridade do diff.

## Auditoria de código de 2026-07-31

### Segurança e fronteiras

- [x] Eliminar XSS armazenado nas observações com sanitização HTML por allowlist no servidor, incluindo dados legados.
- [x] Tornar a autenticação independente do header injetado pelo Proxy, exigindo sessão em cada página protegida.
- [x] Atualizar Next.js e dependências vulneráveis; aplicar overrides compatíveis e documentar qualquer risco residual.
  - Produção ficou com zero vulnerabilidades; resta um advisory baixo de Babel no toolchain, sem release corrigida disponível.
- [x] Derivar a confirmação de exclusão de ficha no servidor e distinguir registros inexistentes de mutações bem-sucedidas.
- [x] Aplicar limites de tamanho e cardinalidade nas entradas e tratar JSON malformado com resposta `400` estável.

### Correção, escala e banco

- [x] Fazer o PDF operacional carregar todo o recorte filtrado, sem truncar na página atual ou em 25 fichas.
- [x] Proteger endpoints de IA com cotas persistentes e limitar a concorrência do processamento em lotes.
- [x] Reduzir o payload e o trabalho em memória do Kanban, movendo filtros e agregações para o Postgres.
- [x] Criar e validar retenção automática: auditoria por 90 dias; sessões e rate limits inativos por 7 dias.
- [x] Aplicar a migration de endurecimento no banco local e no Supabase remoto, com smoke dos contratos.
  - O arquivo local versionado foi executado integralmente no remoto e registrado no histórico; o host não possui Docker para iniciar uma instância Supabase local separada.

### Manutenção e garantia de qualidade

- [x] Remover a ambiguidade entre `observacoes` e `observacoes_html` sem perder o conteúdo legado.
- [x] Extrair responsabilidades ainda concentradas nos maiores componentes sem ampliar fronteiras client-side.
- [x] Substituir a suíte visual legada ignorada pelo Git por testes rastreados das rotas ativas do App Router.
- [x] Cobrir as correções com testes de regressão e concluir `typecheck`, `lint`, `build`, `test:quality`, `supabase:check`, auditoria e encoding.

## Pré-requisito de publicação concluído

- [x] Aplicar, nesta ordem, as migrations abaixo no Supabase antes de publicar o código na Vercel:
  1. `20260731032229_critical_integrity_hardening.sql`
  2. `20260731034518_complete_todo_hardening.sql`
  - [x] As 18 migrations do repositório foram executadas em ordem num PostgreSQL WASM descartável e as RPCs críticas passaram por smoke funcional com dados reais.
  - [x] Dashboard autenticado no projeto `fichas_primalhas`; as duas migrations foram aplicadas, registradas no histórico remoto e validadas por smoke dos contratos.
  - [x] Login por PIN, fichas, Kanban, painel pessoal, relatórios e exportações PDF/Excel foram exercitados localmente contra o Supabase remoto.
  - O deploy na Vercel não foi executado; publicação permanece uma ação separada e explícita.

## Prioridade alta

- [x] Proteger o login por PIN contra força bruta sem remover o PIN do superadmin.
  - Rate limit persistente e progressivo por conta, origem e par conta-origem, com dimensões SHA-256.
  - Trilha histórica de falhas sem PIN, IP ou usuário em texto puro.
  - Falha fechada quando a proteção persistente estiver indisponível e revogação de sessões após alteração de PIN/estado ativo.

- [x] Tornar criação e edição de ficha atômicas no Postgres.
  - Cabeçalho, cliente, itens e imagens passam pela RPC `save_ficha_atomic` em uma transação.

- [x] Corrigir a consistência dos agregados de clientes.
  - Triggers recalculam `total_fichas`, `primeira_ficha` e `ultima_ficha`, com locks por cliente.

- [x] Restringir upload e exclusão de imagens no Cloudinary.
  - Namespace gerenciado pelo servidor, validação de referências e cotas persistentes com `429`/`Retry-After`.

- [x] Escalar relatórios e exportações.
  - Agregações em `get_report_summary`, detalhes paginados em `get_report_details_page` e Excel escrito como stream, sem acumular todas as linhas na memória da Function.

## Prioridade média

- [x] Unificar status operacional.
  - Persistência limitada a `pendente` e `entregue`; atraso é derivado por data em `America/Cuiaba`; resíduos `cancelado` migram para `pendente`.

- [x] Corrigir timezone e escala do `/meu-painel`.
  - Resumo agregado e lista paginada no banco; apenas soma dos itens e primeira miniatura trafegam para a Function.

- [x] Serializar movimentações concorrentes do Kanban.
  - Locks transacionais, criação atômica sem `COUNT` seguido de `INSERT` e recomposição de ordem densa.

- [x] Reduzir escritas de `last_seen_at` por navegação.
  - Sessão deduplicada por request e atualização idempotente no banco apenas após cinco minutos.

- [x] Endurecer as fronteiras que usam `service_role`.
  - Wrappers autenticados para Route Handlers e Server Actions; operações administrativas exigem superadmin; teste detecta rota sem fronteira.

- [x] Padronizar erros server-side.
  - Mensagens estáveis ao cliente, correlação por UUID e logs técnicos sanitizados para o runtime da Vercel.

## Qualidade e manutenção

- [x] Corrigir mojibake visível e adicionar verificação automatizada de encoding.
  - `npm run encoding:check` cobre fontes, scripts e testes.

- [x] Dividir componentes e módulos excessivamente grandes por responsabilidade.
  - Controles do formulário, estado do Kanban e watermark binário foram extraídos sem ampliar fronteiras client-side.

- [x] Ampliar testes automatizados das regras críticas.
  - `npm run test:quality` cobre rate limit, atomicidade, agregados, Cloudinary, locks/ordem do Kanban, timezone, paginação SQL, status e autenticação das rotas.

- [x] Adicionar headers HTTP defensivos compatíveis com Vercel, Next.js, Supabase e Cloudinary.
  - CSP, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e `X-Frame-Options` configurados no `next.config.mjs`.
