# Sistema de Fichas Técnicas

Aplicação web para cadastro, acompanhamento e impressão de fichas técnicas de confecção, com persistência em Turso (libSQL) e suporte a imagens no Cloudinary.

## Visão Geral

O sistema cobre o fluxo operacional completo:

- cadastro, edição, visualização e exclusão de fichas
- controle de produção por Kanban com drag-and-drop
- impressão em layout dedicado e preview em modal
- gestão de clientes (autocomplete, edição e exclusão)
- relatórios operacionais com comparativos por período
- backup local em JSON (exportar/importar)

## Novidades Relevantes (últimos ciclos)

- Quadro de Produção (`kanban.html`) com 5 etapas:
  - `pendente`
  - `exportando`
  - `fila_impressao`
  - `sublimando`
  - `na_costura`
- Reordenação manual no Kanban por coluna (`PATCH /api/kanban/order`).
- Autoentrega no backend para fichas que ficam em `na_costura` por mais de 7 dias.
- Filtro “Para Essa Semana” no Kanban e persistência de filtros em `localStorage`.
- Carregamento de templates prontos no formulário (arquivos em `public/data/templates` + preview SVG).
- Barra de tema/status global (`theme.js`) com:
  - alternância light/dark
  - resumo de conectividade (Turso, Cloudinary, Vercel, GitHub)
  - snapshot de clima
- Normalização de dados no backend (nomes, produtos, `comNomes`).
- Migrações automáticas de colunas no startup (incluindo campos de Kanban e imagens múltiplas).
- Design tokens centralizados em `public/css/design-tokens.css`.

## Stack Técnica

- Node.js 18+
- Express 4
- Turso via `@libsql/client`
- Cloudinary (upload assinado e remoção)
- Frontend em HTML/CSS/JS vanilla

## Estrutura do Projeto

```text
.
|-- server.js
|-- package.json
|-- src/
|   |-- config/
|   |-- controllers/
|   |-- middlewares/
|   |-- repositories/
|   |-- routes/
|   |-- services/
|   `-- validators/
`-- public/
    |-- index.html
    |-- dashboard.html
    |-- kanban.html
    |-- clientes.html
    |-- relatorios.html
    |-- data/
    |   |-- catalogo.json
    |   `-- templates/
    |-- css/
    `-- js/
```

Arquivos-chave:

- `server.js`: API principal, inicialização de banco, migrações e integrações externas.
- `public/js/main.js`: formulário principal, imagens, impressão e regras de UI.
- `public/js/integration.js`: integração formulário/API, templates e fluxo de duplicação.
- `public/js/dashboard.js`: listagem de fichas, filtros, preview modal, backup.
- `public/js/kanban.js`: quadro Kanban, drag-and-drop e persistência de ordem/status.
- `public/js/relatorios.js`: dashboards analíticos e exportações.
- `public/js/theme.js`: toolbar global (tema + status de sistemas + clima).

## Funcionalidades

### Fichas

- CRUD completo de fichas técnicas.
- Campos técnicos de modelagem/material e tabela de produtos por tamanho.
- Campo de evento com destaque visual em dashboard/kanban.
- Duplicação de ficha com criação de novo ID.
- Modos via query string no formulário:
  - `?editar=<id>`
  - `?visualizar=<id>`
  - `?duplicar=1`

### Imagens / Cloudinary

- Upload por clique, drag-and-drop e colar (Ctrl+V).
- Limite de até 4 imagens por ficha.
- Suporte a metadados por imagem (`src`, `publicId`, `descricao`).
- Remoção com proteção para imagens compartilhadas entre fichas (`excludeFichaId`).

### Dashboard

- Cards de estatísticas (total, pendentes, clientes, mês).
- Busca por cliente/número da venda/vendedor.
- Filtro por data e por status rápido (todos, pendentes, entregues, evento).
- Preview de impressão em modal com sincronização por `postMessage`.
- Exportação e importação de backup JSON.

### Kanban

- Colunas por etapa de produção com atualização de status em tempo real.
- Reordenação por arraste dentro de coluna.
- Dedupe por `numero_venda` para evitar cartões duplicados na visão.
- Ação rápida de “marcar como entregue” na coluna `na_costura`.

### Clientes

- Autocomplete no formulário.
- Página dedicada com filtros, ordenação, paginação e cards.
- Edição e exclusão com modal de confirmação.

### Relatórios

- Períodos: mês, ano e customizado.
- KPIs: fichas entregues/pendentes, itens, novos clientes.
- Análises: vendedores, materiais, produtos, clientes top, tamanhos.
- Comparativo com período anterior.
- Indicadores de eficiência (tempo médio, atrasos, eventos, recorrência).

## Como Rodar Localmente

```bash
npm install
npm start
```

Aplicação:

- `http://localhost:3000`

Modo desenvolvimento:

```bash
npm run dev
```

## Variáveis de Ambiente

Crie um `.env` na raiz:

```env
# obrigatório
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu_token

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
CLOUDINARY_UPLOAD_PRESET=fichas_upload

# servidor
PORT=3000

# opcionais (status/conectividade)
GITHUB_REPO=owner/repo
GITHUB_TOKEN=seu_token_github
GH_TOKEN=seu_token_github_alternativo
VERCEL_URL=seu-deploy.vercel.app
VERCEL_PROJECT_PRODUCTION_URL=seu-dominio.vercel.app
VERCEL_GIT_REPO_OWNER=owner
VERCEL_GIT_REPO_SLUG=repo
VERCEL_GIT_COMMIT_SHA=sha
GITHUB_SHA=sha

# opcionais (weather/providers)
GITHUB_COMMIT_TIMEZONE=Etc/GMT+4
WEATHER_PROVIDER_DISTANCE_LIMIT_KM=120
WEATHER_PROVIDER_DISABLE_AFTER_INACCURATE=3
WEATHER_PROVIDER_DISABLE_AFTER_FAILURES=5
WEATHER_PROVIDER_DISABLE_TTL_MS=21600000
```

## API (Resumo)

### Health e Sistema

- `GET /api/health`
- `GET /api/system-status`

### Fichas

- `GET /api/fichas`
- `GET /api/fichas/:id`
- `POST /api/fichas`
- `PUT /api/fichas/:id`
- `PATCH /api/fichas/:id/entregar`
- `PATCH /api/fichas/:id/pendente`
- `PATCH /api/fichas/:id/kanban-status`
- `DELETE /api/fichas/:id`

### Kanban

- `PATCH /api/kanban/order`

### Clientes

- `GET /api/clientes`
- `GET /api/clientes/lista`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

### Estatísticas e Relatórios

- `GET /api/estatisticas`
- `GET /api/relatorio`
- `GET /api/relatorio/vendedores`
- `GET /api/relatorio/materiais`
- `GET /api/relatorio/produtos`
- `GET /api/relatorio/clientes-top`
- `GET /api/relatorio/tamanhos`
- `GET /api/relatorio/comparativo`
- `GET /api/relatorio/eficiencia`

### Cloudinary

- `GET /api/cloudinary/config`
- `POST /api/cloudinary/signature`
- `POST /api/cloudinary/migrar`
- `DELETE /api/cloudinary/image/:publicId` (query opcional: `excludeFichaId`)

## Banco de Dados (Turso)

### Tabela `fichas`

Campos principais:

- identificação e datas (`id`, `data_inicio`, `data_entrega`, `data_entregue`)
- comerciais (`cliente`, `vendedor`, `numero_venda`, `status`, `evento`)
- Kanban (`kanban_status`, `kanban_status_updated_at`, `kanban_ordem`)
- técnicos (material, manga, gola, bolso, filete, faixa, cores auxiliares etc.)
- personalização (`com_nomes`, `observacoes`)
- imagens (`imagem_data`, `imagens_data`)
- produtos serializados (`produtos`)

### Tabela `clientes`

- `id`, `nome`, `primeiro_pedido`, `ultimo_pedido`, `total_pedidos`, `data_criacao`

## Scripts

- `npm start`: inicia o servidor
- `npm run dev`: inicia com watch
