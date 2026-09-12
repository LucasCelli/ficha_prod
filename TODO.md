# TODO

- [x] Aplicar e validar no Supabase remoto a migration `20260910012830_client_identity_and_explicit_creation.sql` após revisão dos dados de produção.

- [x] Plano de corte: orçamento global de até 30 segundos, execução em worker, resultado parcial validado, encerramento com melhor resultado e invalidação ao editar.
- [x] Plano de corte: corrigir aliases antes da paridade, cache dimensional, arredondamento de segmentos, dominância e mesclagem dos contraexemplos da auditoria.
- [x] Plano de corte: corrigir identidade aleatória do tecido inicial na hidratação e verificar correspondência entre HTML do servidor e estado do cliente no navegador.
- [x] Plano de corte: incorporar fallback dimensional versionado para camisetas tradicionais, Baby Look, calças e shorts/bermudas, com precedência das medidas cadastradas, margem por confiança e origem explícita no resultado.
- [x] Plano de corte: incorporar equilíbrio entre quantidades de tamanhos por enfesto ao ranking, calibrado junto ao comprimento para evitar mapas isolados sem inflar desproporcionalmente o marcador.
- [x] Plano de corte: remover saia e macacão do seletor e da classificação de itens importados.
- [ ] Plano de corte: criar categoria explícita de modelagem para diferenciar camiseta, camisa simples e camisa social antes de ativar os fallbacks específicos de camisas; hoje o item só distingue manga, Baby Look, calça e short/bermuda.
- [ ] Plano de corte: evoluir a otimização conjunta por grupo compatível. A busca atual combina até 128 opções locais; a mesclagem não declara ótimo global.
- [ ] Plano de corte: ampliar benchmark com pedidos anonimizados, oráculo multiobjetivo e medições de memória/qualidade por orçamento; validar eficiência de encaixe com marcadores reais do Audaces.
- [ ] Plano de corte: continuar calibrando com resultados reais do Audaces a penalidade de equilíbrio, a retirada de `sizeSpreadScore` e a prioridade de folhas versus fragmentação/reutilização de marcadores; introduzir alternativas de Pareto após consolidar a política.
- [ ] Plano de corte: substituir o encerramento por limite de estados por continuação com menor consumo de memória. Hoje 150 mil estados interrompem a busca com status explícito, preservando planos completos encontrados.
