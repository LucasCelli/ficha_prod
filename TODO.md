# TODO

Backlog vivo de correções, refinos e decisões futuras. Itens concluídos estão detalhados em `registro-alteracoes.md`.

## Frente de design system — status

### Concluído

- [x] **Item 1 — Modais por query string.** O diagnóstico do backlog estava errado: sempre funcionaram em produção. A causa real era `next dev` sem `allowedDevOrigins`, que fazia a aplicação carregar sem hidratar.
- [x] **Item 2 — Tokens inexistentes.**
- [x] **Item 3 — Tabela cortada em `/meu-painel`.** Resolvido via `DataTable responsiveMode`.
- [x] **Item 4 — Overflow horizontal do quadro.** 1455px → 1440px.
- [x] **Item 5 — Texto ilegível e controles pequenos no quadro.**
- [x] **Item 6 — Contraste do azul.** `--color-primary-text` (6.16:1).
- [x] **Item 7 — Reordenação por teclado.** `SortableHandle` com setas, Home e End.
- [x] **Item 8 — Split de CSS por domínio.** `globals.css` virou lista de imports; estilos em `src/styles/domains/`.
- [x] **Item 9 — Touch targets.** Extensor de 44px em `pointer: coarse`.
- [x] **Item 10 — Densidade da lista mobile de fichas.**
- [x] **Item 11 — Cobertura de testes.** 27 testes (10 falhando) → 173, incluindo projeto tablet e projeto superadmin.
- [x] **Item 12 — Breakpoints consolidados.** 13 cortes → 4, com teste em runtime que barra qualquer corte novo.
- [x] **Item 13 — Hierarquia e labels.**
- [x] **Item 14 — Alternativa textual para gráficos.**
- [x] **Item 15 — Fluxo de Tab do combobox.**
- [x] **Item 16 — Fluxo canônico de cliente.** Criar e editar são no modal; rotas completas viraram redirecionamento.
- [x] **Item 17 — Cores de gráfico fora dos tokens.**
- [x] **Item 18 — Tooltips nativos.**
- [x] **Item 19 — Metadados genéricos.**
- [x] **Página `/design-system`.** Coluna única com specimens agrupados e link na sidebar para superadmin.
- [x] **`IconButton` / `IconLink`.** Contrato único para ação icon-only, com `appearance="bare"` para vestir controles herdados.
- [x] **Cobertura de `/catalogos` e `/usuarios`.** Projeto `superadmin-chromium` com sessão própria.
- [x] **Migração completa para `IconButton`/`IconLink`.** Não há mais lista manual de classes em `controls.css`; alvos de toque icon-only abaixo de 44px zerados em todas as rotas medidas.

### Pendente

- [ ] **Reconciliar as duas gerações de estilo do quadro.** `domains/quadro-producao.css` contém a implementação antiga e o rebuild, e as duas se somam na cascata. Duas tentativas mecânicas falharam; o diagnóstico completo (perda de propriedades e colisão shorthand/longhand) está no cabeçalho do próprio arquivo. Exige expansão de shorthands ou revisão manual, com verificação por `getComputedStyle` exigindo diferença zero.
- [ ] **Container queries para painéis reutilizáveis.** Os breakpoints hoje são cortes de viewport; painéis que aparecem em larguras diferentes (cards do quadro, painéis de `/meu-painel`) se beneficiariam de `container-type`.
- [ ] **Adotar `PageHeader` e `FilterBar` nas telas existentes.** Os primitivos existem e estão documentados, mas as páginas ainda montam cabeçalhos e barras de filtro localmente.
- [ ] **Confirmar estabilidade da suíte ao longo do tempo.** A instabilidade do teste de fechamento de modal foi diagnosticada e corrigida (o `toPass` clicava um botão já removido, e o timeout do locator aparecia como falha de URL). Três execuções completas seguidas deram 173/173, mas vale reavaliar depois de mais algumas rodadas em máquinas diferentes.
