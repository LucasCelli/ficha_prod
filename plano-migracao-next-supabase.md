# Plano de migracao para Next.js + Supabase

Objetivo: reconstruir o sistema em Next.js usando Supabase/Postgres como base principal, sem fazer o Next carregar as paginas HTML/JS legadas atuais. O legado sera mantido apenas como referencia funcional durante a migracao e removido somente depois que a nova versao estiver validada.

## Principios da migracao

- Migrar com seguranca, em etapas pequenas e verificaveis.
- Criar telas e fluxos nativos em Next.js, sem embutir ou reaproveitar diretamente as paginas legadas.
- Organizar a nova aplicacao por modulos em `src/features/*`, com rotas em `src/app/*` e UI compartilhada em `src/components/ui/*`.
- Usar o sistema atual como referencia de comportamento, regras de negocio e comparacao visual.
- Modelar dados no Supabase antes de implementar telas dependentes.
- Validar paridade funcional antes de remover qualquer arquivo legado.
- Evitar mudancas grandes sem ponto de rollback claro.
- Registrar decisoes, riscos e pendencias neste documento.

## Fase 0. Preparacao e congelamento relativo do legado

**Objetivo:** entender o estado atual e definir uma base segura para comecar.

### Tarefas

- [ ] Revisar `git status --short` e separar mudancas pendentes.
- [ ] Fazer inventario das paginas atuais:
  - [ ] Dashboard.
  - [ ] Clientes.
  - [ ] Pedidos.
  - [ ] Relatorios.
  - [ ] Configuracoes e utilitarios.
- [ ] Fazer inventario dos arquivos JS principais e suas responsabilidades.
- [ ] Fazer inventario dos estilos e tokens existentes.
- [ ] Identificar fluxos criticos que precisam existir na nova versao.
- [ ] Definir quais bugs do legado devem ser corrigidos antes da migracao e quais serao resolvidos apenas na nova versao.
- [x] Centralizar arquivos Markdown na raiz do projeto.
- [x] Atualizar `agents.md` com regras de Vercel, Next.js, Supabase e UI.

### Criterios de aceite

- [ ] Fluxos criticos listados.
- [ ] Modulos legados mapeados.
- [ ] Pendencias conhecidas registradas.
- [ ] Nenhum arquivo legado removido nesta fase.

## Fase 1. Modelo de dados no Supabase

**Objetivo:** desenhar a estrutura de dados nova antes de construir as telas.

### Tarefas

- [ ] Mapear entidades atuais:
  - [ ] Usuarios.
  - [ ] Clientes.
  - [ ] Pedidos.
  - [ ] Itens de pedido.
  - [ ] Personalizacoes.
  - [ ] Produtos ou modelos.
  - [ ] Status de producao/entrega.
  - [ ] Imagens/anexos, se aplicavel.
- [ ] Definir tabelas Postgres e relacionamentos.
- [ ] Definir enums ou tabelas auxiliares para status e tipos de personalizacao.
- [ ] Definir campos de auditoria:
  - [ ] `created_at`.
  - [ ] `updated_at`.
  - [ ] `delivered_at`.
  - [ ] usuario responsavel, se aplicavel.
- [ ] Definir indices para consultas frequentes:
  - [ ] Pedidos por data.
  - [ ] Pedidos por status.
  - [ ] Pedidos por cliente.
  - [ ] Pedidos por tipo de personalizacao.
- [ ] Definir politicas de Row Level Security.
- [ ] Definir estrategia de importacao dos dados existentes.

### Criterios de aceite

- [ ] Schema inicial documentado.
- [ ] Relacionamentos revisados.
- [ ] Estrategia de migracao de dados definida.
- [ ] RLS planejado antes de expor dados em producao.

## Fase 2. Bootstrap do projeto Next.js

**Objetivo:** criar a base nova do app, independente das paginas legadas.

### Tarefas

- [ ] Escolher estrutura do projeto:
  - [ ] Novo app dentro do repo atual.
  - [ ] Ou nova raiz Next substituindo gradualmente a estrutura antiga.
- [ ] Criar projeto Next.js com TypeScript.
- [ ] Configurar lint, formatacao e scripts de build.
- [ ] Configurar variaveis de ambiente para Supabase.
- [ ] Criar cliente Supabase server-side e client-side conforme necessidade.
- [ ] Definir estrutura inicial:
  - [ ] `src/app/`.
  - [ ] `src/components/ui/`.
  - [ ] `src/lib/`.
  - [ ] `src/lib/supabase/`.
  - [ ] `src/features/`.
  - [ ] `src/styles/`.
- [ ] Definir tokens/design system da nova versao.

### Criterios de aceite

- [ ] App Next roda localmente.
- [ ] Build inicial passa.
- [ ] Conexao com Supabase validada em ambiente de desenvolvimento.
- [ ] Nenhuma pagina legada esta sendo carregada pelo Next.

## Fase 3. Autenticacao e base de navegacao

**Objetivo:** estabelecer acesso seguro e layout principal antes dos modulos.

### Tarefas

- [ ] Definir fluxo de login.
- [ ] Configurar Supabase Auth, se for usado.
- [ ] Criar layout autenticado.
- [ ] Criar navegacao principal.
- [ ] Criar estados globais de carregamento, erro e vazio.
- [ ] Criar utilitario unico de notificacoes na nova versao.
- [ ] Criar pagina inicial operacional, sem landing page.

### Criterios de aceite

- [ ] Login/logout funcionando.
- [ ] Rotas protegidas.
- [ ] Navegacao base funcionando em desktop e mobile.
- [ ] Notificacoes centralizadas.

## Fase 4. Modulo de pedidos

**Objetivo:** implementar o centro operacional novo primeiro, pois ele orienta o modelo e os proximos fluxos.

### Tarefas

- [ ] Criar listagem de pedidos.
- [ ] Criar cadastro/edicao de pedido.
- [ ] Criar filtros por status, data, cliente e tipo de personalizacao.
- [ ] Criar controle de pedidos da semana por data.
- [ ] Criar controle de pedidos da proxima semana por data.
- [ ] Criar lista de pedidos antigos pendentes.
- [ ] Implementar acao de marcar pedido como entregue.
- [ ] Separar visualmente por tipo de personalizacao.
- [ ] Implementar PDF operacional com agrupamentos por data e personalizacao.

### Criterios de aceite

- [ ] Pedidos podem ser criados, editados e consultados.
- [ ] Pedidos da semana aparecem agrupados por data.
- [ ] Pedidos da proxima semana aparecem agrupados por data.
- [ ] Pedidos antigos pendentes podem ser marcados como entregues.
- [ ] PDF confere com a tela.
- [ ] Fluxo validado com dados reais ou massa de teste.

## Fase 5. Modulo de clientes

**Objetivo:** reconstruir clientes com relacao clara com pedidos.

### Tarefas

- [ ] Criar listagem de clientes.
- [ ] Criar cadastro/edicao de cliente.
- [ ] Criar detalhe do cliente com historico de pedidos.
- [ ] Migrar buscas e filtros importantes do legado.
- [ ] Validar duplicidade, campos obrigatorios e formatos.

### Criterios de aceite

- [ ] Cliente pode ser criado, editado e localizado.
- [ ] Historico de pedidos por cliente funciona.
- [ ] Dados importados aparecem corretamente.

## Fase 6. Dashboard novo

**Objetivo:** criar um painel nativo do Next, usando dados do Supabase.

### Tarefas

- [ ] Definir indicadores principais.
- [ ] Criar cards ou secoes operacionais com dados reais.
- [ ] Normalizar thumbs e imagens de forma nativa.
- [ ] Criar atalhos para fluxos frequentes.
- [ ] Validar responsividade.

### Criterios de aceite

- [ ] Dashboard mostra dados consistentes.
- [ ] Thumbs tem dimensoes estaveis.
- [ ] Atalhos levam aos fluxos corretos.

## Fase 7. Relatorios e PDFs

**Objetivo:** reconstruir relatorios com base no novo modelo.

### Tarefas

- [ ] Mapear relatorios existentes.
- [ ] Priorizar relatorios essenciais.
- [ ] Criar filtros e consultas no Supabase.
- [ ] Implementar geracao de PDF.
- [ ] Comparar resultados com o legado.

### Criterios de aceite

- [ ] Relatorios essenciais implementados.
- [ ] PDFs gerados com layout consistente.
- [ ] Dados conferem com consultas equivalentes.

## Fase 8. Migracao de dados

**Objetivo:** levar os dados do sistema atual para o Supabase com rastreabilidade.

### Tarefas

- [ ] Exportar dados atuais.
- [ ] Criar script de transformacao para o novo schema.
- [ ] Criar importacao em ambiente de teste.
- [ ] Validar contagens por entidade.
- [ ] Validar amostras de clientes, pedidos e relatorios.
- [ ] Registrar inconsistencias encontradas.
- [ ] Planejar janela de migracao final.

### Criterios de aceite

- [ ] Dados importados em ambiente de teste.
- [ ] Contagens e amostras validadas.
- [ ] Inconsistencias conhecidas resolvidas ou documentadas.

## Fase 9. Paridade e homologacao

**Objetivo:** confirmar que a nova versao substitui o legado com seguranca.

### Tarefas

- [ ] Criar checklist de paridade por modulo.
- [ ] Testar fluxos principais ponta a ponta.
- [ ] Testar desktop e mobile.
- [ ] Validar permissoes e seguranca.
- [ ] Validar PDFs.
- [ ] Validar performance basica das paginas mais usadas.
- [ ] Coletar ajustes finais.

### Criterios de aceite

- [ ] Todos os fluxos criticos aprovados.
- [ ] Nenhum bloqueador conhecido para troca.
- [ ] Plano de rollback definido.

## Fase 10. Corte para producao

**Objetivo:** colocar a versao Next/Supabase como sistema principal.

### Tarefas

- [ ] Congelar alteracoes no legado.
- [ ] Rodar migracao final de dados.
- [ ] Validar dados importados.
- [ ] Configurar ambiente de producao.
- [ ] Publicar nova versao.
- [ ] Testar fluxos criticos em producao.
- [ ] Monitorar erros iniciais.

### Criterios de aceite

- [ ] Nova versao esta em uso.
- [ ] Fluxos criticos confirmados em producao.
- [ ] Dados principais conferidos apos o corte.

## Fase 11. Remocao do legado

**Objetivo:** remover arquivos antigos somente depois da nova versao estar validada.

### Pre-condicoes obrigatorias

- [ ] Nova versao em producao e validada.
- [ ] Backup dos dados antigos preservado.
- [ ] Paridade funcional aprovada.
- [ ] Nenhum fluxo operacional depende dos arquivos legados.
- [ ] Usuario confirmou que o legado pode ser removido.

### Tarefas

- [ ] Listar arquivos e diretorios legados que serao removidos.
- [ ] Remover HTML, JS e CSS legados que nao sao mais usados.
- [ ] Remover dependencias antigas.
- [ ] Atualizar README e documentacao.
- [ ] Rodar build e checks finais.
- [ ] Revisar `git status --short`.

### Criterios de aceite

- [ ] Legado removido sem quebrar a nova versao.
- [ ] Build final passa.
- [ ] Documentacao reflete a arquitetura nova.

## Riscos e cuidados

- Migrar telas antes do modelo de dados pode gerar retrabalho.
- Apagar legado cedo demais aumenta risco de perder regra de negocio escondida.
- PDFs e relatorios precisam de comparacao com dados reais.
- Regras de status e datas precisam ser definidas com precisao antes do modulo de pedidos.
- RLS mal configurado pode expor dados ou bloquear fluxos validos.

## Registro de decisoes

| Data | Decisao | Motivo |
| --- | --- | --- |
| 2026-04-27 | Next.js sera uma reconstrucao nativa, nao um wrapper do legado | Evitar carregar complexidade antiga para a arquitetura nova. |
| 2026-04-27 | Supabase/Postgres sera o alvo de banco da nova versao | Melhor encaixe para relacoes, relatorios, auth, storage e evolucao operacional. |
| 2026-04-27 | Arquivos legados so serao deletados no fim | Preservar referencia funcional ate a paridade ser validada. |
| 2026-04-28 | O projeto seguira governanca Vercel/Next.js/Supabase no `agents.md` | Comecar a migracao com regras claras antes de scaffold e alteracoes estruturais. |
| 2026-04-28 | Arquivos Markdown devem ficar na raiz do projeto | Evitar documentacao operacional dentro de pastas publicas ou de runtime. |
| 2026-04-28 | A nova arquitetura sera modular em `src/features/*` | Separar regras de negocio por dominio e evitar reproduzir a organizacao HTML/CSS/JS do legado. |

## Registro de progresso

| Data | Fase | Status | Notas |
| --- | --- | --- | --- |
| 2026-04-27 | Planejamento | Feito | Plano inicial criado para orientar a migracao segura para Next.js + Supabase. |
| 2026-04-28 | Fase 0 | Em andamento | Governanca de migracao adicionada ao `agents.md` e Markdown centralizado na raiz. |
