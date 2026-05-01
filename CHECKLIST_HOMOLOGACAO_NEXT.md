# Checklist de homologacao Next/Supabase

Objetivo: validar que a versao Next/Supabase pode substituir o legado nos fluxos essenciais antes do corte de producao.

## Ambiente

- [x] Confirmar variaveis de producao na Vercel: Supabase URL, service role, Cloudinary e secrets de sessao.
- [x] Rodar auditoria local de prontidao de producao com `npm run prod:check`.
- [x] Linkar o workspace ao projeto Vercel ou validar o projeto direto pela Dashboard.
- [x] Rodar build de producao na Vercel sem warnings bloqueantes.
- [ ] Confirmar que o dominio final aponta para a aplicacao Next correta.
- [ ] Confirmar backup/export dos dados legados antes da janela de corte.

## Autenticacao e perfis

- [x] Validar redirecionamento de usuario sem sessao para `/login`.
- [x] Validar login de operador por username/PIN.
- [x] Validar logout com expiracao do cookie e remocao da sessao.
- [x] Validar que operador nao acessa `/catalogos` nem `/usuarios`.
- [x] Validar que superadmin acessa `/catalogos` e `/usuarios`.
- [x] Validar cadastro e edicao de operador por superadmin.
- [ ] Criar credenciais finais de producao e remover usuarios temporarios.

## Fichas

- [x] Criar ficha nova com cliente, produtos, especificacoes e imagem.
- [x] Editar ficha existente sem perder itens nem imagens.
- [x] Filtrar por busca, status, evento e periodo.
- [x] Marcar ficha pendente como entregue e validar `delivered_at`.
- [x] Abrir preview e PDF individual de uma ficha real.
- [x] Exportar PDF operacional filtrado e comparar com a tela.

## Clientes

- [x] Criar cliente novo.
- [x] Editar cliente existente.
- [x] Validar busca por cliente.
- [x] Validar historico de fichas no detalhe do cliente.
- [x] Validar regra de duplicidade por nome normalizado.

## Catalogos

- [x] Criar item temporario em catalogo operacional.
- [x] Editar item temporario.
- [x] Desativar ou remover item temporario.
- [x] Confirmar que alteracoes de catalogo aparecem nos formularios dependentes.

## Relatorios

- [x] Validar resumo mensal com dados reais.
- [x] Validar filtros de periodo, status e evento.
- [x] Exportar Excel e abrir arquivo gerado.
- [x] Comparar totais principais com consulta equivalente no Supabase.

## Corte

- [x] Rodar `npm run supabase:check`.
- [x] Rodar `npm run typecheck`.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run build`.
- [x] Validar rotas principais em desktop e mobile.
- [x] Registrar ajustes finais encontrados.
- [x] Definir plano de rollback.
