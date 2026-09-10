# Registro de alterações

## 2026-09-09 — Clientes e fichas

- Arquivos: `src/components/ui/combobox.tsx`, `src/features/clientes/*`, `src/features/fichas/*`, tipos Supabase, estilos, testes e migration `20260910012830_client_identity_and_explicit_creation.sql`.
- Resultado: criação de cliente separada da seleção; ficha passa a persistir `cliente_id`; homônimos são diferenciados por Empresa/Instituição e o novo cliente é selecionado após o cadastro.
- Decisões: unicidade atômica por nome + empresa normalizados, empresa vazia equivalente a `null`, preservação dos IDs e snapshots antigos e manutenção dos selects/datalists que representam listas pequenas ou texto livre.
- Resultado adicional: o modal de cadastro rápido recebeu padding interno por token e a primeira linha da ficha passou a distribuir cliente, alias e vendedor na proporção 2:1:1, sem alterar a grade das datas.
- Decisão de UX: superfícies flutuantes devem ter padding pelo primitivo compartilhado ou por wrapper explícito; layouts intencionalmente edge-to-edge precisam declarar essa exceção.
- Migration remota: corrigida a inspeção da função PostgreSQL para usar marcadores estruturais, aplicada em produção e registrada no histórico remoto como `20260910012830`.
- Validação: base remota auditada em modo leitura com 405 clientes, nenhum nome vazio, nenhum grupo duplicado pela normalização atual e 757 fichas já vinculadas por `cliente_id`; após a aplicação, coluna `empresa`, índice de identidade, RPC de cliente e resolução de `cliente_id` na ficha foram confirmados no banco.
- Validação final: typecheck, lint, build, configuração Supabase, encoding, 87 testes de qualidade e Playwright em desktop/tablet/mobile passaram; o teste visual mede a proporção 2:1:1 e o padding do modal nos quatro lados.
