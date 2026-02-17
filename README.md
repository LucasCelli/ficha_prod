# Sistema de Fichas Tecnicas

Aplicacao web para cadastro, acompanhamento e impressao de fichas tecnicas de confeccao, com armazenamento em Turso (libSQL) e imagens no Cloudinary.

## Visao Geral

O sistema foi desenhado para operar o ciclo completo da ficha:

- criar e editar ficha tecnica
- anexar layouts/imagens (ate 4 por ficha)
- controlar status (pendente/entregue)
- visualizar e imprimir em modo pronto para producao
- duplicar ficha para novo id
- acompanhar indicadores e relatorios
- exportar dados (PDF, Excel, JSON)

## Stack Tecnica

- Node.js 18+
- Express 4
- Turso (@libsql/client)
- Cloudinary (upload e gestao de imagens)
- Frontend em HTML/CSS/JS vanilla

## Estrutura do Projeto

```text
.
|-- server.js
|-- package.json
`-- public/
    |-- index.html
    |-- dashboard.html
    |-- clientes.html
    |-- relatorios.html
    |-- css/
    `-- js/
```

Arquivos principais:

- `server.js`: API, regras de negocio, integracao Turso/Cloudinary
- `public/js/main.js`: formulario da ficha, impressao, preenchimento
- `public/js/integration.js`: ligacao formulario <-> API
- `public/js/dashboard.js`: listagem, modal de visualizacao, duplicacao
- `public/js/image-handler-cloudinary.js`: UI de imagens no formulario
- `public/js/cloudinary-upload.js`: upload/remocao no Cloudinary
- `public/js/relatorios.js`: dashboards de relatorios + exportacoes
- `public/js/rich-text-editor.js`: editor rico de observacoes

## Funcionalidades Atuais

### Fichas

- CRUD completo de fichas
- campos tecnicos para modelagem e composicao
- tabela de produtos por tamanho/quantidade/descricao
- status pendente/entregue com data de entrega
- destaque para fichas de evento
- duplicacao de ficha com novo id

### Visualizacao e Impressao

- modal de pre-visualizacao de impressao no dashboard
- loading do modal sincronizado com render final da pre-visualizacao
- impressao com layout dedicado (`print-version`)
- observacoes (editor rico) refletidas corretamente na impressao

### Duplicacao no Modal

- botao `Duplicar ficha` no modal de visualizacao
- ao duplicar, cria nova ficha (sem reaproveitar id)
- redireciona direto para `index.html?editar=<novoId>`

### Imagens e Cloudinary

- upload por clique, drag-and-drop e colar (Ctrl+V)
- ate 4 imagens por ficha
- suporte a URL/publicId/descricao por imagem
- remocao segura para imagens compartilhadas:
  - se a imagem estiver em outra ficha, remove apenas da ficha atual
  - exibicao de aviso informando que a ficha original nao foi alterada

### Clientes

- autocomplete de clientes no formulario
- listagem com historico e total de pedidos/fichas
- edicao e exclusao de clientes

### Relatorios

- visao por periodo (mes, ano, customizado)
- analise por vendedor e por material
- top produtos, top clientes, distribuicao por tamanho
- comparativo com periodo anterior
- exportacao PDF/Excel e impressao
- terminologia orientada a "fichas" na interface (evita confusao com "vendas")

### Backup

- exportar backup JSON
- importar backup JSON

## Como Rodar Localmente

```bash
npm install
npm start
```

Acesse:

- `http://localhost:3000`

Modo desenvolvimento:

```bash
npm run dev
```

## Variaveis de Ambiente

Crie um `.env` na raiz:

```env
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu_token

CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
# opcional (padrao: fichas_upload)
CLOUDINARY_UPLOAD_PRESET=fichas_upload

# opcional (padrao: 3000)
PORT=3000
```

## API (Resumo)

### Health

- `GET /api/health`

### Fichas

- `GET /api/fichas`
- `GET /api/fichas/:id`
- `POST /api/fichas`
- `PUT /api/fichas/:id`
- `PATCH /api/fichas/:id/entregar`
- `PATCH /api/fichas/:id/pendente`
- `DELETE /api/fichas/:id`

Filtros suportados em `GET /api/fichas`:

- `status`
- `cliente`
- `vendedor`
- `dataInicio` (YYYY-MM-DD)
- `dataFim` (YYYY-MM-DD)

### Clientes

- `GET /api/clientes`
- `GET /api/clientes/lista`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

### Estatisticas e Relatorios

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
- `DELETE /api/cloudinary/image/:publicId`
  - query opcional: `excludeFichaId`

## Banco de Dados (Principal)

### Tabela `fichas`

Campos relevantes:

- identificacao e datas (`id`, `data_inicio`, `data_entrega`, `data_entregue`)
- dados comerciais (`cliente`, `vendedor`, `numero_venda`, `status`, `evento`)
- especificacoes tecnicas (material, manga, gola, bolso, filete, faixa etc.)
- observacoes (`observacoes`)
- imagens (`imagem_data`, `imagens_data`)
- produtos em JSON (`produtos`)

### Tabela `clientes`

- `id`, `nome`, `primeiro_pedido`, `ultimo_pedido`, `total_pedidos`, `data_criacao`

## Fluxos Importantes

### 1) Duplicar ficha sem risco de sobrescrever id

Duplicacao sempre remove `id` antes de salvar, garantindo nova ficha.

### 2) Remover imagem em ficha duplicada

Quando a imagem e compartilhada, o backend impede exclusao fisica no Cloudinary e retorna sucesso de remocao local.

### 3) Preview no modal do dashboard

O loading do modal so encerra quando o iframe sinaliza que a versao de impressao foi montada, evitando flash de pagina sem estilo final.

## Scripts

- `npm start`: sobe o servidor
- `npm run dev`: sobe com watch para desenvolvimento

## Observacao

Se voce alterar comportamento de relatorios, lembre que o sistema usa "fichas" como unidade de comparacao na interface para evitar vies por vendedor que apenas cadastrou mais fichas para o mesmo pedido.