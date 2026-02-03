import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


// ==================== CONFIGURAÇÃO CLOUDINARY ====================
const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'SEU_CLOUD_NAME',
  apiKey: process.env.CLOUDINARY_API_KEY || 'SUA_API_KEY',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'SEU_API_SECRET',
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'fichas_upload' // Opcional, para unsigned uploads
};

// Função para gerar assinatura do Cloudinary
function generateCloudinarySignature(paramsToSign) {
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');

  const stringToSign = sortedParams + CLOUDINARY_CONFIG.apiSecret;
  return crypto.createHash('sha1').update(stringToSign).digest('hex');
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para JSON responses com UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Servir arquivos estáticos
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

// ==================== CONEXÃO TURSO ====================
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://fichas-lucascelli.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAxMzA5NzQsImlkIjoiZTMwYmY5NTktN2M5Yy00NDRiLWI3OTctYWVhMzg1ZmYzNGQ3IiwicmlkIjoiMTEwOTA3ZmMtNmMxMi00MWEzLThkNjMtYTZjMzM1YTQ0MjRmIn0.xIc3ziBEzsZ-HdBnYeVJXrxS2bSEXTB2nWie2uaKwuX0TyhiHuvGIM1Mn8w4xoX7Q5LulVCOf8_l8xnFtW8pAA'
});

// Inicializar banco de dados
async function initDatabase() {
  try {
    // Criar tabela de fichas
    await db.execute(`
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

    // Criar tabela de clientes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL,
        primeiro_pedido DATE,
        ultimo_pedido DATE,
        total_pedidos INTEGER DEFAULT 0,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_fichas_cliente ON fichas(cliente)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_fichas_status ON fichas(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_fichas_data_inicio ON fichas(data_inicio)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_fichas_data_entrega ON fichas(data_entrega)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_fichas_vendedor ON fichas(vendedor)`);

    
    // Migração: adicionar coluna imagens_data se não existir
    try {
      await db.execute('ALTER TABLE fichas ADD COLUMN imagens_data TEXT');
      console.log('✅ Coluna imagens_data adicionada via migração');
    } catch (e) {
      // Coluna já existe, ignorar
    }

    console.log('✅ Banco de dados Turso inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

async function dbAll(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

async function dbGet(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function dbRun(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return {
    lastInsertRowid: result.lastInsertRowid,
    rowsAffected: result.rowsAffected
  };
}

// ==================== ROTAS DA API ====================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ok', database: 'turso connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Listar todas as fichas
app.get('/api/fichas', async (req, res) => {
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

    const fichas = await dbAll(query, params);

    // Parse produtos JSON
    const fichasFormatadas = fichas.map(ficha => {
      const f = { ...ficha };
      if (f.produtos) {
        try {
          f.produtos = JSON.parse(f.produtos);
        } catch (e) {
          f.produtos = [];
        }
      }
      return f;
    });

    res.json(fichasFormatadas);
  } catch (error) {
    console.error('Erro ao listar fichas:', error);
    res.status(500).json({ error: 'Erro ao listar fichas' });
  }
});

// Buscar ficha por ID
app.get('/api/fichas/:id', async (req, res) => {
  try {
    const ficha = await dbGet('SELECT * FROM fichas WHERE id = ?', [req.params.id]);

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
app.post('/api/fichas', async (req, res) => {
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
        arte, cor_sublimacao, observacoes, imagem_data, imagens_data, produtos, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dados.cliente, dados.vendedor, dados.dataInicio, dados.numeroVenda,
      dados.dataEntrega, dados.evento || 'nao',
      dados.material, dados.composicao, dados.corMaterial, dados.manga,
      dados.acabamentoManga, dados.larguraManga, dados.gola, dados.acabamentoGola,
      dados.corPeitilhoInterno, dados.corPeitilhoExterno, dados.aberturaLateral,
      dados.reforcoGola, dados.corReforco, dados.bolso, dados.filete, dados.faixa,
      dados.arte, dados.corSublimacao, dados.observacoes, dados.imagemData, dados.imagensData,
      produtosJson, now, now
    ];

    const result = await dbRun(sql, params);
    const novoId = Number(result.lastInsertRowid);

    // Atualizar tabela de clientes
    if (dados.cliente) {
      await atualizarCliente(dados.cliente, dados.dataInicio);
    }

    console.log(`✅ Ficha #${novoId} criada`);
    res.status(201).json({ id: novoId, message: 'Ficha criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar ficha:', error);
    res.status(500).json({ error: 'Erro ao criar ficha' });
  }
});

// Atualizar ficha
app.put('/api/fichas/:id', async (req, res) => {
  try {
    const fichaExiste = await dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

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
        arte = ?, cor_sublimacao = ?, observacoes = ?, imagem_data = ?, imagens_data = ?,
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
      dados.arte, dados.corSublimacao, dados.observacoes, dados.imagemData, dados.imagensData,
      produtosJson, now, req.params.id
    ];

    await dbRun(sql, params);

    console.log(`✅ Ficha #${req.params.id} atualizada`);
    res.json({ id: parseInt(req.params.id), message: 'Ficha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar ficha:', error);
    res.status(500).json({ error: 'Erro ao atualizar ficha' });
  }
});

// Marcar ficha como entregue
app.patch('/api/fichas/:id/entregar', async (req, res) => {
  try {
    const fichaExiste = await dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    const now = new Date().toISOString();
    await dbRun(`UPDATE fichas SET status = 'entregue', data_entregue = ? WHERE id = ?`, [now, req.params.id]);

    console.log(`✅ Ficha #${req.params.id} marcada como entregue`);
    res.json({ message: 'Ficha marcada como entregue' });
  } catch (error) {
    console.error('Erro ao marcar como entregue:', error);
    res.status(500).json({ error: 'Erro ao marcar como entregue' });
  }
});

// Desmarcar ficha (voltar para pendente)
app.patch('/api/fichas/:id/pendente', async (req, res) => {
  try {
    const fichaExiste = await dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    await dbRun(`UPDATE fichas SET status = 'pendente', data_entregue = NULL WHERE id = ?`, [req.params.id]);

    console.log(`✅ Ficha #${req.params.id} voltou para pendente`);
    res.json({ message: 'Ficha marcada como pendente' });
  } catch (error) {
    console.error('Erro ao marcar como pendente:', error);
    res.status(500).json({ error: 'Erro ao marcar como pendente' });
  }
});

// Deletar ficha
app.delete('/api/fichas/:id', async (req, res) => {
  try {
    const fichaExiste = await dbGet('SELECT id FROM fichas WHERE id = ?', [req.params.id]);

    if (!fichaExiste) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }

    await dbRun('DELETE FROM fichas WHERE id = ?', [req.params.id]);

    console.log(`✅ Ficha #${req.params.id} deletada`);
    res.json({ message: 'Ficha deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar ficha:', error);
    res.status(500).json({ error: 'Erro ao deletar ficha' });
  }
});

// Buscar clientes (autocomplete)
app.get('/api/clientes', async (req, res) => {
  try {
    const { termo } = req.query;
    let query = 'SELECT nome FROM clientes';
    const params = [];

    if (termo) {
      query += ' WHERE nome LIKE ?';
      params.push(`%${termo}%`);
    }

    query += ' ORDER BY ultimo_pedido DESC LIMIT 50';

    const clientes = await dbAll(query, params);
    res.json(clientes.map(c => c.nome));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// Listar todos os clientes com detalhes
app.get('/api/clientes/lista', async (req, res) => {
  try {
    const clientes = await dbAll(`
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

// Atualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, primeiro_pedido, ultimo_pedido } = req.body;

    // Verificar se cliente existe
    const clienteExiste = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!clienteExiste) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se o novo nome já existe em outro cliente
    if (nome && nome !== clienteExiste.nome) {
      const nomeExiste = await dbGet('SELECT id FROM clientes WHERE nome = ? AND id != ?', [nome, id]);
      if (nomeExiste) {
        return res.status(400).json({ error: 'Já existe um cliente com este nome' });
      }
    }

    // Atualizar cliente
    await dbRun(
      `UPDATE clientes SET nome = ?, primeiro_pedido = ?, ultimo_pedido = ? WHERE id = ?`,
      [nome || clienteExiste.nome, primeiro_pedido, ultimo_pedido, id]
    );

    // Se o nome mudou, atualizar também nas fichas
    if (nome && nome !== clienteExiste.nome) {
      await dbRun(
        `UPDATE fichas SET cliente = ? WHERE cliente = ?`,
        [nome, clienteExiste.nome]
      );
      console.log(`📝 Nome do cliente atualizado nas fichas: "${clienteExiste.nome}" -> "${nome}"`);
    }

    console.log(`✅ Cliente #${id} atualizado`);
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// Deletar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se cliente existe
    const clienteExiste = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!clienteExiste) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Deletar cliente (as fichas NÃO são deletadas, conforme a mensagem no modal)
    await dbRun('DELETE FROM clientes WHERE id = ?', [id]);

    console.log(`✅ Cliente #${id} (${clienteExiste.nome}) deletado`);
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});


// Estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
  try {
    const stats = {};

    const totalFichas = await dbGet('SELECT COUNT(*) as total FROM fichas');
    stats.totalFichas = totalFichas?.total || 0;

    const pendentes = await dbGet("SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente'");
    stats.pendentes = pendentes?.total || 0;

    const entregues = await dbGet("SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue'");
    stats.entregues = entregues?.total || 0;

    const totalClientes = await dbGet('SELECT COUNT(*) as total FROM clientes');
    stats.totalClientes = totalClientes?.total || 0;

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const esteMes = await dbGet(
      "SELECT COUNT(*) as total FROM fichas WHERE substr(data_inicio, 1, 7) = ?",
      [mesAtual]
    );
    stats.esteMes = esteMes?.total || 0;

    // Total de itens
    const fichas = await dbAll('SELECT produtos FROM fichas');
    let totalItens = 0;
    fichas.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = typeof ficha.produtos === 'string' ? JSON.parse(ficha.produtos) : ficha.produtos;
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
app.get('/api/relatorio', async (req, res) => {
  try {
    const { periodo, dataInicio, dataFim } = req.query;

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const anoAtual = `${now.getFullYear()}`;

    const relatorio = {};

    // Fichas entregues (por data_entregue)
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

    const entreguesResult = await dbGet(sqlEntregues, paramsEntregues);
    relatorio.fichasEntregues = entreguesResult?.total || 0;

    // Fichas pendentes (por data_inicio)
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

    const pendentesResult = await dbGet(sqlPendentes, paramsPendentes);
    relatorio.fichasPendentes = pendentesResult?.total || 0;

    // Itens confeccionados (fichas entregues)
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

    const fichasParaItens = await dbAll(sqlItens, paramsItens);

    let itensConfeccionados = 0;
    fichasParaItens.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = typeof ficha.produtos === 'string' ? JSON.parse(ficha.produtos) : ficha.produtos;
          produtos.forEach(p => {
            itensConfeccionados += parseInt(p.quantidade) || 0;
          });
        } catch (e) {}
      }
    });
    relatorio.itensConfeccionados = itensConfeccionados;

    // Novos clientes
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

    const clientesResult = await dbGet(sqlClientes, paramsClientes);
    relatorio.novosClientes = clientesResult?.total || 0;

    // Top vendedor
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

    const topVendedor = await dbGet(sqlVendedor, paramsVendedor);
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
async function atualizarCliente(nomeCliente, dataInicio) {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const data = dataInicio || hoje;

    const clienteExiste = await dbGet('SELECT * FROM clientes WHERE nome = ?', [nomeCliente]);

    if (clienteExiste) {
      await dbRun(
        `UPDATE clientes SET ultimo_pedido = ?, total_pedidos = total_pedidos + 1 WHERE nome = ?`,
        [data, nomeCliente]
      );
    } else {
      await dbRun(
        `INSERT INTO clientes (nome, primeiro_pedido, ultimo_pedido, total_pedidos) VALUES (?, ?, ?, 1)`,
        [nomeCliente, data, data]
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
  }
}


// ==================== ROTAS CLOUDINARY ====================

// Obter configuração pública do Cloudinary
app.get('/api/cloudinary/config', (req, res) => {
  res.json({
    cloudName: CLOUDINARY_CONFIG.cloudName,
    apiKey: CLOUDINARY_CONFIG.apiKey,
    uploadPreset: CLOUDINARY_CONFIG.uploadPreset
  });
});

// Gerar assinatura para upload signed (com otimização)
app.post('/api/cloudinary/signature', (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'fichas';

    // OTIMIZAÇÃO: Redimensionar e comprimir no upload
    // - Limita a 1500px (suficiente para visualização/impressão)
    // - Qualidade automática (Cloudinary escolhe o melhor)
    // - Formato automático (WebP quando suportado)
    const transformation = 'c_limit,w_1500,h_1500,q_auto:good';

    const paramsToSign = {
      timestamp,
      folder,
      transformation,
      ...req.body
    };

    // Remover parâmetros vazios
    Object.keys(paramsToSign).forEach(key => {
      if (paramsToSign[key] === undefined || paramsToSign[key] === '') {
        delete paramsToSign[key];
      }
    });

    const signature = generateCloudinarySignature(paramsToSign);

    res.json({
      signature,
      timestamp,
      folder,
      transformation,
      apiKey: CLOUDINARY_CONFIG.apiKey,
      cloudName: CLOUDINARY_CONFIG.cloudName
    });
  } catch (error) {
    console.error('Erro ao gerar assinatura:', error);
    res.status(500).json({ error: 'Erro ao gerar assinatura' });
  }
});

// Rota de migração - converter base64 existentes para Cloudinary
app.post('/api/cloudinary/migrar', async (req, res) => {
  try {
    // Buscar fichas com imagens em base64
    const fichas = await dbAll(`
      SELECT id, imagem_data, imagens_data 
      FROM fichas 
      WHERE (imagem_data IS NOT NULL AND imagem_data LIKE 'data:%')
         OR (imagens_data IS NOT NULL AND imagens_data LIKE '%data:%')
    `);

    console.log(`📦 Encontradas ${fichas.length} fichas com imagens para migrar`);

    const resultados = {
      total: fichas.length,
      migradas: 0,
      erros: [],
      detalhes: []
    };

    for (const ficha of fichas) {
      try {
        let imagensAtualizadas = [];
        let temAlteracao = false;

        // Processar imagens_data (novo formato - array JSON)
        if (ficha.imagens_data) {
          let imagens = [];
          try {
            imagens = JSON.parse(ficha.imagens_data);
          } catch (e) {
            console.warn(`Ficha #${ficha.id}: erro ao parsear imagens_data`);
          }

          for (const img of imagens) {
            if (img.src && img.src.startsWith('data:')) {
              // Precisa migrar - fazer upload para Cloudinary
              const uploadResult = await uploadBase64ToCloudinary(img.src, `ficha_${ficha.id}`);
              if (uploadResult.success) {
                imagensAtualizadas.push({
                  src: uploadResult.url,
                  publicId: uploadResult.publicId,
                  descricao: img.descricao || ''
                });
                temAlteracao = true;
              } else {
                // Manter original se falhar
                imagensAtualizadas.push(img);
                resultados.erros.push(`Ficha #${ficha.id}: ${uploadResult.error}`);
              }
            } else {
              // Já é URL, manter
              imagensAtualizadas.push(img);
            }
          }
        }

        // Processar imagem_data (formato antigo - single base64)
        if (ficha.imagem_data && ficha.imagem_data.startsWith('data:') && imagensAtualizadas.length === 0) {
          const uploadResult = await uploadBase64ToCloudinary(ficha.imagem_data, `ficha_${ficha.id}`);
          if (uploadResult.success) {
            imagensAtualizadas.push({
              src: uploadResult.url,
              publicId: uploadResult.publicId,
              descricao: ''
            });
            temAlteracao = true;
          } else {
            resultados.erros.push(`Ficha #${ficha.id}: ${uploadResult.error}`);
          }
        }

        // Atualizar no banco se houve alteração
        if (temAlteracao && imagensAtualizadas.length > 0) {
          await dbRun(
            `UPDATE fichas SET imagens_data = ?, imagem_data = NULL WHERE id = ?`,
            [JSON.stringify(imagensAtualizadas), ficha.id]
          );
          resultados.migradas++;
          resultados.detalhes.push({
            fichaId: ficha.id,
            imagensMigradas: imagensAtualizadas.length
          });
          console.log(`✅ Ficha #${ficha.id}: ${imagensAtualizadas.length} imagem(ns) migrada(s)`);
        }

      } catch (err) {
        console.error(`❌ Erro na ficha #${ficha.id}:`, err);
        resultados.erros.push(`Ficha #${ficha.id}: ${err.message}`);
      }
    }

    console.log(`🎉 Migração concluída: ${resultados.migradas}/${resultados.total} fichas`);
    res.json(resultados);

  } catch (error) {
    console.error('Erro na migração:', error);
    res.status(500).json({ error: 'Erro ao executar migração' });
  }
});

// Função auxiliar para upload de base64 para Cloudinary
async function uploadBase64ToCloudinary(base64Data, publicIdPrefix) {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'fichas';
    const publicId = `${publicIdPrefix}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    const transformation = 'c_limit,w_1500,h_1500,q_auto:good';

    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
      transformation
    };

    const signature = generateCloudinarySignature(paramsToSign);

    const formData = new URLSearchParams();
    formData.append('file', base64Data);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('signature', signature);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
    formData.append('transformation', transformation);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload falhou: ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };

  } catch (error) {
    console.error('Erro no upload Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Deletar imagem do Cloudinary
app.delete('/api/cloudinary/image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const timestamp = Math.round(new Date().getTime() / 1000);

    // O publicId pode vir com / substituído por _SLASH_
    const realPublicId = publicId.replace(/_SLASH_/g, '/');

    const paramsToSign = {
      public_id: realPublicId,
      timestamp
    };

    const signature = generateCloudinarySignature(paramsToSign);

    const formData = new URLSearchParams();
    formData.append('public_id', realPublicId);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
    formData.append('transformation', transformation);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
      {
        method: 'POST',
        body: formData
      }
    );

    const result = await response.json();

    if (result.result === 'ok') {
      console.log(`🗑️ Imagem deletada do Cloudinary: ${realPublicId}`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Falha ao deletar imagem', details: result });
    }

  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
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
    console.log('📊 Banco de dados: Turso (LibSQL)');
    console.log('✅ Encoding UTF-8 configurado');
  });
}).catch(error => {
  console.error('❌ Falha ao iniciar servidor:', error);
  process.exit(1);
});