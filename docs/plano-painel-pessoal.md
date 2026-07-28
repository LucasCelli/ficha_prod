# Painel pessoal e perfil de usuário

## Objetivo

Disponibilizar uma área pessoal em `/meu-painel` para cada usuário acompanhar as fichas que criou, sem precisar procurar no ambiente geral. O dashboard geral permanece em `/`.

## Decisões de produto

- O perfil é somente informativo.
- O campo comercial `vendedor` continua independente da autoria.
- Novas fichas e cartões manuais registram automaticamente o usuário da sessão.
- Fichas antigas são associadas primeiro por nome/usuário exato e depois por similaridade única de alta confiança.
- Casos ambíguos permanecem sem autor para revisão administrativa.
- O superadministrador pode corrigir autoria individualmente ou em lote.
- A entrega e a reabertura passam a gerar eventos de histórico.

## Implementação

### Banco de dados

- `fichas.created_by_user_id`: relação nullable com `app_users`.
- `ficha_status_events`: histórico de entrega/reabertura e usuário responsável.
- `ficha_ownership_audit`: auditoria de transferências de autoria.
- Índices por autor/data e eventos.
- Migração conservadora das fichas históricas usando `unaccent` e `pg_trgm`.

### Meu painel

- Perfil com nome, usuário, função, iniciais e último acesso.
- Períodos de 7, 30 e 90 dias.
- Indicadores de fichas, peças, pendências, entregas e atrasos.
- Comparação com o período anterior, entregas no prazo e prazo médio.
- Gráfico de evolução, distribuição por status e próximas entregas.
- Lista paginada das próprias fichas, com busca por cliente e filtro de status.
- Atalhos para criar e abrir fichas.
- Consultas sempre limitadas pelo ID obtido da sessão no servidor.

### Administração

- Tela `/usuarios/perfis` para revisar e transferir autoria.
- Fila de fichas sem autor.
- Atribuição individual e atribuição em lote para fichas com o mesmo vendedor.
- Registro de auditoria com autor anterior, novo autor, administrador, motivo e data.

## Critérios de aceitação

- Uma ficha nova aparece apenas no painel pessoal de quem a criou.
- Editar a ficha não altera seu autor.
- Cartões manuais também recebem autoria.
- Entregar ou reabrir registra um evento com o usuário responsável.
- Busca, status, período e paginação não removem o escopo do usuário da sessão.
- Atribuições administrativas atualizam o painel e geram auditoria.
- Fichas históricas ambíguas não são atribuídas automaticamente.
- TypeScript, lint e build devem concluir sem erros.

## Continuidade em outro computador

1. Atualize o repositório e instale as dependências com `npm install`.
2. Aplique as migrações Supabase, incluindo `202607270001_user_profiles_dashboard.sql`.
3. Regenere os tipos do Supabase se o fluxo do projeto passar a usar geração automática.
4. Execute `npm run typecheck`, `npm run lint` e `npm run build`.
5. Entre como superadministrador e revise `/usuarios/perfis`.
6. Valide uma nova ficha, um cartão manual, entrega, reabertura e o painel do autor.

## Observações

- Fichas antigas já entregues não recebem uma data de conclusão inventada.
- A primeira versão calcula produtividade a partir do estado atual e dos novos eventos.
- A tela administrativa mostra até 100 fichas recentes sem autor por carregamento.
