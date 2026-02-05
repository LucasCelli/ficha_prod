/**
 * Relatórios e Estatísticas
 */
(function () {
  'use strict';

  let periodoAtual = 'mes';
  let relatorioAtual = null;
  let dadosVendedores = [];
  let dadosMateriais = [];

  document.addEventListener('DOMContentLoaded', async () => {
    await initRelatorios();
  });

  async function initRelatorios() {
    try {
      if (typeof db !== 'undefined' && db.init) {
        await db.init();
      }

      initEventListeners();
      await carregarRelatorio();
    } catch (error) {
      mostrarErro('Erro ao conectar com o servidor');
    }
  }

  function initEventListeners() {
    document.querySelectorAll('.btn-periodo').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        periodoAtual = btn.dataset.periodo;
        const customPeriod = document.getElementById('customPeriod');

        if (periodoAtual === 'customizado') {
          customPeriod.style.display = 'block';
        } else {
          customPeriod.style.display = 'none';
          carregarRelatorio();
        }
      });
    });

    document.getElementById('btnAplicarPeriodo')?.addEventListener('click', () => {
      carregarRelatorio();
    });

    document.getElementById('filtroVendedor')?.addEventListener('change', (e) => {
      const vendedor = e.target.value;
      if (vendedor) {
        filtrarPorVendedor(vendedor);
      } else {
        renderizarVendedores(dadosVendedores);
      }
    });

    document.getElementById('filtroMaterial')?.addEventListener('change', (e) => {
      const material = e.target.value;
      if (material) {
        filtrarPorMaterial(material);
      } else {
        renderizarMateriais(dadosMateriais);
      }
    });

    document.getElementById('btnExportarPDF')?.addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
    document.getElementById('btnImprimir')?.addEventListener('click', imprimirRelatorio);
  }

  function buildUrlParams() {
    let params = `periodo=${periodoAtual}`;
    if (periodoAtual === 'customizado') {
      const dataInicio = document.getElementById('relDataInicio')?.value;
      const dataFim = document.getElementById('relDataFim')?.value;
      if (dataInicio) params += `&dataInicio=${dataInicio}`;
      if (dataFim) params += `&dataFim=${dataFim}`;
    }
    return params;
  }

  async function carregarRelatorio() {
    try {
      if (periodoAtual === 'customizado') {
        const dataInicio = document.getElementById('relDataInicio')?.value;
        const dataFim = document.getElementById('relDataFim')?.value;

        if (!dataInicio || !dataFim) {
          mostrarErro('Por favor, selecione as datas inicial e final');
          return;
        }
      }

      const url = `${db.baseURL}/relatorio?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar relatório');

      relatorioAtual = await response.json();

      atualizarEstatisticas(relatorioAtual);
      atualizarVendedorDestaque(relatorioAtual);
      atualizarTaxaEntrega(relatorioAtual);

      await Promise.all([
        carregarDadosVendedores(),
        carregarDadosMateriais(),
        carregarRankingProdutos(),
        carregarRankingClientes(),
        carregarDistribuicaoTamanhos(),
        carregarComparativo()
      ]);

    } catch (error) {
      mostrarErro('Erro ao carregar relatório');
    }
  }

  // Estatísticas Principais

  function atualizarEstatisticas(dados) {
    const statPedidosEntregues = document.getElementById('statPedidosEntregues');
    const statPedidosPendentes = document.getElementById('statPedidosPendentes');
    const statItensConfeccionados = document.getElementById('statItensConfeccionados');
    const statNovosClientes = document.getElementById('statNovosClientes');

    if (statPedidosEntregues) statPedidosEntregues.textContent = dados.fichasEntregues || 0;
    if (statPedidosPendentes) statPedidosPendentes.textContent = dados.fichasPendentes || 0;
    if (statItensConfeccionados) statItensConfeccionados.textContent = formatarNumero(dados.itensConfeccionados || 0);
    if (statNovosClientes) statNovosClientes.textContent = dados.novosClientes || 0;
  }

  function atualizarVendedorDestaque(dados) {
    const nomeEl = document.getElementById('topVendedorNome');
    const statsEl = document.getElementById('topVendedorStats');

    if (!nomeEl || !statsEl) return;

    if (dados.topVendedor) {
      nomeEl.textContent = dados.topVendedor;
      statsEl.textContent = `${dados.topVendedorTotal || 0} ${(dados.topVendedorTotal || 0) === 1 ? 'venda' : 'vendas'}`;
    } else {
      nomeEl.textContent = 'Nenhum vendedor';
      statsEl.textContent = '0 vendas';
    }
  }

  function atualizarTaxaEntrega(dados) {
    const entregues = dados.fichasEntregues || 0;
    const pendentes = dados.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

    const taxaValue = document.getElementById('taxaValue');
    const taxaEntregues = document.getElementById('taxaEntregues');
    const taxaTotal = document.getElementById('taxaTotal');
    const circle = document.getElementById('taxaProgress');

    if (taxaValue) taxaValue.textContent = `${taxa}%`;
    if (taxaEntregues) taxaEntregues.textContent = entregues;
    if (taxaTotal) taxaTotal.textContent = total;

    if (circle) {
      const circumference = 283;
      const offset = circumference - (taxa / 100) * circumference;
      circle.style.strokeDashoffset = offset;

      if (taxa >= 80) {
        circle.style.stroke = '#10b981';
      } else if (taxa >= 50) {
        circle.style.stroke = '#f59e0b';
      } else {
        circle.style.stroke = '#ef4444';
      }
    }
  }

  // Análise por Vendedor

  async function carregarDadosVendedores() {
    const container = document.getElementById('vendedoresContainer');
    const loading = document.getElementById('vendedoresLoading');
    const empty = document.getElementById('vendedoresEmpty');
    const select = document.getElementById('filtroVendedor');

    try {
      if (loading) loading.style.display = 'block';
      if (container) container.style.display = 'none';
      if (empty) empty.style.display = 'none';

      const url = `${db.baseURL}/relatorio/vendedores?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar vendedores');

      const dados = await response.json();

      dadosVendedores = dados.map(v => ({
        vendedor: v.vendedor,
        totalPedidos: v.total_pedidos || v.totalPedidos || 0,
        totalItens: v.total_itens || v.totalItens || 0,
        entregues: v.entregues || 0,
        pendentes: (v.total_pedidos || v.totalPedidos || 0) - (v.entregues || 0)
      }));

      if (select) {
        select.innerHTML = '<option value="">Todos os vendedores</option>';
        dadosVendedores.forEach(v => {
          select.innerHTML += `<option value="${escapeHtml(v.vendedor)}">${escapeHtml(v.vendedor)}</option>`;
        });
      }

      if (loading) loading.style.display = 'none';

      if (dadosVendedores.length === 0) {
        if (empty) empty.style.display = 'block';
      } else {
        if (container) container.style.display = 'block';
        renderizarVendedores(dadosVendedores);
      }

    } catch (error) {
      if (loading) loading.style.display = 'none';
      if (empty) empty.style.display = 'block';
    }
  }

  function renderizarVendedores(vendedores) {
    const container = document.getElementById('vendedoresContainer');
    if (!container) return;

    if (vendedores.length === 0) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-user-slash"></i><p>Nenhum vendedor encontrado</p></div>';
      return;
    }

    const maxItens = Math.max(...vendedores.map(v => v.totalItens || 0), 1);

    container.innerHTML = vendedores.map((v, index) => {
      const porcentagemBarra = maxItens > 0 ? ((v.totalItens || 0) / maxItens * 100) : 0;
      const taxaEntrega = v.totalPedidos > 0 ? Math.round((v.entregues / v.totalPedidos) * 100) : 0;
      const taxaClass = taxaEntrega >= 80 ? 'taxa-alta' : taxaEntrega >= 50 ? 'taxa-media' : 'taxa-baixa';

      return `
        <div class="ranking-item ${index < 3 ? 'top-' + (index + 1) : ''}">
          <div class="ranking-position">${index + 1}º</div>
          <div class="ranking-info">
            <div class="ranking-header">
              <span class="ranking-name">${escapeHtml(v.vendedor)}</span>
              <span class="ranking-badge ${taxaClass}">${taxaEntrega}% entrega</span>
            </div>
            <div class="ranking-stats">
              <span><i class="fas fa-file-alt"></i> ${v.totalPedidos || 0} pedidos</span>
              <span><i class="fas fa-tshirt"></i> ${formatarNumero(v.totalItens || 0)} itens</span>
              <span><i class="fas fa-check-circle"></i> ${v.entregues || 0} entregues</span>
              <span><i class="fas fa-clock"></i> ${v.pendentes || 0} pendentes</span>
            </div>
            <div class="ranking-bar">
              <div class="ranking-bar-fill" style="width: ${porcentagemBarra}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function filtrarPorVendedor(vendedor) {
    const filtrado = dadosVendedores.filter(v => v.vendedor === vendedor);
    renderizarVendedores(filtrado);
  }

  // Análise por Material

  async function carregarDadosMateriais() {
    const container = document.getElementById('materiaisContainer');
    const loading = document.getElementById('materiaisLoading');
    const empty = document.getElementById('materiaisEmpty');
    const select = document.getElementById('filtroMaterial');

    try {
      if (loading) loading.style.display = 'block';
      if (container) container.style.display = 'none';
      if (empty) empty.style.display = 'none';

      const url = `${db.baseURL}/relatorio/materiais?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar materiais');

      const dados = await response.json();

      dadosMateriais = dados.map(m => ({
        material: m.material,
        totalPedidos: m.total_pedidos || m.totalPedidos || 0,
        totalItens: m.total_itens || m.totalItens || 0
      }));

      if (select) {
        select.innerHTML = '<option value="">Todos os materiais</option>';
        dadosMateriais.forEach(m => {
          select.innerHTML += `<option value="${escapeHtml(m.material)}">${escapeHtml(m.material)}</option>`;
        });
      }

      if (loading) loading.style.display = 'none';

      if (dadosMateriais.length === 0) {
        if (empty) empty.style.display = 'block';
      } else {
        if (container) container.style.display = 'block';
        renderizarMateriais(dadosMateriais);
      }

    } catch (error) {
      if (loading) loading.style.display = 'none';
      if (empty) empty.style.display = 'block';
    }
  }

  function renderizarMateriais(materiais) {
    const container = document.getElementById('materiaisContainer');
    if (!container) return;

    if (materiais.length === 0) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-inbox"></i><p>Nenhum material encontrado</p></div>';
      return;
    }

    const totalItens = materiais.reduce((sum, m) => sum + (m.totalItens || 0), 0);

    container.innerHTML = materiais.map((m, index) => {
      const porcentagem = totalItens > 0 ? ((m.totalItens || 0) / totalItens * 100) : 0;
      const cores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
      const cor = cores[index % cores.length];

      return `
        <div class="ranking-item material-item">
          <div class="ranking-position" style="background: ${cor}; color: white;">${index + 1}º</div>
          <div class="ranking-info">
            <div class="ranking-header">
              <span class="ranking-name">${escapeHtml(m.material)}</span>
              <span class="ranking-value">${formatarNumero(m.totalItens || 0)} itens</span>
            </div>
            <div class="ranking-stats">
              <span><i class="fas fa-file-alt"></i> ${m.totalPedidos || 0} pedidos</span>
              <span><i class="fas fa-percentage"></i> ${porcentagem.toFixed(1)}% do total</span>
            </div>
            <div class="ranking-bar">
              <div class="ranking-bar-fill" style="width: ${porcentagem}%; background: ${cor};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function filtrarPorMaterial(material) {
    const filtrado = dadosMateriais.filter(m => m.material === material);
    renderizarMateriais(filtrado);
  }

  // Rankings

  async function carregarRankingProdutos() {
    const container = document.getElementById('produtosRanking');
    if (!container) return;

    try {
      const url = `${db.baseURL}/relatorio/produtos?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      const produtos = await response.json();

      if (produtos.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-tshirt"></i><p>Nenhum produto</p></div>';
        return;
      }

      container.innerHTML = produtos.slice(0, 5).map((p, i) => `
        <div class="mini-ranking-item">
          <span class="mini-pos">${i + 1}º</span>
          <span class="mini-name">${escapeHtml(p.produto || 'Não especificado')}</span>
          <span class="mini-value">${formatarNumero(p.quantidade || 0)}</span>
        </div>
      `).join('');

    } catch (error) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar</p></div>';
    }
  }

  async function carregarRankingClientes() {
    const container = document.getElementById('clientesRanking');
    if (!container) return;

    try {
      const url = `${db.baseURL}/relatorio/clientes-top?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      const clientes = await response.json();

      if (clientes.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-users"></i><p>Nenhum cliente</p></div>';
        return;
      }

      container.innerHTML = clientes.slice(0, 5).map((c, i) => `
        <div class="mini-ranking-item">
          <span class="mini-pos">${i + 1}º</span>
          <span class="mini-name">${escapeHtml(c.cliente)}</span>
          <span class="mini-value">${c.total_pedidos || c.totalPedidos || 0} pedidos</span>
        </div>
      `).join('');

    } catch (error) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar</p></div>';
    }
  }

  // Distribuição por Tamanho

  async function carregarDistribuicaoTamanhos() {
    const container = document.getElementById('tamanhosContainer');
    if (!container) return;

    try {
      const url = `${db.baseURL}/relatorio/tamanhos?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      const tamanhos = await response.json();

      if (tamanhos.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-ruler"></i><p>Nenhum dado de tamanho</p></div>';
        return;
      }

      const maxQtd = Math.max(...tamanhos.map(t => t.quantidade || 0), 1);
      const totalQtd = tamanhos.reduce((sum, t) => sum + (t.quantidade || 0), 0);

      container.innerHTML = `
        <div class="tamanhos-bars">
          ${tamanhos.map(t => {
            const altura = maxQtd > 0 ? ((t.quantidade || 0) / maxQtd * 100) : 0;
            const percent = totalQtd > 0 ? ((t.quantidade || 0) / totalQtd * 100).toFixed(1) : 0;
            return `
              <div class="tamanho-bar-container">
                <div class="tamanho-bar" style="height: ${Math.max(altura, 5)}%;" title="${t.tamanho}: ${formatarNumero(t.quantidade)} (${percent}%)">
                  <span class="tamanho-qtd">${formatarNumero(t.quantidade || 0)}</span>
                </div>
                <span class="tamanho-label">${t.tamanho}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

    } catch (error) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar</p></div>';
    }
  }

  // Comparativo

  async function carregarComparativo() {
    try {
      const url = `${db.baseURL}/relatorio/comparativo?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      const comp = await response.json();

      const atual = comp.atual || {};
      const anterior = comp.anterior || {};

      atualizarComparativoItem('Pedidos', atual.pedidos, anterior.pedidos);
      atualizarComparativoItem('Itens', atual.itens, anterior.itens);
      atualizarComparativoItem('Clientes', atual.clientes, anterior.clientes);
      atualizarComparativoTaxa(atual.taxaEntrega, anterior.taxaEntrega);

    } catch (error) {
      atualizarComparativoItem('Pedidos', 0, 0);
      atualizarComparativoItem('Itens', 0, 0);
      atualizarComparativoItem('Clientes', 0, 0);
      atualizarComparativoTaxa(0, 0);
    }
  }

  function atualizarComparativoItem(tipo, atual, anterior) {
    const prefix = `comp${tipo}`;
    const atualEl = document.getElementById(`${prefix}Atual`);
    const anteriorEl = document.getElementById(`${prefix}Anterior`);
    const arrowEl = document.getElementById(`${prefix}Arrow`);
    const percentEl = document.getElementById(`${prefix}Percent`);

    if (!atualEl) return;

    const atualVal = atual || 0;
    const anteriorVal = anterior || 0;

    atualEl.textContent = formatarNumero(atualVal);
    if (anteriorEl) anteriorEl.textContent = formatarNumero(anteriorVal);

    const diff = atualVal - anteriorVal;
    const percent = anteriorVal > 0 ? Math.round((diff / anteriorVal) * 100) : (atualVal > 0 ? 100 : 0);

    if (arrowEl && percentEl) {
      if (diff > 0) {
        arrowEl.innerHTML = '<i class="fas fa-arrow-up"></i>';
        arrowEl.className = 'comp-arrow up';
        percentEl.className = 'comp-percent up';
        percentEl.textContent = `+${percent}%`;
      } else if (diff < 0) {
        arrowEl.innerHTML = '<i class="fas fa-arrow-down"></i>';
        arrowEl.className = 'comp-arrow down';
        percentEl.className = 'comp-percent down';
        percentEl.textContent = `${percent}%`;
      } else {
        arrowEl.innerHTML = '<i class="fas fa-minus"></i>';
        arrowEl.className = 'comp-arrow neutral';
        percentEl.className = 'comp-percent neutral';
        percentEl.textContent = '0%';
      }
    }
  }

  function atualizarComparativoTaxa(atual, anterior) {
    const atualEl = document.getElementById('compTaxaAtual');
    const anteriorEl = document.getElementById('compTaxaAnterior');
    const arrowEl = document.getElementById('compTaxaArrow');
    const percentEl = document.getElementById('compTaxaPercent');

    if (!atualEl) return;

    const atualVal = atual || 0;
    const anteriorVal = anterior || 0;

    atualEl.textContent = `${atualVal}%`;
    if (anteriorEl) anteriorEl.textContent = `${anteriorVal}%`;

    const diff = atualVal - anteriorVal;

    if (arrowEl && percentEl) {
      if (diff > 0) {
        arrowEl.innerHTML = '<i class="fas fa-arrow-up"></i>';
        arrowEl.className = 'comp-arrow up';
        percentEl.className = 'comp-percent up';
        percentEl.textContent = `+${diff}pp`;
      } else if (diff < 0) {
        arrowEl.innerHTML = '<i class="fas fa-arrow-down"></i>';
        arrowEl.className = 'comp-arrow down';
        percentEl.className = 'comp-percent down';
        percentEl.textContent = `${diff}pp`;
      } else {
        arrowEl.innerHTML = '<i class="fas fa-minus"></i>';
        arrowEl.className = 'comp-arrow neutral';
        percentEl.className = 'comp-percent neutral';
        percentEl.textContent = '0pp';
      }
    }
  }

  // Exportações

  function imprimirRelatorio() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    const periodo = getPeriodoNome();
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const entregues = relatorioAtual.fichasEntregues || 0;
    const pendentes = relatorioAtual.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Produção - ${periodo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
        .header .periodo { font-size: 18px; color: #6b7280; }
        .header .data-geracao { font-size: 12px; color: #9ca3af; margin-top: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; }
        .stat-card.green { border-left: 5px solid #10b981; }
        .stat-card.orange { border-left: 5px solid #f59e0b; }
        .stat-card.blue { border-left: 5px solid #3b82f6; }
        .stat-card.purple { border-left: 5px solid #8b5cf6; }
        .stat-card .label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
        .stat-card .value { font-size: 36px; font-weight: 700; color: #1f2937; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
        .two-columns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .info-box { background: #f9fafb; border-radius: 10px; padding: 20px; }
        .info-box .title { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
        .info-box .content { font-size: 20px; font-weight: 600; color: #1f2937; }
        .info-box .subtitle { font-size: 14px; color: #9ca3af; }
        .taxa-box { text-align: center; }
        .taxa-valor { font-size: 48px; font-weight: 700; color: ${taxa >= 80 ? '#10b981' : taxa >= 50 ? '#f59e0b' : '#ef4444'}; }
        .taxa-legenda { color: #6b7280; font-size: 14px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        @media print { body { padding: 20px; } .stat-card { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Relatório de Produção</h1>
        <div class="periodo">${periodo}</div>
        <div class="data-geracao">Gerado em: ${dataGeracao}</div>
    </div>
    <div class="stats-grid">
        <div class="stat-card green"><div class="label">Pedidos Entregues</div><div class="value">${entregues}</div></div>
        <div class="stat-card orange"><div class="label">Pedidos Pendentes</div><div class="value">${pendentes}</div></div>
        <div class="stat-card blue"><div class="label">Itens Confeccionados</div><div class="value">${formatarNumero(relatorioAtual.itensConfeccionados || 0)}</div></div>
        <div class="stat-card purple"><div class="label">Novos Clientes</div><div class="value">${relatorioAtual.novosClientes || 0}</div></div>
    </div>
    <div class="section">
        <div class="section-title">Detalhes</div>
        <div class="two-columns">
            <div class="info-box">
                <div class="title">🏆 Vendedor Destaque</div>
                <div class="content">${relatorioAtual.topVendedor || 'Nenhum'}</div>
                <div class="subtitle">${relatorioAtual.topVendedorTotal || 0} vendas no período</div>
            </div>
            <div class="info-box taxa-box">
                <div class="title">📈 Taxa de Entrega</div>
                <div class="taxa-valor">${taxa}%</div>
                <div class="taxa-legenda">${entregues} de ${total} pedidos entregues</div>
            </div>
        </div>
    </div>
    <div class="footer">Sistema de Fichas Técnicas • Relatório gerado automaticamente</div>
    <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>
    `);
    printWindow.document.close();
  }

  async function exportarPDF() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    if (typeof window.jspdf === 'undefined') {
      mostrarToast('Carregando biblioteca PDF...', 'info');
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const periodo = getPeriodoNome();
      const dataGeracao = new Date().toLocaleString('pt-BR');
      const entregues = relatorioAtual.fichasEntregues || 0;
      const pendentes = relatorioAtual.fichasPendentes || 0;
      const total = entregues + pendentes;
      const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

      doc.setFont('helvetica');
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Relatório de Produção', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text(periodo, 105, 28, { align: 'center' });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${dataGeracao}`, 105, 45, { align: 'center' });

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Resumo do Período', 20, 62);

      const cardY = 70;
      const cardWidth = 40;
      const cardHeight = 30;
      const cardGap = 5;

      doc.setFillColor(209, 250, 229);
      doc.roundedRect(20, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(8);
      doc.text('Entregues', 40, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(entregues), 40, cardY + 23, { align: 'center' });

      doc.setFillColor(254, 243, 199);
      doc.roundedRect(20 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(217, 119, 6);
      doc.setFontSize(8);
      doc.text('Pendentes', 40 + cardWidth + cardGap, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(pendentes), 40 + cardWidth + cardGap, cardY + 23, { align: 'center' });

      doc.setFillColor(219, 234, 254);
      doc.roundedRect(20 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(8);
      doc.text('Itens', 40 + (cardWidth + cardGap) * 2, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(relatorioAtual.itensConfeccionados || 0), 40 + (cardWidth + cardGap) * 2, cardY + 23, { align: 'center' });

      doc.setFillColor(237, 233, 254);
      doc.roundedRect(20 + (cardWidth + cardGap) * 3, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(8);
      doc.text('Novos Clientes', 40 + (cardWidth + cardGap) * 3, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(relatorioAtual.novosClientes || 0), 40 + (cardWidth + cardGap) * 3, cardY + 23, { align: 'center' });

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Vendedor Destaque', 20, 120);

      doc.setFillColor(249, 250, 251);
      doc.roundedRect(20, 125, 80, 25, 3, 3, 'F');

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.text(relatorioAtual.topVendedor || 'Nenhum', 25, 137);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${relatorioAtual.topVendedorTotal || 0} vendas`, 25, 145);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Taxa de Entrega', 110, 120);

      doc.setFillColor(249, 250, 251);
      doc.roundedRect(110, 125, 80, 25, 3, 3, 'F');

      if (taxa >= 80) {
        doc.setTextColor(16, 185, 129);
      } else if (taxa >= 50) {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(239, 68, 68);
      }

      doc.setFontSize(20);
      doc.text(`${taxa}%`, 150, 140, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${entregues} de ${total} pedidos`, 150, 148, { align: 'center' });

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, 190, 270);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text('Sistema de Fichas Técnicas - Relatório gerado automaticamente', 105, 280, { align: 'center' });

      const nomeArquivo = `relatorio-${periodo.replace(/[\s\/]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);

      mostrarToast('PDF exportado com sucesso!', 'success');
    } catch (error) {
      mostrarErro('Erro ao gerar PDF. Tente novamente.');
    }
  }

  function carregarScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function exportarExcel() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    const periodo = getPeriodoNome();
    const csv = [];

    csv.push(['RELATÓRIO DE PRODUÇÃO']);
    csv.push(['Período:', periodo]);
    csv.push(['Data de Geração:', new Date().toLocaleString('pt-BR')]);
    csv.push([]);
    csv.push(['RESUMO PRINCIPAL']);
    csv.push(['Pedidos Entregues:', relatorioAtual.fichasEntregues || 0]);
    csv.push(['Pedidos Pendentes:', relatorioAtual.fichasPendentes || 0]);
    csv.push(['Itens Confeccionados:', relatorioAtual.itensConfeccionados || 0]);
    csv.push(['Novos Clientes:', relatorioAtual.novosClientes || 0]);
    csv.push([]);
    csv.push(['VENDEDOR DESTAQUE']);
    csv.push(['Nome:', relatorioAtual.topVendedor || '-']);
    csv.push(['Vendas:', relatorioAtual.topVendedorTotal || 0]);
    csv.push([]);
    csv.push(['TAXA DE ENTREGA']);

    const entregues = relatorioAtual.fichasEntregues || 0;
    const pendentes = relatorioAtual.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

    csv.push(['Taxa:', `${taxa}%`]);
    csv.push(['Entregues:', entregues]);
    csv.push(['Total:', total]);

    if (dadosVendedores.length > 0) {
      csv.push([]);
      csv.push(['ANÁLISE POR VENDEDOR']);
      csv.push(['Vendedor', 'Pedidos', 'Itens', 'Entregues', 'Pendentes', 'Taxa Entrega']);
      dadosVendedores.forEach(v => {
        const taxaV = v.totalPedidos > 0 ? Math.round((v.entregues / v.totalPedidos) * 100) : 0;
        csv.push([v.vendedor, v.totalPedidos, v.totalItens, v.entregues, v.pendentes, `${taxaV}%`]);
      });
    }

    if (dadosMateriais.length > 0) {
      csv.push([]);
      csv.push(['ANÁLISE POR MATERIAL']);
      csv.push(['Material', 'Pedidos', 'Itens']);
      dadosMateriais.forEach(m => {
        csv.push([m.material, m.totalPedidos, m.totalItens]);
      });
    }

    const csvContent = csv.map(row => row.join(';')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${periodo.replace(/[\s\/]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    mostrarToast('Excel exportado com sucesso!', 'success');
  }

  // Utilitários

  function getPeriodoNome() {
    if (periodoAtual === 'mes') return 'Este Mês';
    if (periodoAtual === 'ano') return 'Este Ano';

    const inicio = document.getElementById('relDataInicio')?.value;
    const fim = document.getElementById('relDataFim')?.value;
    return `${formatarData(inicio)} a ${formatarData(fim)}`;
  }

  function formatarNumero(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
  }

  function formatarData(dataStr) {
    if (!dataStr) return '-';
    try {
      const data = new Date(dataStr + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
    } catch {
      return dataStr;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function mostrarErro(mensagem) {
    mostrarToast(mensagem, 'error');
  }

  function mostrarToast(mensagem, tipo = 'info') {
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast(mensagem, tipo);
    }
  }
})();