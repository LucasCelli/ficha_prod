import { db } from '../config/database.js';

export const EstatisticaService = {
  getEstatisticasGerais() {
    const stats = {};
    stats.totalFichas = db.prepare('SELECT COUNT(*) as total FROM fichas').get().total;
    stats.pendentes = db.prepare("SELECT COUNT(*) as total FROM fichas WHERE status = 'pendente'").get().total;
    stats.entregues = db.prepare("SELECT COUNT(*) as total FROM fichas WHERE status = 'entregue'").get().total;
    stats.totalClientes = db.prepare('SELECT COUNT(*) as total FROM clientes').get().total;
    stats.esteMes = db.prepare(`SELECT COUNT(*) as total FROM fichas WHERE strftime('%Y-%m', data_inicio) = strftime('%Y-%m', 'now')`).get().total;

    const fichas = db.prepare('SELECT produtos FROM fichas').all();
    let totalItens = 0;
    fichas.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = JSON.parse(ficha.produtos);
          produtos.forEach(p => { totalItens += parseInt(p.quantidade) || 0; });
        } catch (e) {}
      }
    });
    stats.totalItens = totalItens;
    return stats;
  },

  getRelatorio(periodo, dataInicio, dataFim) {
    let whereClause = '';
    const params = [];

    if (periodo === 'mes') {
      whereClause = "WHERE strftime('%Y-%m', data_inicio) = strftime('%Y-%m', 'now')";
    } else if (periodo === 'ano') {
      whereClause = "WHERE strftime('%Y', data_inicio) = strftime('%Y', 'now')";
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      whereClause = 'WHERE data_inicio BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }

    const relatorio = {};
    const and = whereClause ? ' AND' : ' WHERE';

    relatorio.fichasEntregues = db.prepare(`SELECT COUNT(*) as total FROM fichas ${whereClause}${and} status = 'entregue'`).get(...params).total;
    relatorio.fichasPendentes = db.prepare(`SELECT COUNT(*) as total FROM fichas ${whereClause}${and} status = 'pendente'`).get(...params).total;

    const fichasEntregues = db.prepare(`SELECT produtos FROM fichas ${whereClause}${and} status = 'entregue'`).all(...params);
    let itensConfeccionados = 0;
    fichasEntregues.forEach(ficha => {
      if (ficha.produtos) {
        try {
          const produtos = JSON.parse(ficha.produtos);
          produtos.forEach(p => { itensConfeccionados += parseInt(p.quantidade) || 0; });
        } catch (e) {}
      }
    });
    relatorio.itensConfeccionados = itensConfeccionados;

    let whereClauseClientes = '';
    if (periodo === 'mes') {
      whereClauseClientes = "WHERE strftime('%Y-%m', primeiro_pedido) = strftime('%Y-%m', 'now')";
    } else if (periodo === 'ano') {
      whereClauseClientes = "WHERE strftime('%Y', primeiro_pedido) = strftime('%Y', 'now')";
    } else if (periodo === 'customizado' && dataInicio && dataFim) {
      whereClauseClientes = 'WHERE primeiro_pedido BETWEEN ? AND ?';
    }
    relatorio.novosClientes = db.prepare(`SELECT COUNT(*) as total FROM clientes ${whereClauseClientes}`).get(...params).total;

    const topVendedor = db.prepare(`SELECT vendedor, COUNT(*) as total FROM fichas ${whereClause}${and} vendedor IS NOT NULL GROUP BY vendedor ORDER BY total DESC LIMIT 1`).get(...params);
    relatorio.topVendedor = topVendedor ? topVendedor.vendedor : null;
    relatorio.topVendedorTotal = topVendedor ? topVendedor.total : 0;

    return relatorio;
  },
};
