# Plugins React/Next recomendados para o projeto

Levantamento baseado no plano de migração Next.js + Supabase. Cada pacote está justificado pelo que já existe no código ou pelo que ainda está pendente no plano.

---

## Já em uso · confirmados no plano

| Pacote | Motivo |
|---|---|
| `@hello-pangea/dnd` | Drag/drop de produtos e imagens na ficha, com persistência de ordem em `ficha_imagens.ordem`. |
| `react-hook-form` | Formulário de ficha com campos condicionais, validação Zod e Server Actions — já implementado em `src/features/fichas/ficha-form.tsx`. |
| `zod` | Schema de validação em `src/features/fichas/schema.ts`, reaproveitado no front e nas Server Actions. |
| `lucide-react` | Ícone padrão de todo o novo sistema, inclusive no dismiss dos toasts. |

---

## Críticos · ainda não estão e podem bloquear fases pendentes

### `@tanstack/react-table`

As listagens de fichas, clientes e catálogos usam um `data-table.tsx` próprio iniciado no projeto. À medida que a homologação avança (Fase 9), sorting por coluna, filtros compostos e paginação robusta vão exigir um table engine sólido. Instalar agora evita reescrever o primitivo compartilhado depois.

```bash
npm install @tanstack/react-table
```

### `nuqs`

Você já sincroniza filtros por URL manualmente em vários lugares: `status`, `período`, `cliente`, `evento`, `arte`, `dataInicio`, `dataFim`. O `nuqs` elimina esse boilerplate, garante tipagem nos search params e funciona nativamente com o App Router do Next.js.

```bash
npm install nuqs
```

**Referência no plano:** filtros de fichas, relatórios e exportação Excel já dependem de URL state — é o ponto de maior retorno imediato.

### `sonner`

O projeto já tem `toast-provider.tsx` próprio. O próximo gargalo é o feedback de ações async com upload Cloudinary (salvar ficha com imagens pendentes). O `sonner` resolve isso com `toast.promise()` nativo, sem precisar gerenciar estados de loading manualmente.

```bash
npm install sonner
```

---

## Recomendados · encaixam direto nas fases pendentes

### `date-fns`

A lógica de "Atrasado há X dias" já usa `America/Cuiaba` no cálculo de atraso. O `date-fns` com locale `pt-BR` lida corretamente com timezone, formatação de datas nas listagens e nos filtros de período, sem os bugs silenciosos que cálculos manuais de diferença de datas introduzem.

```bash
npm install date-fns
```

### `react-day-picker`

Os filtros de período nas fichas e relatórios hoje são inputs `<input type="date">` simples. Um date range picker melhora muito a UX operacional para seleção de janelas como "esta semana" ou "mês anterior", que já são atalhos no plano.

```bash
npm install react-day-picker
```

### `@tanstack/react-query`

Para o Dashboard (Fase 6) e o Kanban pendente, onde dados de produção mudam com frequência e o usuário espera ver atualizações sem recarregar a página. Substitui `useEffect` + fetch manual por cache client-side com `refetchInterval`.

```bash
npm install @tanstack/react-query
```

### `react-resizable-panels`

O quadro de produção/Kanban está registrado como pendência de paridade pós-base. Painéis redimensionáveis são naturais em layouts de colunas por status de produção. O shadcn/ui já tem wrapper pronto para esse pacote.

```bash
npm install react-resizable-panels
```

---

## Pendentes · necessários para itens abertos no plano

### `@tiptap/react`

O editor rico de observações foi implementado de forma simples. A paridade fina com o legado (negrito, listas, quebras de linha formatadas) ainda está aberta no plano como item crítico de polimento. O Tiptap é headless e integra sem conflito com `react-hook-form`.

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

### `recharts`

O Dashboard tem indicadores em cards de métricas. A distribuição por tipo de personalização e o histórico de entregas são candidatos naturais a gráficos. O `recharts` é a escolha padrão para dashboards React com dados do Supabase via TanStack Query.

```bash
npm install recharts
```

### `zustand`

Estado de filtros ativos e preferências do Kanban hoje ficam locais ou em cookie. Quando o Kanban entrar, o estado de colunas, drag entre status e visibilidade de cards vai crescer além do que `useState` local comporta. O `zustand` organiza isso sem providers.

```bash
npm install zustand
```

---

## Ordem sugerida de instalação

```bash
# Agora, antes do corte para produção
npm install nuqs date-fns sonner

# Junto com as próximas fases de homologação
npm install @tanstack/react-table react-day-picker

# Quando o Dashboard e o Kanban entrarem
npm install @tanstack/react-query recharts react-resizable-panels zustand

# Quando fechar a paridade fina do editor de observações
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```
