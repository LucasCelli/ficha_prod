import { db } from '../config/database.js';

export const FichaRepository = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO fichas (
        cliente, vendedor, data_inicio, numero_venda, data_entrega, evento,
        material, composicao, cor_material, manga, acabamento_manga, largura_manga,
        gola, acabamento_gola, cor_peitilho_interno, cor_peitilho_externo,
        abertura_lateral, reforco_gola, cor_reforco, bolso, filete, faixa,
        arte, cor_sublimacao, observacoes, imagem_data, produtos
      ) VALUES (
        @cliente, @vendedor, @dataInicio, @numeroVenda, @dataEntrega, @evento,
        @material, @composicao, @corMaterial, @manga, @acabamentoManga, @larguraManga,
        @gola, @acabamentoGola, @corPeitilhoInterno, @corPeitilhoExterno,
        @aberturaLateral, @reforcoGola, @corReforco, @bolso, @filete, @faixa,
        @arte, @corSublimacao, @observacoes, @imagemData, @produtos
      )
    `);
    const info = stmt.run({ ...data, produtos: JSON.stringify(data.produtos || []) });
    return info.lastInsertRowid;
  },

  findById(id) {
    const stmt = db.prepare('SELECT * FROM fichas WHERE id = ?');
    const ficha = stmt.get(id);
    if (ficha && ficha.produtos) ficha.produtos = JSON.parse(ficha.produtos);
    return ficha;
  },

  findAll(filtros = {}) {
    const { status, cliente, vendedor, dataInicio, dataFim, page = 1, limit = 50 } = filtros;
    let query = 'SELECT * FROM fichas WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM fichas WHERE 1=1';
    const params = {};

    if (status) { query += ' AND status = @status'; countQuery += ' AND status = @status'; params.status = status; }
    if (cliente) { query += ' AND cliente LIKE @cliente'; countQuery += ' AND cliente LIKE @cliente'; params.cliente = `%${cliente}%`; }
    if (vendedor) { query += ' AND vendedor = @vendedor'; countQuery += ' AND vendedor = @vendedor'; params.vendedor = vendedor; }
    if (dataInicio) { query += ' AND data_inicio >= @dataInicio'; countQuery += ' AND data_inicio >= @dataInicio'; params.dataInicio = dataInicio; }
    if (dataFim) { query += ' AND data_inicio <= @dataFim'; countQuery += ' AND data_inicio <= @dataFim'; params.dataFim = dataFim; }

    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = offset;

    const fichas = db.prepare(query).all(params);
    const { total } = db.prepare(countQuery).get(params);
    fichas.forEach(f => { if (f.produtos) f.produtos = JSON.parse(f.produtos); });

    return { data: fichas, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, data) {
    const stmt = db.prepare(`
      UPDATE fichas SET
        cliente = @cliente, vendedor = @vendedor, data_inicio = @dataInicio,
        numero_venda = @numeroVenda, data_entrega = @dataEntrega, evento = @evento,
        status = @status, material = @material, composicao = @composicao,
        cor_material = @corMaterial, manga = @manga, acabamento_manga = @acabamentoManga,
        largura_manga = @larguraManga, gola = @gola, acabamento_gola = @acabamentoGola,
        cor_peitilho_interno = @corPeitilhoInterno, cor_peitilho_externo = @corPeitilhoExterno,
        abertura_lateral = @aberturaLateral, reforco_gola = @reforcoGola,
        cor_reforco = @corReforco, bolso = @bolso, filete = @filete, faixa = @faixa,
        arte = @arte, cor_sublimacao = @corSublimacao, observacoes = @observacoes,
        imagem_data = @imagemData, produtos = @produtos, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    const info = stmt.run({ id, ...data, produtos: JSON.stringify(data.produtos || []) });
    return info.changes > 0;
  },

  markAsDelivered(id) {
    const stmt = db.prepare(`UPDATE fichas SET status = 'entregue', delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    return stmt.run(id).changes > 0;
  },

  delete(id) {
    return db.prepare('DELETE FROM fichas WHERE id = ?').run(id).changes > 0;
  },

  getVendedores() {
    return db.prepare(`SELECT DISTINCT vendedor FROM fichas WHERE vendedor IS NOT NULL AND vendedor != '' ORDER BY vendedor`).all().map(r => r.vendedor);
  },
};
