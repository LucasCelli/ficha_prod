# TODO

Backlog vivo para features, refinos e decisoes futuras. Itens concluídos devem ser marcados aqui e detalhados em `registro-alteracoes.md`.

## Fichas

- [x] Fechar paridade fina do auto-preenchimento de observações contra exemplos reais da versão anterior.
- [x] Decidir se o editor de observações deve migrar de `contentEditable` para Tiptap.
- [ ] Botão "Descartar" rascunho no toast não está funcionando. Nada acontece ao clicar nele.

## Bibliotecas e arquitetura

- [ ] Avaliar `@tanstack/react-table` quando sorting, filtros compostos e paginação ficarem mais exigentes em fichas, clientes e catálogos.
- [ ] Avaliar `recharts` para relatórios visuais.
- [ ] Avaliar `zustand` para preferências locais e estado interativo do quadro quando o estado local atual deixar de ser suficiente.
- [ ] Warning no Radix `AlertDialogContent` requires a description for the component to be accessible for screen reader users. You can add a description to the `AlertDialogContent` by passing a `AlertDialogDescription` component as a child, which also benefits sighted users by adding visible context to the dialog. Alternatively, you can use your own component as a description by assigning it an `id` and passing the same value to the `aria-describedby` prop in `AlertDialogContent`. If the description is confusing or duplicative for sighted users, you can use the `@radix-ui/react-visually-hidden` primitive as a wrapper around your description component. For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog
- [ ] Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.