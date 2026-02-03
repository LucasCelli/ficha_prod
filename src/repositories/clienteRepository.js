import { db } from '../config/database.js';

export const ClienteRepository = {
  findAll(termo = '') {
    let query = 'SELECT nome FROM clientes';
    const params = {};
    if (termo) { query += ' WHERE nome LIKE @termo'; params.termo = `%${termo}%`; }
    query += ' ORDER BY ultimo_pedido DESC LIMIT 50';
    return db.prepare(query).all(params).map(c => c.nome);
  },

  upsert(nome, dataInicio) {
    const clienteExiste = db.prepare('SELECT * FROM clientes WHERE nome = ?').get(nome);
    const data = dataInicio || new Date().toISOString().split('T')[0];
    if (clienteExiste) {
      db.prepare(`UPDATE clientes SET ultimo_pedido = ?, total_pedidos = total_pedidos + 1 WHERE nome = ?`).run(data, nome);
    } else {
      db.prepare(`INSERT INTO clientes (nome, primeiro_pedido, ultimo_pedido, total_pedidos) VALUES (?, ?, ?, 1)`).run(nome, data, data);
    }
  },
};
