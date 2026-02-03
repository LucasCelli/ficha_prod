import Database from 'better-sqlite3';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.db.path, {
  verbose: config.isDev ? (sql) => logger.debug({ sql }, 'SQL') : null,
});

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fichas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      vendedor TEXT,
      data_inicio DATE,
      numero_venda TEXT,
      data_entrega DATE,
      evento TEXT DEFAULT 'nao',
      status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'entregue', 'cancelado')),
      material TEXT, composicao TEXT, cor_material TEXT, manga TEXT,
      acabamento_manga TEXT, largura_manga TEXT, gola TEXT, acabamento_gola TEXT,
      cor_peitilho_interno TEXT, cor_peitilho_externo TEXT, abertura_lateral TEXT,
      reforco_gola TEXT, cor_reforco TEXT, bolso TEXT, filete TEXT, faixa TEXT,
      arte TEXT, cor_sublimacao TEXT, observacoes TEXT, imagem_data TEXT,
      produtos JSON DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      email TEXT, telefone TEXT,
      primeiro_pedido DATE, ultimo_pedido DATE,
      total_pedidos INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_fichas_cliente ON fichas(cliente);
    CREATE INDEX IF NOT EXISTS idx_fichas_status ON fichas(status);
    CREATE INDEX IF NOT EXISTS idx_fichas_data_inicio ON fichas(data_inicio);
    CREATE INDEX IF NOT EXISTS idx_fichas_vendedor ON fichas(vendedor);
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
  `);
  logger.info('✅ Banco de dados inicializado');
}

export function closeDatabase() {
  db.close();
  logger.info('Banco de dados fechado');
}
