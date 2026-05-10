# TODO

Backlog vivo para features, refinos e decisoes futuras. Itens concluídos devem ser marcados aqui e detalhados em `registro-alteracoes.md`.

## Fichas

- [x] Fechar paridade fina do auto-preenchimento de observações contra exemplos reais da versão anterior.
- [x] Decidir se o editor de observações deve migrar de `contentEditable` para Tiptap.
- [x] Botão "Descartar" rascunho no toast não está funcionando. Nada acontece ao clicar nele.
- [ ] Permitir vincular uma lista organizada pela IA a uma ficha, salvando o JSON revisado junto da ficha para consulta, reexportação e auditoria posterior.

## Bibliotecas e arquitetura

- [ ] Avaliar `@tanstack/react-table` quando sorting, filtros compostos e paginação ficarem mais exigentes em fichas, clientes e catálogos.
- [ ] Avaliar `recharts` para relatórios visuais.
- [ ] Avaliar `zustand` para preferências locais e estado interativo do quadro quando o estado local atual deixar de ser suficiente.
- [x] Warning no Radix `AlertDialogContent` requires a description para dialogs sem `aria-describedby`.
- [x] Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.
