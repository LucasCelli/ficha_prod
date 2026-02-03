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
        imagens_data TEXT,
        produtos TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_entregue DATETIME
      )
    `);

    // Adicionar coluna imagens_data se não existir (migração)
    try {
      db.run('ALTER TABLE fichas ADD COLUMN imagens_data TEXT');
      console.log('✅ Coluna imagens_data adicionada');
    } catch (e) {
      // Coluna já existe, ignorar
    }

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

  const lastIdResult = db.exec("SELECT last_insert_rowid() as id");
  const lastId = lastIdResult.length > 0 && lastIdResult[0].values.length > 0 
    ? lastIdResult[0].values[0][0] 
    : 0;

  return {
    lastInsertRowid: lastId,
    changes: db.getRowsModified()
  };
}

function dbInsert(sql, params = []) {
  db.run(sql, params);

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
        arte, cor_sublimacao, observacoes, imagem_data, imagens_data, produtos, 
        data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dados.cliente, dados.vendedor, dados.dataInicio, dados.numeroVenda,
      dados.dataEntrega, dados.evento || 'nao',
      dados.material, dados.composicao, dados.corMaterial, dados.manga,
      dados.acabamentoManga, dados.larguraManga, dados.gola, dados.acabamentoGola,
      dados.corPeitilhoInterno, dados.corPeitilhoExterno, dados.aberturaLateral,
      dados.reforcoGola, dados.corReforco, dados.bolso, dados.filete, dados.faixa,
      dados.arte, dados.corSublimacao, dados.observacoes, 
      dados.imagemData || '',
      dados.imagensData || '[]',
      produtosJson, now, now
    ];

    const novoId = dbInsert(sql, params);

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
        imagens_data = ?, produtos = ?, data_atualizacao = ?
      WHERE id = ?
    `;

    const params = [
      dados.cliente, dados.vendedor, dados.dataInicio, dados.numeroVenda,
      dados.dataEntrega, dados.evento || 'nao', dados.status || 'pendente',
      dados.material, dados.composicao, dados.corMaterial, dados.manga,
      dados.acabamentoManga, dados.larguraManga, dados.gola, dados.acabamentoGola,
      dados.corPeitilhoInterno, dados.corPeitilhoExterno, dados.aberturaLateral,
      dados.reforcoGola, dados.corReforco, dados.bolso, dados.filete, dados.faixa,
      dados.arte, dados.corSublimacao, dados.observacoes, 
      dados.imagemData || '',
      dados.imagensData || '[]',
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

    // Contar itens apenas de fichas existentes
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

// Relatório por período - CORRIGIDO v2
app.get('/api/relatorio', (req, res) => {
  try {
    const { periodo, dataInicio, dataFim } = req.query;

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const anoAtual = `${now.getFullYear()}`;

    const relatorio = {};

    // ============ FICHAS ENTREGUES ============
    // Usa data_entregue (quando foi marcado como entregue)
    let sqlEntregues = '';
    let paramsEntregues = [];

    if (periodo === 'mes') {
      sqlEntregues = `SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue' AND substr(date(data_entregue), 1, 7) = ?`;
      paramsEntregues = [mesAtual];
    } else if (periodo === 'ano') {
      sqlEntregues = `SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue' AND substr(date(data_entregue), 1, 4) = ?`;
      paramsEntregues = [anoAtual];
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      sqlEntregues = `SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue' AND date(data_entregue) BETWEEN ? AND ?`;
      paramsEntregues = [dataInicio, dataFim];
    } else {
      sqlEntregues = `SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue'`;
    }

    relatorio.fichasEntregues = dbGet(sqlEntregues, paramsEntregues)?.total || 0;

    // ============ FICHAS PENDENTES ============
    // Usa data_inicio (quando o pedido foi criado)
    let sqlPendentes = '';
    let paramsPendentes = [];

    if (periodo === 'mes') {
      sqlPendentes = `SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente' AND substr(data_inicio, 1, 7) = ?`;
      paramsPendentes = [mesAtual];
    } else if (periodo === 'ano') {
      sqlPendentes = `SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente' AND substr(data_inicio, 1, 4) = ?`;
      paramsPendentes = [anoAtual];
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      sqlPendentes = `SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente' AND data_inicio BETWEEN ? AND ?`;
      paramsPendentes = [dataInicio, dataFim];
    } else {
      sqlPendentes = `SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente'`;
    }

    relatorio.fichasPendentes = dbGet(sqlPendentes, paramsPendentes)?.total || 0;

    // ============ ITENS CONFECCIONADOS ============
    // Soma itens de fichas ENTREGUES no período (por data_entregue)
    let sqlItens = '';
    let paramsItens = [];

    if (periodo === 'mes') {
      sqlItens = `SELECT produtos FROM fichas WHERE status = 'entregue' AND substr(date(data_entregue), 1, 7) = ?`;
      paramsItens = [mesAtual];
    } else if (periodo === 'ano') {
      sqlItens = `SELECT produtos FROM fichas WHERE status = 'entregue' AND substr(date(data_entregue), 1, 4) = ?`;
      paramsItens = [anoAtual];
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      sqlItens = `SELECT produtos FROM fichas WHERE status = 'entregue' AND date(data_entregue) BETWEEN ? AND ?`;
      paramsItens = [dataInicio, dataFim];
    } else {
      sqlItens = `SELECT produtos FROM fichas WHERE status = 'entregue'`;
    }

    const fichasParaItens = dbAll(sqlItens, paramsItens);

    let itensConfeccionados = 0;
    fichasParaItens.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = typeof ficha.produtos === 'string' 
            ? JSON.parse(ficha.produtos) 
            : ficha.produtos;
          produtos.forEach(p => {
            itensConfeccionados += parseInt(p.quantidade) || 0;
          });
        } catch (e) {
          console.warn('Erro ao parsear produtos:', e);
        }
      }
    });
    relatorio.itensConfeccionados = itensConfeccionados;

    // ============ NOVOS CLIENTES ============
    let sqlClientes = '';
    let paramsClientes = [];

    if (periodo === 'mes') {
      sqlClientes = `SELECT COUNT(*) as total FROM clientes WHERE substr(primeiro_pedido, 1, 7) = ?`;
      paramsClientes = [mesAtual];
    } else if (periodo === 'ano') {
      sqlClientes = `SELECT COUNT(*) as total FROM clientes WHERE substr(primeiro_pedido, 1, 4) = ?`;
      paramsClientes = [anoAtual];
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      sqlClientes = `SELECT COUNT(*) as total FROM clientes WHERE primeiro_pedido BETWEEN ? AND ?`;
      paramsClientes = [dataInicio, dataFim];
    } else {
      sqlClientes = `SELECT COUNT(*) as total FROM clientes`;
    }

    relatorio.novosClientes = dbGet(sqlClientes, paramsClientes)?.total || 0;

    // ============ TOP VENDEDOR ============
    // Baseado em fichas criadas no período (data_inicio)
    let sqlVendedor = '';
    let paramsVendedor = [];

    if (periodo === 'mes') {
      sqlVendedor = `SELECT vendedor, COUNT(*) as total FROM fichas WHERE vendedor IS NOT NULL AND vendedor != '' AND substr(data_inicio, 1, 7) = ? GROUP BY vendedor ORDER BY total DESC LIMIT 1`;
      paramsVendedor = [mesAtual];
    } else if (periodo === 'ano') {
      sqlVendedor = `SELECT vendedor, COUNT(*) as total FROM fichas WHERE vendedor IS NOT NULL AND vendedor != '' AND substr(data_inicio, 1, 4) = ? GROUP BY vendedor ORDER BY total DESC LIMIT 1`;
      paramsVendedor = [anoAtual];
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      sqlVendedor = `SELECT vendedor, COUNT(*) as total FROM fichas WHERE vendedor IS NOT NULL AND vendedor != '' AND data_inicio BETWEEN ? AND ? GROUP BY vendedor ORDER BY total DESC LIMIT 1`;
      paramsVendedor = [dataInicio, dataFim];
    } else {
      sqlVendedor = `SELECT vendedor, COUNT(*) as total FROM fichas WHERE vendedor IS NOT NULL AND vendedor != '' GROUP BY vendedor ORDER BY total DESC LIMIT 1`;
    }

    const topVendedor = dbGet(sqlVendedor, paramsVendedor);
    relatorio.topVendedor = topVendedor ? topVendedor.vendedor : null;
    relatorio.topVendedorTotal = topVendedor ? topVendedor.total : 0;

    console.log('📊 Relatório gerado:', relatorio);
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

// ==================== ROTAS DE CLIENTES (CRUD) ====================

// Listar todos os clientes com detalhes (contando pedidos reais)
app.get('/api/clientes/lista', (req, res) => {
  try {
    const clientes = dbAll(`
      SELECT 
        c.id, 
        c.nome, 
        c.primeiro_pedido, 
        c.ultimo_pedido,
        c.data_criacao,
        (SELECT COUNT(*) FROM fichas WHERE fichas.cliente = c.nome) as total_pedidos
      FROM clientes c
      ORDER BY c.nome ASC
    `);

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// Buscar cliente por ID
app.get('/api/clientes/:id', (req, res) => {
  try {
    const cliente = dbGet('SELECT * FROM clientes WHERE id = ?', [req.params.id]);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// Atualizar cliente
app.put('/api/clientes/:id', (req, res) => {
  try {
    const clienteExiste = dbGet('SELECT id, nome FROM clientes WHERE id = ?', [req.params.id]);

    if (!clienteExiste) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { nome, primeiro_pedido, ultimo_pedido } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const nomeExiste = dbGet('SELECT id FROM clientes WHERE nome = ? AND id != ?', [nome.trim(), req.params.id]);

    if (nomeExiste) {
      return res.status(400).json({ error: 'Já existe um cliente com esse nome' });
    }

    const nomeAntigo = clienteExiste.nome;
    const nomeNovo = nome.trim();

    dbRun(`
      UPDATE clientes SET 
        nome = ?,
        primeiro_pedido = ?,
        ultimo_pedido = ?
      WHERE id = ?
    `, [nomeNovo, primeiro_pedido || null, ultimo_pedido || null, req.params.id]);

    if (nomeAntigo !== nomeNovo) {
      dbRun('UPDATE fichas SET cliente = ? WHERE cliente = ?', [nomeNovo, nomeAntigo]);
      console.log(`✅ Nome atualizado de "${nomeAntigo}" para "${nomeNovo}" em todas as fichas`);
    }

    console.log(`✅ Cliente #${req.params.id} atualizado`);
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// Deletar cliente
app.delete('/api/clientes/:id', (req, res) => {
  try {
    const cliente = dbGet('SELECT id, nome FROM clientes WHERE id = ?', [req.params.id]);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    dbRun('DELETE FROM clientes WHERE id = ?', [req.params.id]);

    console.log(`✅ Cliente "${cliente.nome}" excluído`);
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

// Criar cliente manualmente
app.post('/api/clientes', (req, res) => {
  try {
    const { nome, primeiro_pedido, ultimo_pedido } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const existe = dbGet('SELECT id FROM clientes WHERE nome = ?', [nome.trim()]);

    if (existe) {
      return res.status(400).json({ error: 'Cliente já existe' });
    }

    const hoje = new Date().toISOString().split('T')[0];

    const id = dbInsert(`
      INSERT INTO clientes (nome, primeiro_pedido, ultimo_pedido, total_pedidos)
      VALUES (?, ?, ?, 0)
    `, [nome.trim(), primeiro_pedido || hoje, ultimo_pedido || hoje]);

    console.log(`✅ Cliente "${nome}" criado`);
    res.status(201).json({ id, message: 'Cliente criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// Rota catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
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