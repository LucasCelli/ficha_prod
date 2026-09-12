# Registro de alterações

## 2026-09-11 — Plano de Corte: equilíbrio operacional dos enfestos

- Evidência: comparação manual do PDF `resultado.pdf`. A opção inicialmente classificada em primeiro distribuiu os tamanhos em 2/7/8 entradas por enfesto e consumiu aproximadamente 15,6 m; a segunda distribuiu em 4/6/5 e consumiu aproximadamente 14,1 m, oferecendo grades mais úteis para o encaixe posterior no Audaces.
- Causa: após igualar a quantidade de enfestos, o ranking priorizava a soma de folhas antes do comprimento e do equilíbrio. Isso promovia 6/3/2 folhas em vez de 5/3/2 porque 11 folhas venciam 10, apesar da concentração de tamanhos e do maior comprimento.
- Resultado: o ranking do solver e das alternativas mede a diferença pareada entre as quantidades de tamanhos de cada enfesto. O custo de marcador recebe penalidade de 5% por unidade de desequilíbrio; enfestos com até dois tamanhos, comprimento bruto, cobertura mínima, proporção entre alturas e total de folhas permanecem como desempates.
- Calibração: a penalidade combina aproveitamento e comprimento. Ela promove o segundo resultado do PDF, conserva o plano operacional Intercement de 15/10 folhas e evita trocar 8,16 m por 10,93 m apenas para igualar a quantidade de tamanhos.
- Arquivos: `solver.ts`, `alternatives.ts`, `quality-tests/plano-de-corte-audit.test.ts`, `TODO.md` e este registro.
- Validação: adicionado um teste que reconstrói os dois resultados do PDF e exige que a distribuição 4/6/5 seja promovida; contraexemplo da DP e pedido Intercement permanecem cobertos. Os 109 testes de qualidade, typecheck, lint e build passaram.

## 2026-09-11 — Plano de Corte: tabelas dimensionais de fallback

- Fonte recebida: `Tabelas_de_Medidas_Fallback_Solver.docx` e orientação de composição dos moldes. O documento foi tratado como referência dimensional, não como instrução para substituir perfis reais nem como geometria CAD.
- Arquivos: `fallback-dimensions.ts`, `dimensions.ts`, `model.ts`, `solution-validation.ts`, `calculator.ts`, `alternatives.ts`, `plano-de-corte-workspace.tsx`, `cut-plan-items-editor.tsx`, `ficha-item-classification.ts`, `normalization.ts`, testes e `TODO.md`.
- Resultado: tamanhos sem perfil cadastrado passam a usar tabelas versionadas de camiseta tradicional, Baby Look, calça e short/bermuda. Frente, costas, duas mangas ou quatro painéis inferiores são estimados separadamente por área; largura do tecido, tecido plano/tubular e eficiência de encaixe continuam participando do cálculo.
- Prioridade e confiança: o perfil cadastrado continua absoluto. Na ausência dele, o validador registra `FALLBACK_HIGH`, `FALLBACK_MEDIUM`, `FALLBACK_LOW` ou `UNKNOWN`; a interface informa quando o comprimento usa medidas aproximadas. Perfis com melhor evidência recebem margem conservadora e extrapolações recebem margem percentual limitada.
- Calças e shorts: as antigas dimensões únicas de 120 × 44 cm e 60 × 44 cm ficaram apenas como último recurso para tamanhos fora das tabelas. Grades conhecidas usam comprimento e contorno próprios; cós, bolsos e vista entram como acréscimo de área residual, sem somar seus comprimentos linearmente.
- Escopo corrigido: saia e macacão foram retirados do seletor e da classificação automática, pois não fazem parte deste plano. Camisa simples/social ainda exige uma categoria explícita no item antes de consumir suas tabelas específicas; aplicar esses valores a qualquer camiseta seria ambíguo e ficou documentado no TODO.
- Validação: 108 testes de qualidade, typecheck, lint e build passaram. Playwright passou em desktop e mobile para hidratação, opções válidas do seletor e cálculo pelo worker real. A cobertura verifica prioridade do perfil cadastrado, diferença entre tamanho/manga/Baby Look, progressão de calça e short, propagação da origem da estimativa e ausência de saia/macacão na classificação e na interface.

## 2026-09-11 — Plano de Corte: identidade inicial na hidratação

- Arquivos: `src/features/plano-de-corte/plano-de-corte-workspace.tsx`, `quality-tests/visual/cut-plan-search.spec.js` e `TODO.md`.
- Causa: `crypto.randomUUID()` no inicializador do tecido gerava identidades diferentes no servidor e no navegador, divergindo os atributos `id` e `htmlFor`.
- Resultado e decisão: a identidade do primeiro tecido usa `useId`, capturado no estado inicial; tecidos criados por ações continuam recebendo UUIDs. A correção preserva SSR e as associações entre labels, campos e demandas.
- Validação: build (incluindo TypeScript) e lint passaram. Hidratação e cálculo no worker passaram em desktop e mobile; o teste de regressão captura erros de console e verifica o ID do HTML original contra o campo hidratado e o valor do tecido no estado do cliente após adicionar uma linha. A última asserção também detecta divergências quando React mantém um atributo SSR sem corrigi-lo.
- Caveat: a validação anterior capturava apenas `pageerror`, que não cobre esse aviso de console. A cobertura foi ampliada neste fechamento.

## 2026-09-09 — Clientes e fichas

- Arquivos: `src/components/ui/combobox.tsx`, `src/features/clientes/*`, `src/features/fichas/*`, tipos Supabase, estilos, testes e migration `20260910012830_client_identity_and_explicit_creation.sql`.
- Resultado: criação de cliente separada da seleção; ficha passa a persistir `cliente_id`; homônimos são diferenciados por Empresa/Instituição e o novo cliente é selecionado após o cadastro.
- Decisões: unicidade atômica por nome + empresa normalizados, empresa vazia equivalente a `null`, preservação dos IDs e snapshots antigos e manutenção dos selects/datalists que representam listas pequenas ou texto livre.
- Resultado adicional: o modal de cadastro rápido recebeu padding interno por token e a primeira linha da ficha passou a distribuir cliente, alias e vendedor na proporção 2:1:1, sem alterar a grade das datas.
- Decisão de UX: superfícies flutuantes devem ter padding pelo primitivo compartilhado ou por wrapper explícito; layouts intencionalmente edge-to-edge precisam declarar essa exceção.
- Migration remota: corrigida a inspeção da função PostgreSQL para usar marcadores estruturais, aplicada em produção e registrada no histórico remoto como `20260910012830`.
- Validação: base remota auditada em modo leitura com 405 clientes, nenhum nome vazio, nenhum grupo duplicado pela normalização atual e 757 fichas já vinculadas por `cliente_id`; após a aplicação, coluna `empresa`, índice de identidade, RPC de cliente e resolução de `cliente_id` na ficha foram confirmados no banco.
- Validação final: typecheck, lint, build, configuração Supabase, encoding, 87 testes de qualidade e Playwright em desktop/tablet/mobile passaram; o teste visual mede a proporção 2:1:1 e o padding do modal nos quatro lados.

# 2026-09-11 — Plano de Corte: aproveitamento de tamanhos infantis

- Módulo: Plano de Corte.
- Arquivos alterados: `src/features/plano-de-corte/solver.ts`, `src/features/plano-de-corte/calculator.ts` e `quality-tests/plano-de-corte-solver.test.ts`.
- Resultado: removido o teto artificial de tamanhos por mapa, permitindo distribuir pequenas grades tubulares entre enfestos já necessários em vez de criar um enfesto curto e exclusivo.
- Decisão: a viabilidade do mapa passa a ser limitada pelo comprimento estimado da mesa e pela frequência máxima configurada, mantendo frequência tubular par e conservação exata da produção; pequenas quantidades podem ser repartidas entre mapas existentes para eliminar enfestos isolados, sem fabricar alternativas piores por meio de limites artificiais.
- Caveat: a eficiência de 82% continua sendo uma estimativa por área das partes; o encaixe geométrico final permanece responsabilidade do Audaces.

## 2026-09-11 — Plano de Corte: correções da auditoria e busca de até 30 segundos

- Módulo: Plano de Corte.
- Arquivos: `calculator.ts`, `solver.ts`, `alternatives.ts`, `dimensions.ts`, `model.ts`, `validation.ts`, `normalization.ts`, `search-budget.ts`, `solution-validation.ts`, `merge-solver.ts`, `cut-plan.worker.ts`, `use-cut-plan-search.ts`, `plano-de-corte-workspace.tsx`, testes de qualidade/Playwright e `TODO.md`.
- Resultado: substituído o prazo local de 1,5 segundo por orçamento compartilhado de até 30 segundos. O worker publica planos completos e validados; a interface permite encerrar com o melhor recebido e encerra o worker ao editar, restaurar outro histórico ou desmontar. Um watchdog da interface impõe o teto também se o worker estiver numa etapa longa.
- Correções: normalização canônica antes de agregar/arredondar demandas tubulares; perfil ausente deixa comprimento desconhecido; coeficientes distintos não colidem por `toFixed(6)`; comprimento não é arredondado antes da mesclagem; frequência padrão tubular unificada em 14; validação independente de produção, dimensões conhecidas, alocações e limites; rejeição de inteiros inseguros.
- Busca: removidos teto de quatro enfestos e corte de 350 mil conjuntos; adicionados bounds de volume/capacidade por peça e congruências nos sufixos de frequência. A DP usa estado suficiente para os critérios atuais e dominância por entradas, em vez de reter seis candidatos por chave incompleta. O fallback de agrupamento usa seleção por comprimento crescente para maximizar cardinalidade com altura fixa, eliminando a enumeração exponencial de subconjuntos.
- Mesclagem: removido beam de 64 combinações; busca de combinações sob o prazo global, priorizando alturas compartilháveis. O agrupamento de alocações usa incumbente guloso seguido de busca exata limitada por prazo/memória e lower bounds. O pool local retém até 128 configurações completas de folhas.
- Evidências: o contraexemplo da DP preserva o estado completo correto sem o antigo bucket de seis; segmentos 60/50/30/20/20/20 cabem em dois enfestos; 50,1 + 49,1 cm são combinados em mesa de 100 cm; cores com demandas 12/4 compartilham quatro folhas; aliases Baby P/BL P não geram sobra duplicada.
- Decisões: mantida a política de quantidade tubular par e a prioridade atual de menos enfestos/mais folhas. `searchComplete` não sobrevive a interrupções; resultados distinguem melhor encontrado e ótimo do modelo estimado. Somente a opção principal de um único tecido, sem mesclagem, com busca completa e medidas completas pode declarar ótimo; vários tecidos, mesclagem e medidas ausentes não recebem essa garantia global.
- Caveats e continuidade: limite de proteção de 150 mil estados pode encerrar antes de 30 segundos; opções locais limitadas ainda não garantem ótimo global entre cores; comprimento continua sendo estimativa por área a 82%, sem nesting geométrico. Pareto, mudança da função objetivo e benchmark industrial amplo permanecem no TODO, conforme solicitação de encerrar esta etapa sem ampliar o escopo.
- Validação final: 105 testes de qualidade passaram; typecheck, lint, build e configuração Supabase passaram. Playwright concluiu oito execuções (incluindo autenticação) em desktop e mobile, verificando worker real, conferência, cancelamento com preservação do resultado, invalidação ao editar e watchdog de 30 segundos. O watchdog foi exercitado com relógio controlado no navegador; os demais fluxos usaram execução real do worker.
- Revisão de fechamento: plano inicial preservado quando um resultado interrompido tem métricas piores; todos os tecidos recebem um plano inicial antes da otimização; publicações acumulam melhorias já encontradas nos tecidos anteriores; duplicação por uma heurística não apaga certificados. Frequência efetiva e lower bound de volume usam tolerância consistente com a mesa. Planos completos são preservados/publicados durante a última etapa da DP, sem esperar que toda a configuração termine. Cancelamento/watchdog registram o tempo efetivamente decorrido.
