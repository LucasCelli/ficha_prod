# TODO

Backlog vivo para features, refinos e decisoes futuras. Itens concluidos devem ser marcados aqui e detalhados em `registro-alteracoes.md`.

## Fichas

- [x] Fechar paridade fina do auto-preenchimento de observacoes contra exemplos reais da versao anterior.
- [x] Decidir se o editor de observacoes deve migrar de `contentEditable` para Tiptap.
- [x] Botao "Descartar" rascunho no toast nao esta funcionando. Nada acontece ao clicar nele.
- [x] Permitir vincular uma lista organizada pela IA a uma ficha, salvando o JSON revisado junto da ficha para consulta, reexportacao e auditoria posterior.
- [x] Mostrar total de produtos no editor de ficha e permitir imprimir a lista de nomes anexada junto da ficha.

## Bibliotecas e arquitetura

- [x] Avaliar `@tanstack/react-table` quando sorting, filtros compostos e paginacao ficarem mais exigentes em fichas, clientes e catalogos.
- [x] Avaliar `recharts` para relatorios visuais.
- [x] Avaliar `zustand` para preferencias locais e estado interativo do quadro quando o estado local atual deixar de ser suficiente.
- [x] Warning no Radix `AlertDialogContent` requires a description para dialogs sem `aria-describedby`.
- [x] Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.

## Motion e interacoes

- [x] Centralizar presets de Motion nos primitivos compartilhados.
- [x] Migrar popovers, loading, modal, alerta, tooltip, datalist e menu para Motion compartilhado.
- [x] Corrigir flashes e estado inconsistente ao mover cards no quadro migrando o Kanban para `@dnd-kit/react`.
- [x] Reduzir travamento do card no quadro durante colisao com outros cards/colunas.
- [x] Reconstruir `/quadro-producao` com `@dnd-kit/react` como controlador unico dos cards e visual fiel compacto baseado em `kanban-ideia/`.
- [ ] Animar saida de fichas na listagem ao entregar/deletar.
- [x] Revisar Motion do quadro sem competir com DnD Kit.
- [ ] Migrar ordenacao por tamanho e autopreenchimento de observacoes para feedback Motion.
- [ ] Remover keyframes/transicoes manuais obsoletas restantes do CSS global.
