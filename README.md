# 📋 Sistema de Fichas Técnicas v3.0

Sistema moderno de gestão de fichas técnicas com arquitetura limpa.

## 🚀 Tecnologias Atualizadas

| Pacote | Versão | Descrição |
|--------|--------|-----------|
| Node.js | 20+ | Runtime JavaScript moderno |
| Express | 5.x | Framework web (última versão) |
| better-sqlite3 | 11.x | Banco SQLite otimizado |
| Zod | 3.x | Validação de schemas |
| Pino | 9.x | Logger de alta performance |
| Helmet | 8.x | Segurança HTTP |
| Express Rate Limit | 7.x | Rate limiting |

## 📁 Arquitetura

```
sistema-fichas-v3/
├── src/
│   ├── config/          # Configurações
│   ├── controllers/     # Controllers da API
│   ├── middlewares/     # Middlewares
│   ├── repositories/    # Acesso a dados
│   ├── routes/          # Definição de rotas
│   ├── services/        # Lógica de negócio
│   ├── utils/           # Utilitários
│   ├── validators/      # Validação Zod
│   └── server.js
├── public/              # Frontend
├── data/                # Banco SQLite
└── package.json
```

## ⚡ Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor
npm start

# 3. Modo desenvolvimento (hot reload)
npm run dev

# 4. Acessar
http://localhost:3000
```

## 📡 API Endpoints

### Fichas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/fichas` | Listar (filtros + paginação) |
| GET | `/api/fichas/:id` | Buscar por ID |
| POST | `/api/fichas` | Criar |
| PUT | `/api/fichas/:id` | Atualizar |
| PATCH | `/api/fichas/:id/entregar` | Marcar entregue |
| DELETE | `/api/fichas/:id` | Deletar |

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes` | Autocomplete |

### Estatísticas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/estatisticas` | Gerais |
| GET | `/api/relatorio` | Por período |

## 🔧 Filtros

```
GET /api/fichas?status=pendente&cliente=João&page=1&limit=20
```

| Filtro | Descrição |
|--------|-----------|
| status | pendente, entregue, cancelado |
| cliente | Busca parcial |
| vendedor | Busca exata |
| dataInicio | YYYY-MM-DD |
| dataFim | YYYY-MM-DD |
| page | Página (default: 1) |
| limit | Itens/página (default: 50, max: 100) |

## 🔒 Segurança

- ✅ Helmet para headers HTTP seguros
- ✅ Rate limiting (100 req/15min por IP)
- ✅ Validação de entrada com Zod
- ✅ CORS configurável
- ✅ Prepared statements (anti SQL injection)

## 🆕 Mudanças da v2 para v3

| Antes (v2) | Depois (v3) |
|------------|-------------|
| Express 4.x | Express 5.x |
| Validação manual | Zod schemas |
| Console.log | Pino logger |
| Código monolítico | Arquitetura em camadas |
| Sem rate limit | Rate limiting |
| Sem compressão | Gzip/Brotli |
