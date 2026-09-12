# TODO

- [x] Aplicar e validar no Supabase remoto a migration `20260910012830_client_identity_and_explicit_creation.sql` após revisão dos dados de produção.

- [x] Plano de corte: orçamento global de até 30 segundos, execução em worker, resultado parcial validado, encerramento com melhor resultado e invalidação ao editar.
- [x] Plano de corte: corrigir aliases antes da paridade, cache dimensional, arredondamento de segmentos, dominância e mesclagem dos contraexemplos da auditoria.
- [x] Plano de corte: corrigir identidade aleatória do tecido inicial na hidratação e verificar correspondência entre HTML do servidor e estado do cliente no navegador.
- [x] Plano de corte: incorporar fallback dimensional versionado para camisetas tradicionais, Baby Look, calças e shorts/bermudas, com precedência das medidas cadastradas, margem por confiança e origem explícita no resultado.
- [x] Plano de corte: incorporar equilíbrio entre quantidades de tamanhos por enfesto ao ranking, calibrado junto ao comprimento para evitar mapas isolados sem inflar desproporcionalmente o marcador.
- [x] Plano de corte: remover saia e macacão do seletor e da classificação de itens importados.
- [x] 2026-09-12 — Plano de corte — `model.ts`, `normalization.ts`, `ficha-item-classification.ts`, editor, API, solver e apresentação: modelagem explícita distingue camiseta e camisa social na identidade, importação, edição e conferência. Camisa social permanece sem fallback dimensional até ter tabela própria.
- [x] 2026-09-12 — Plano de corte — `alternatives.ts`, `merge-solver.ts`, `plano-de-corte-audit.test.ts`: busca conjunta explora divisões locais até o limite útil e poda combinações por limite inferior seguro. Caveat: mesclagens continuam declaradas como viáveis até existir prova global completa.
- [x] 2026-09-12 — Plano de corte — `calculator.ts`, `plano-de-corte-workspace.tsx`, `cut-plan-print-simple.tsx`: tabelas usam a ordem canônica dos tamanhos; tamanhos infantis exibem hífen e o texto operacional copiado usa vírgulas sem parênteses.
- [x] 2026-09-12 — Plano de corte — `scripts/benchmark-cut-plan.mjs`, `scripts/audit-cut-plan-real-orders.mjs`, `package.json`: benchmark reproduzível com pedidos anonimizados, oráculo enumerativo multiobjetivo e medições de tempo, memória e qualidade por orçamento; auditoria de pedidos reais atualizada para preservar a modelagem explícita. Caveat: o heap é uma aproximação do processo Node, sujeito ao coletor de lixo.
- [ ] Plano de corte: validar a eficiência estimada de encaixe com arquivos e resultados reais do Audaces; depende de um corpus exportado do Audaces com comprimento observado por marcador.
- [ ] Plano de corte: continuar calibrando com resultados reais do Audaces a penalidade de equilíbrio, a retirada de `sizeSpreadScore` e a prioridade de folhas versus fragmentação/reutilização de marcadores; introduzir alternativas de Pareto após consolidar a política.
- [x] 2026-09-12 — Plano de corte — `src/features/plano-de-corte/solver.ts`, `src/features/plano-de-corte/merge-solver.ts`: o limite de 150 mil estados deixou de encerrar a busca; a DP compacta deterministicamente os 100 mil estados parciais mais promissores e continua com prova marcada como incompleta, enquanto o cache de mesclagem pode ser reiniciado sem perder correção. Caveat: uma DP compactada preserva a melhor solução encontrada, mas não declara otimalidade.
