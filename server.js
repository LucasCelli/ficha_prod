import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para JSON responses com UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Servir arquivos estáticos com charset UTF-8
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// Variável global do banco de dados
let db = null;
const DB_PATH = path.join(__dirname, 'fichas.db');

// Função para salvar o banco em disco
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('Erro ao salvar banco de dados:', error);
  }
}

// Auto-save a cada 30 segundos
setInterval(saveDatabase, 30000);

// Inicializar banco de dados
async function initDatabase() {
  try {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('✅ Banco de dados carregado de fichas.db');
    } else {
      db = new SQL.Database();
      console.log('✅ Novo banco de dados criado');
    }

    // Criar tabelas
    db.run(`
      CREATE TABLE IF NOT EXISTS fichas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT NOT NULL,
        vendedor TEXT,
        data_inicio DATE,
        numero_venda TEXT,
        data_entrega DATE,
        evento TEXT DEFAULT 'nao',
        status TEXT DEFAULT 'pendente',
        material TEXT,
        composicao TEXT,
        cor_material TEXT,
        manga TEXT,
        acabamento_manga TEXT,
        largura_manga TEXT,
        gola TEXT,
        acabamento_gola TEXT,
        cor_peitilho_interno TEXT,
        cor_peitilho_externo TEXT,
        abertura_lateral TEXT,
        reforco_gola TEXT,
        cor_reforco TEXT,
        bolso TEXT,
        filete TEXT,
        faixa TEXT,
        arte TEXT,
        cor_sublimacao TEXT,
        observacoes TEXT,
        imagem_data TEXT,
        produtos TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_entregue DATETIME
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL,
        primeiro_pedido DATE,
        ultimo_pedido DATE,
        total_pedidos INTEGER DEFAULT 0,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_fichas_cliente ON fichas(cliente)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fichas_status ON fichas(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fichas_data_inicio ON fichas(data_inicio)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fichas_data_entrega ON fichas(data_entrega)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fichas_vendedor ON fichas(vendedor)`);

    saveDatabase();
    console.log('✅ Tabelas e índices criados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

// Funções auxiliares para queries
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbGet(sql, params = []) {
  const results = dbAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDatabase();

  // Obter last_insert_rowid corretamente para sql.js
  const lastIdResult = db.exec("SELECT last_insert_rowid() as id");
  const lastId = lastIdResult.length > 0 && lastIdResult[0].values.length > 0 
    ? lastIdResult[0].values[0][0] 
    : 0;

  return {
    lastInsertRowid: lastId,
    changes: db.getRowsModified()
  };
}

// Função específica para INSERT que retorna o ID corretamente
function dbInsert(sql, params = []) {
  db.run(sql, params);

  // Obter o último ID inserido
  const result = db.exec("SELECT last_insert_rowid() as id");
  const lastId = result[0]?.values[0]?.[0] || 0;

  saveDatabase();

  return lastId;
}

// ==================== ROTAS DA API ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Listar todas as fichas
app.get('/api/fichas', (req, res) => {
  try {
    const { status, cliente, vendedor, dataInicio, dataFim } = req.query;

    let query = 'SELECT * FROM fichas WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (cliente) {
      query += ' AND cliente LIKE ?';
      params.push(`%${cliente}%`);
    }

    if (vendedor) {
      query += ' AND vendedor = ?';
      params.push(vendedor);
    }

    if (dataInicio) {
      query += ' AND data_inicio >= ?';
      params.push(dataInicio);
    }

    if (dataFim) {
      query += ' AND data_inicio <= ?';
      params.push(dataFim);
    }

    query += ' ORDER BY id DESC';

    const fichas = dbAll(query, params);

    fichas.forEach(ficha => {
      if (ficha.produtos) {
        try {
          ficha.produtos = JSON.parse(ficha.produtos);
        } catch (e) {
          ficha.produtos = [];
        }
      }
    });

    res.json(fichas);
  } catch (error) {
    console.error('Erro ao listar fichas:', error);
    res.status(500).json({ error: 'Erro ao listar fichas' });
  }
});

// Buscar ficha por ID
app.get('/api/fichas/:id', (req, res) => {
  try {
    const ficha = dbGet('SELECT * FROM fichas WHERE id = ?', [req.params.id]);

    if (!ficha) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    if (ficha.produtos) {
      try {
        ficha.produtos = JSON.parse(ficha.produtos);
      } catch (e) {
        ficha.produtos = [];
      }
    }

    res.json(ficha);
  } catch (error) {
    console.error('Erro ao buscar ficha:', error);
    res.status(500).json({ error: 'Erro ao buscar ficha' });
  }
});

// Criar nova ficha
app.post('/api/fichas', (req, res) => {
  try {
    const dados = req.body;
    const produtosJson = JSON.stringify(dados.produtos || []);
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO fichas (
        cliente, vendedor, data_inicio, numero_venda, data_entrega, evento,
        material, composicao, cor_material, manga, acabamento_manga, largura_manga,
        gola, acabamento_gola, cor_peitilho_interno, cor_peitilho_externo,
        abertura_lateral, reforco_gola, cor_reforco, bolso, filete, faixa,
        arte, cor_sublimacao, observacoes, imagem_data, produtos, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dados.cliente, dados.vendedor, dados.dataInicio, dados.numeroVenda,
      dados.dataEntrega, dados.evento || 'nao',
      dados.material, dados.composicao, dados.corMaterial, dados.manga,
      dados.acabamentoManga, dados.larguraManga, dados.gola, dados.acabamentoGola,
      dados.corPeitilhoInterno, dados.corPeitilhoExterno, dados.aberturaLateral,
      dados.reforcoGola, dados.corReforco, dados.bolso, dados.filete, dados.faixa,
      dados.arte, dados.corSublimacao, dados.observacoes, dados.imagemData,
      produtosJson, now, now
    ];

    // Usar dbInsert para obter o ID corretamente
    const novoId = dbInsert(sql, params);

    // Atualizar tabela de clientes
    if (dados.cliente) {
      atualizarCliente(dados.cliente, dados.dataInicio);
    }

    console.log(`✅ Ficha #${novoId} criada`);
    res.status(201).json({ id: novoId, message: 'Ficha criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar ficha:', error);
    res.status(500).json({ error: 'Erro ao criar ficha' });
  }
});

// Atualizar ficha
app.put('/api/fichas/:id', (req, res) => {
  try {
    const fichaExiste = dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    const dados = req.body;
    const produtosJson = JSON.stringify(dados.produtos || []);
    const now = new Date().toISOString();

    const sql = `
      UPDATE fichas SET
        cliente = ?, vendedor = ?, data_inicio = ?, numero_venda = ?,
        data_entrega = ?, evento = ?, status = ?,
        material = ?, composicao = ?, cor_material = ?, manga = ?,
        acabamento_manga = ?, largura_manga = ?, gola = ?, acabamento_gola = ?,
        cor_peitilho_interno = ?, cor_peitilho_externo = ?, abertura_lateral = ?,
        reforco_gola = ?, cor_reforco = ?, bolso = ?, filete = ?, faixa = ?,
        arte = ?, cor_sublimacao = ?, observacoes = ?, imagem_data = ?,
        produtos = ?, data_atualizacao = ?
      WHERE id = ?
    `;

    const params = [
      dados.cliente, dados.vendedor, dados.dataInicio, dados.numeroVenda,
      dados.dataEntrega, dados.evento || 'nao', dados.status || 'pendente',
      dados.material, dados.composicao, dados.corMaterial, dados.manga,
      dados.acabamentoManga, dados.larguraManga, dados.gola, dados.acabamentoGola,
      dados.corPeitilhoInterno, dados.corPeitilhoExterno, dados.aberturaLateral,
      dados.reforcoGola, dados.corReforco, dados.bolso, dados.filete, dados.faixa,
      dados.arte, dados.corSublimacao, dados.observacoes, dados.imagemData,
      produtosJson, now, req.params.id
    ];

    dbRun(sql, params);

    console.log(`✅ Ficha #${req.params.id} atualizada`);
    res.json({ id: parseInt(req.params.id), message: 'Ficha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar ficha:', error);
    res.status(500).json({ error: 'Erro ao atualizar ficha' });
  }
});

// Marcar ficha como entregue
app.patch('/api/fichas/:id/entregar', (req, res) => {
  try {
    const fichaExiste = dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    const now = new Date().toISOString();
    dbRun(`UPDATE fichas SET status = 'entregue', data_entregue = ? WHERE id = ?`, [now, req.params.id]);

    console.log(`✅ Ficha #${req.params.id} marcada como entregue`);
    res.json({ message: 'Ficha marcada como entregue' });
  } catch (error) {
    console.error('Erro ao marcar como entregue:', error);
    res.status(500).json({ error: 'Erro ao marcar como entregue' });
  }
});

// Desmarcar ficha (voltar para pendente)
app.patch('/api/fichas/:id/pendente', (req, res) => {
  try {
    const fichaExiste = dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    dbRun(`UPDATE fichas SET status = 'pendente', data_entregue = NULL WHERE id = ?`, [req.params.id]);

    console.log(`✅ Ficha #${req.params.id} voltou para pendente`);
    res.json({ message: 'Ficha marcada como pendente' });
  } catch (error) {
    console.error('Erro ao marcar como pendente:', error);
    res.status(500).json({ error: 'Erro ao marcar como pendente' });
  }
});

// Deletar ficha
app.delete('/api/fichas/:id', (req, res) => {
  try {
    const fichaExiste = dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    dbRun('DELETE FROM fichas WHERE id = ?', [req.params.id]);

    console.log(`✅ Ficha #${req.params.id} deletada`);
    res.json({ message: 'Ficha deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar ficha:', error);
    res.status(500).json({ error: 'Erro ao deletar ficha' });
  }
});

// Buscar clientes (autocomplete)
app.get('/api/clientes', (req, res) => {
  try {
    const { termo } = req.query;
    let query = 'SELECT nome FROM clientes';
    const params = [];

    if (termo) {
      query += ' WHERE nome LIKE ?';
      params.push(`%${termo}%`);
    }

    query += ' ORDER BY ultimo_pedido DESC LIMIT 50';

    const clientes = dbAll(query, params);
    res.json(clientes.map(c => c.nome));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// Estatísticas gerais
app.get('/api/estatisticas', (req, res) => {
  try {
    const stats = {};

    stats.totalFichas = dbGet('SELECT COUNT(*) as total FROM fichas')?.total || 0;
    stats.pendentes = dbGet("SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente'")?.total || 0;
    stats.entregues = dbGet("SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue'")?.total || 0;
    stats.totalClientes = dbGet('SELECT COUNT(*) as total FROM clientes')?.total || 0;

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    stats.esteMes = dbGet(
      "SELECT COUNT(*) as total FROM fichas WHERE substr(data_inicio, 1, 7) = ?",
      [mesAtual]
    )?.total || 0;

    const fichas = dbAll('SELECT produtos FROM fichas');
    let totalItens = 0;
    fichas.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = JSON.parse(ficha.produtos);
          produtos.forEach(p => {
            totalItens += parseInt(p.quantidade) || 0;
          });
        } catch (e) {}
      }
    });
    stats.totalItens = totalItens;

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Relatório por período
app.get('/api/relatorio', (req, res) => {
  try {
    const { periodo, dataInicio, dataFim } = req.query;

    let whereClause = '';
    const params = [];

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const anoAtual = `${now.getFullYear()}`;

    if (periodo === 'mes') {
      whereClause = "WHERE substr(data_inicio, 1, 7) = ?";
      params.push(mesAtual);
    } else if (periodo === 'ano') {
      whereClause = "WHERE substr(data_inicio, 1, 4) = ?";
      params.push(anoAtual);
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      whereClause = 'WHERE data_inicio BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }

    const relatorio = {};

    const sqlEntregues = `SELECT COUNT(*) as total FROM fichas ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'entregue'`;
    relatorio.fichasEntregues = dbGet(sqlEntregues, params)?.total || 0;

    const sqlPendentes = `SELECT COUNT(*) as total FROM fichas ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'pendente'`;
    relatorio.fichasPendentes = dbGet(sqlPendentes, params)?.total || 0;

    const sqlFichas = `SELECT produtos FROM fichas ${whereClause} ${whereClause ? 'AND' : 'WHERE'} status = 'entregue'`;
    const fichasEntregues = dbAll(sqlFichas, params);

    let itensConfeccionados = 0;
    fichasEntregues.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = JSON.parse(ficha.produtos);
          produtos.forEach(p => {
            itensConfeccionados += parseInt(p.quantidade) || 0;
          });
        } catch (e) {}
      }
    });
    relatorio.itensConfeccionados = itensConfeccionados;

    let whereClauseClientes = '';
    const paramsClientes = [];

    if (periodo === 'mes') {
      whereClauseClientes = "WHERE substr(primeiro_pedido, 1, 7) = ?";
      paramsClientes.push(mesAtual);
    } else if (periodo === 'ano') {
      whereClauseClientes = "WHERE substr(primeiro_pedido, 1, 4) = ?";
      paramsClientes.push(anoAtual);
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      whereClauseClientes = 'WHERE primeiro_pedido BETWEEN ? AND ?';
      paramsClientes.push(dataInicio, dataFim);
    }

    relatorio.novosClientes = dbGet(
      `SELECT COUNT(*) as total FROM clientes ${whereClauseClientes}`,
      paramsClientes
    )?.total || 0;

    const sqlTopVendedor = `
      SELECT vendedor, COUNT(*) as total FROM fichas 
      ${whereClause} ${whereClause ? 'AND' : 'WHERE'} vendedor IS NOT NULL AND vendedor != ''
      GROUP BY vendedor 
      ORDER BY total DESC 
      LIMIT 1
    `;
    const topVendedor = dbGet(sqlTopVendedor, params);
    relatorio.topVendedor = topVendedor ? topVendedor.vendedor : null;
    relatorio.topVendedorTotal = topVendedor ? topVendedor.total : 0;

    res.json(relatorio);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Função auxiliar para atualizar dados do cliente
function atualizarCliente(nomeCliente, dataInicio) {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const data = dataInicio || hoje;

    const clienteExiste = dbGet('SELECT * FROM clientes WHERE nome = ?', [nomeCliente]);

    if (clienteExiste) {
      dbRun(
        `UPDATE clientes SET ultimo_pedido = ?, total_pedidos = total_pedidos + 1 WHERE nome = ?`,
        [data, nomeCliente]
      );
    } else {
      dbRun(
        `INSERT INTO clientes (nome, primeiro_pedido, ultimo_pedido, total_pedidos) VALUES (?, ?, ?, 1)`,
        [nomeCliente, data, data]
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
  }
}

// Rota catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Iniciar servidor
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 Servidor rodando em http://localhost:' + PORT);
    console.log('📊 Banco de dados: fichas.db (sql.js)');
    console.log('✅ Encoding UTF-8 configurado');
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n💾 Salvando banco de dados...');
  saveDatabase();
  console.log('✅ Banco de dados salvo');
  console.log('👋 Servidor encerrado');
  process.exit(0);
});

process.on('SIGTERM', () => {
  saveDatabase();
  process.exit(0);
});