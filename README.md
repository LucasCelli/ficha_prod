# 📋 Sistema de Fichas Técnicas v0.5-beta

Sistema moderno de gestão de fichas técnicas para confecção de roupas personalizadas.

## 🚀 Tecnologias

| Tecnologia | Descrição |
|------------|-----------|
| **Node.js 18+** | Runtime JavaScript |
| **Express 4.x** | Framework web |
| **Turso (libSQL)** | Banco de dados SQLite distribuído |
| **Cloudinary** | Armazenamento de imagens na nuvem |
| **dotenv** | Variáveis de ambiente |

## 📁 Estrutura

```
fichas-tecnicas/
├── server.js              # Servidor Express + API
├── package.json
├── .env                   # Credenciais (não commitar!)
└── public/
    ├── index.html         # Formulário de fichas
    ├── dashboard.html     # Listagem e gestão
    ├── clientes.html      # Gestão de clientes
    ├── relatorios.html    # Relatórios
    ├── migracao-cloudinary.html
    ├── css/
    │   ├── styles.css
    │   ├── dashboard.css
    │   └── cloudinary-styles.css
    └── js/
        ├── api-client.js           # Cliente da API
        ├── main.js                 # Lógica do formulário
        ├── integration.js          # Integração com backend
        ├── dashboard.js            # Lógica do dashboard
        ├── clientes.js             # Gestão de clientes
        ├── cloudinary-upload.js    # Upload para Cloudinary
        └── image-handler-cloudinary.js
```

## ⚡ Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env (ver abaixo)

# 3. Iniciar servidor
npm start

# 4. Acessar
http://localhost:3000
```

## 🔧 Configuração (.env)

```env
# Turso Database
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu_token

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

## 📡 API Endpoints

### Fichas Técnicas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/fichas` | Listar fichas (com filtros) |
| `GET` | `/api/fichas/:id` | Buscar ficha por ID |
| `POST` | `/api/fichas` | Criar nova ficha |
| `PUT` | `/api/fichas/:id` | Atualizar ficha |
| `PATCH` | `/api/fichas/:id/entregar` | Marcar como entregue |
| `PATCH` | `/api/fichas/:id/pendente` | Voltar para pendente |
| `DELETE` | `/api/fichas/:id` | Excluir ficha |

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/clientes` | Autocomplete de clientes |
| `GET` | `/api/clientes/lista` | Listar todos com detalhes |
| `PUT` | `/api/clientes/:id` | Atualizar cliente |
| `DELETE` | `/api/clientes/:id` | Excluir cliente |

### Estatísticas e Relatórios
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/estatisticas` | Estatísticas gerais |
| `GET` | `/api/relatorio` | Relatório por período |

### Cloudinary
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/cloudinary/config` | Config pública |
| `POST` | `/api/cloudinary/signature` | Gerar assinatura de upload |
| `POST` | `/api/cloudinary/migrar` | Migrar imagens base64 |
| `DELETE` | `/api/cloudinary/image/:id` | Deletar imagem |

## 🔍 Filtros Disponíveis

```
GET /api/fichas?status=pendente&cliente=João&dataInicio=2024-01-01
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | `pendente` ou `entregue` |
| `cliente` | string | Busca parcial no nome |
| `vendedor` | string | Nome do vendedor |
| `dataInicio` | date | Filtrar a partir de (YYYY-MM-DD) |
| `dataFim` | date | Filtrar até (YYYY-MM-DD) |

## 🖼️ Sistema de Imagens

- Upload direto para **Cloudinary** (não sobrecarrega o banco)
- Otimização automática: `c_limit,w_1500,h_1500,q_auto:good`
- Suporta até **4 imagens** por ficha
- Drag & drop, paste (Ctrl+V), click para upload
- Thumbnails otimizados para listagem

## 📊 Funcionalidades

- ✅ CRUD completo de fichas técnicas
- ✅ Gestão de clientes com histórico
- ✅ Status de pedidos (pendente/entregue)
- ✅ Marcação de pedidos para eventos
- ✅ Upload de múltiplas imagens
- ✅ Relatórios por período
- ✅ Exportar/importar backup JSON
- ✅ Autocomplete de clientes
- ✅ Filtros avançados
- ✅ Responsivo (mobile-friendly)

## 🗄️ Estrutura do Banco

### Tabela: fichas
```sql
id, cliente, vendedor, data_inicio, numero_venda, data_entrega,
evento, status, material, composicao, cor_material, manga,
acabamento_manga, largura_manga, gola, acabamento_gola,
cor_peitilho_interno, cor_peitilho_externo, abertura_lateral,
reforco_gola, cor_reforco, bolso, filete, faixa, arte,
cor_sublimacao, observacoes, imagem_data, imagens_data,
produtos (JSON), data_criacao, data_atualizacao, data_entregue
```

### Tabela: clientes
```sql
id, nome (unique), primeiro_pedido, ultimo_pedido,
total_pedidos, data_criacao
```

## 📜 Scripts

```bash
npm start    # Inicia o servidor
npm run dev  # Modo desenvolvimento (hot reload)
```

## 📝 Changelog

### v0.5-beta (atual)
- ✨ Integração com Cloudinary para imagens
- ✨ Otimização automática de uploads
- ✨ Migração de imagens base64 existentes
- 🐛 Correção no carregamento de múltiplas imagens

### v0.4-beta
- ✨ Suporte a múltiplas imagens por ficha
- ✨ Drag & drop e paste de imagens

### v0.3-beta
- ✨ Migração para Turso (banco distribuído)
- ✨ Gestão de clientes separada

### v0.2-beta
- ✨ Dashboard de fichas
- ✨ Filtros e relatórios

### v0.1-beta
- 🎉 Versão inicial
- ✨ Formulário de fichas técnicas
- ✨ Salvamento local