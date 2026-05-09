# TODO

Backlog vivo para features, refinos e decisoes futuras. Itens concluídos devem ser marcados aqui e detalhados em `registro-alteracoes.md`.

## Refino visual

- [ ] Homologar densidade e alinhamento em `/fichas`, `/quadro-producao`, `/clientes`, `/catalogos`, `/usuarios` e `/relatorios`.
- [ ] Validar manualmente a sensação final do drag and drop real em produtos, imagens e quadro.

## Fichas

- [ ] Fechar paridade fina do auto-preenchimento de observações contra exemplos reais da versão anterior.
- [ ] Decidir se o editor de observações deve migrar de `contentEditable` para Tiptap.

## Bibliotecas e arquitetura

- [ ] Avaliar `@tanstack/react-table` quando sorting, filtros compostos e paginação ficarem mais exigentes em fichas, clientes e catálogos.
- [ ] Avaliar `recharts` para relatórios visuais.
- [ ] Avaliar `zustand` para preferências locais e estado interativo do quadro quando o estado local atual deixar de ser suficiente.
