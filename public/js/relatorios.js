/**
 * Relatórios e Estatísticas
 */
(function () {
  'use strict';

  let periodoAtual = 'mes';
  let relatorioAtual = null;
  let dadosVendedores = [];
  let dadosMateriais = [];
  let dadosProdutos = [];
  let catalogoTamanhos = null;
  let catalogoRotulosTamanhos = null;
  let catalogoMateriais = [];
  let catalogoProdutos = [];

  function getCssVar(token, fallback = '') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value || fallback;
  }
  // Regras de equivalencia de tamanhos (canônico -> variações equivalentes).
  // Exemplo: EG (54) absorve XGG (54) e aparece apenas como EG (54) no relatório.
  const REGRAS_EQUIVALENCIA_TAMANHOS = Object.freeze([
    { canonico: 'BABY PP', equivalentes: ['BL PP'] },
    { canonico: 'BABY P', equivalentes: ['BL P'] },
    { canonico: 'BABY M', equivalentes: ['BL M'] },
    { canonico: 'BABY G', equivalentes: ['BL G'] },
    { canonico: 'BABY GG', equivalentes: ['BL GG'] },
    { canonico: 'BABY XG', equivalentes: ['BL XG', 'BABY XG (52)'] },
    { canonico: 'BABY EG', equivalentes: ['BL EG', 'BABY XGG (54)'] },
    { canonico: 'BABY EGG', equivalentes: ['BL EGG', 'BABY XXGG (56)'] },
    { canonico: 'BABY EEGG', equivalentes: ['BL EEGG', 'BABY XXXGG (58)'] },
    { canonico: 'XG (52)', equivalentes: ['XG', '52', 'G1'] },
    { canonico: 'EG (54)', equivalentes: ['XGG (54)', 'EG', '54', 'G2'] },
    { canonico: 'EGG (56)', equivalentes: ['XXGG (56)', 'XXGG', 'EGG', '56', 'G3'] },
    { canonico: 'EEGG (58)', equivalentes: ['XXXGG (58)', '58', 'G4'] },
    { canonico: 'ESP1 (60)', equivalentes: ['60', 'G5'] },
    { canonico: 'ESP2 (62)', equivalentes: ['62', 'G6'] },
    { canonico: 'ESP3 (64)', equivalentes: ['64', 'G7'] }
  ]);
  const MAPA_EQUIVALENCIA_TAMANHOS = criarMapaEquivalenciaTamanhos(REGRAS_EQUIVALENCIA_TAMANHOS);
  const ROTULOS_TAMANHO_CANONICO = criarMapaRotulosCanonicos(REGRAS_EQUIVALENCIA_TAMANHOS);

  document.addEventListener('DOMContentLoaded', async () => {
    await initRelatorios();
  });

  async function initRelatorios() {
    try {
      if (typeof db !== 'undefined' && db.init) {
        await db.init();
      }

      await carregarCatalogoTamanhos();

      initEventListeners();
      initEfeitosScroll();
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

    document.getElementById('filtroMaterialInput')?.addEventListener('input', (e) => {
      filtrarPorMaterial(e.target.value);
    });

    document.getElementById('filtroProdutoInput')?.addEventListener('input', (e) => {
      filtrarPorProduto(e.target.value);
    });

    document.getElementById('btnExportarPDF')?.addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
    document.getElementById('btnImprimir')?.addEventListener('click', imprimirRelatorio);
  }

  function buildUrlParams() {
    const params = new URLSearchParams();
    params.set('periodo', periodoAtual);
    if (periodoAtual === 'customizado') {
      const dataInicio = document.getElementById('relDataInicio')?.value;
      const dataFim = document.getElementById('relDataFim')?.value;
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
    }

    return params.toString();
  }

  async function carregarCatalogoTamanhos() {
    try {
      const response = await fetch('data/catalogo.json');
      if (!response.ok) throw new Error('Erro ao carregar catálogo');

      const catalogo = await response.json();
      const lista = Array.isArray(catalogo?.tamanhos) ? catalogo.tamanhos : [];
      const listaMateriais = Array.isArray(catalogo?.materiais) ? catalogo.materiais : [];
      const listaProdutos = Array.isArray(catalogo?.produtos) ? catalogo.produtos : [];
      const tamanhosPermitidos = new Set();
      const rotulosPorChaveCanonica = new Map();
      const rotulosCatalogoNormalizados = new Map();

      lista.forEach(tamanho => {
        const rotuloOriginal = String(tamanho || '').trim();
        const tamanhoNormalizado = normalizarTamanho(tamanho);
        const chaveCanonica = obterChaveTamanhoCanonica(tamanho);
        if (!chaveCanonica) return;

        tamanhosPermitidos.add(chaveCanonica);
        if (!rotulosPorChaveCanonica.has(chaveCanonica)) {
          rotulosPorChaveCanonica.set(chaveCanonica, rotuloOriginal);
        }
        if (tamanhoNormalizado && !rotulosCatalogoNormalizados.has(tamanhoNormalizado)) {
          rotulosCatalogoNormalizados.set(tamanhoNormalizado, rotuloOriginal);
        }
      });

      // Se o nome canônico também existir no catálogo, ele vira o rótulo preferencial.
      ROTULOS_TAMANHO_CANONICO.forEach((_, chaveCanonica) => {
        if (rotulosCatalogoNormalizados.has(chaveCanonica)) {
          rotulosPorChaveCanonica.set(chaveCanonica, rotulosCatalogoNormalizados.get(chaveCanonica));
        }
      });

      catalogoTamanhos = tamanhosPermitidos;
      catalogoRotulosTamanhos = rotulosPorChaveCanonica;
      catalogoMateriais = listaMateriais
        .map(m => String(m?.nome || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      catalogoProdutos = listaProdutos
        .map(p => String(p || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      preencherDatalist('materiaisCatalogoList', catalogoMateriais);
      preencherDatalist('produtosCatalogoList', catalogoProdutos);
    } catch (error) {
      catalogoTamanhos = null;
      catalogoRotulosTamanhos = null;
      catalogoMateriais = [];
      catalogoProdutos = [];
    }
  }

  function normalizarTamanho(valor) {
    return String(valor || '').trim().toUpperCase();
  }

  function criarMapaEquivalenciaTamanhos(regras) {
    const mapa = new Map();
    (Array.isArray(regras) ? regras : []).forEach(regra => {
      const canonico = normalizarTamanho(regra?.canonico);
      if (!canonico) return;

      mapa.set(canonico, canonico);
      (Array.isArray(regra?.equivalentes) ? regra.equivalentes : []).forEach(eq => {
        const equivalente = normalizarTamanho(eq);
        if (equivalente) mapa.set(equivalente, canonico);
      });
    });
    return mapa;
  }

  function criarMapaRotulosCanonicos(regras) {
    const mapa = new Map();
    (Array.isArray(regras) ? regras : []).forEach(regra => {
      const canonicoNormalizado = normalizarTamanho(regra?.canonico);
      const canonicoRotulo = String(regra?.canonico || '').trim();
      if (canonicoNormalizado && canonicoRotulo) {
        mapa.set(canonicoNormalizado, canonicoRotulo);
      }
    });
    return mapa;
  }

  function obterChaveTamanhoCanonica(tamanho) {
    const tamanhoNormalizado = normalizarTamanho(tamanho);
    if (!tamanhoNormalizado) return '';
    return MAPA_EQUIVALENCIA_TAMANHOS.get(tamanhoNormalizado) || tamanhoNormalizado;
  }

  function obterRotuloTamanhoCanonico(tamanho) {
    const chaveCanonica = obterChaveTamanhoCanonica(tamanho);
    if (!chaveCanonica) return '';

    if (catalogoRotulosTamanhos && catalogoRotulosTamanhos.has(chaveCanonica)) {
      return catalogoRotulosTamanhos.get(chaveCanonica);
    }

    return ROTULOS_TAMANHO_CANONICO.get(chaveCanonica) || chaveCanonica;
  }

  function consolidarTamanhosEquivalentes(listaTamanhos) {
    const agrupados = new Map();

    (Array.isArray(listaTamanhos) ? listaTamanhos : []).forEach(item => {
      const chaveCanonica = obterChaveTamanhoCanonica(item?.tamanho);
      if (!chaveCanonica) return;

      const quantidade = Number(item?.quantidade) || 0;
      if (!agrupados.has(chaveCanonica)) {
        agrupados.set(chaveCanonica, {
          tamanho: obterRotuloTamanhoCanonico(item?.tamanho),
          quantidade: 0
        });
      }

      agrupados.get(chaveCanonica).quantidade += quantidade;
    });

    return Array.from(agrupados.values());
  }

  async function carregarRelatorio() {
    try {
      setRelatoriosLoadingState(true);
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
      atualizarTaxaEntrega(relatorioAtual);

      await Promise.all([
        carregarDadosVendedores(),
        carregarDadosMateriais(),
        carregarRankingProdutos(),
        carregarRankingClientes(),
        carregarDistribuicaoTamanhos(),
        carregarComparativo(),
        carregarInsightsVisuais()
      ]);

    } catch (error) {
      mostrarErro('Erro ao carregar relatório');
    } finally {
      setRelatoriosLoadingState(false);
    }
  }

  // Estatísticas Principais

  function atualizarEstatisticas(dados) {
    const statPedidosEntregues = document.getElementById('statPedidosEntregues');
    const statPedidosPendentes = document.getElementById('statPedidosPendentes');
    const statItensConfeccionados = document.getElementById('statItensConfeccionados');
    const statNovosClientes = document.getElementById('statNovosClientes');

    if (statPedidosEntregues) animateCounter(statPedidosEntregues, dados.fichasEntregues || 0);
    if (statPedidosPendentes) animateCounter(statPedidosPendentes, dados.fichasPendentes || 0);
    if (statItensConfeccionados) animateCounter(statItensConfeccionados, dados.itensConfeccionados || 0);
    if (statNovosClientes) animateCounter(statNovosClientes, dados.novosClientes || 0);
  }

  function atualizarResumoEquipe(vendedores) {
    const vendedoresAtivosEl = document.getElementById('equipeVendedoresAtivos');
    const fichasPeriodoEl = document.getElementById('equipeFichasPeriodo');
    if (!vendedoresAtivosEl || !fichasPeriodoEl) return;

    const vendedoresAtivos = Array.isArray(vendedores) ? vendedores.length : 0;
    const fichasNoPeriodo = Array.isArray(vendedores)
      ? vendedores.reduce((soma, v) => soma + (v.totalPedidos || 0), 0)
      : 0;

    animateCounter(vendedoresAtivosEl, vendedoresAtivos);
    animateCounter(fichasPeriodoEl, fichasNoPeriodo);
  }

  function atualizarTaxaEntrega(dados) {
    const entregues = dados.fichasEntregues || 0;
    const pendentes = dados.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.min(100, Math.round((entregues / total) * 100)) : 0;

    const taxaValue = document.getElementById('taxaValue');
    const taxaEntregues = document.getElementById('taxaEntregues');
    const taxaTotal = document.getElementById('taxaTotal');
    const circle = document.getElementById('taxaProgress');

    if (taxaValue) animateCounter(taxaValue, taxa, { suffix: '%' });
    if (taxaEntregues) animateCounter(taxaEntregues, entregues);
    if (taxaTotal) animateCounter(taxaTotal, total);

    if (circle) {
      const circumference = 283;
      const offset = circumference - (taxa / 100) * circumference;
      circle.style.strokeDashoffset = offset;

      if (taxa >= 80) {
        circle.style.stroke = getCssVar('--color-success', getCssVar('--color-success', 'green'));
      } else if (taxa >= 50) {
        circle.style.stroke = getCssVar('--color-warning', getCssVar('--color-warning', 'orange'));
      } else {
        circle.style.stroke = getCssVar('--color-danger', getCssVar('--color-danger', 'red'));
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
        pendentes: Math.max(0, (v.total_pedidos || v.totalPedidos || 0) - (v.entregues || 0))
      }));

      dadosVendedores.sort((a, b) => String(a.vendedor || '').localeCompare(String(b.vendedor || ''), 'pt-BR'));

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
      atualizarResumoEquipe(dadosVendedores);

    } catch (error) {
      if (loading) loading.style.display = 'none';
      if (empty) empty.style.display = 'block';
      atualizarResumoEquipe([]);
    }
  }


  function renderizarVendedores(vendedores) {
    const container = document.getElementById('vendedoresContainer');
    if (!container) return;

    if (vendedores.length === 0) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-user-slash"></i><p>Nenhum vendedor encontrado</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="vendedores-report-header">
        <span>Vendedor</span>
        <span>Fichas</span>
        <span>Itens</span>
        <span>Entregues</span>
        <span>Pendentes</span>
        <span>Taxa de Entrega</span>
      </div>
      ${vendedores.map(v => {
        const taxaEntrega = v.totalPedidos > 0 ? Math.min(100, Math.round((v.entregues / v.totalPedidos) * 100)) : 0;
        const taxaClass = taxaEntrega >= 80 ? 'taxa-alta' : taxaEntrega >= 50 ? 'taxa-media' : 'taxa-baixa';

        return `
          <div class="vendedores-report-row">
            <span class="vendedores-report-name">${escapeHtml(v.vendedor)}</span>
            <span>${v.totalPedidos || 0}</span>
            <span>${formatarNumero(v.totalItens || 0)}</span>
            <span>${Math.min(v.entregues || 0, v.totalPedidos || 0)}</span>
            <span>${v.pendentes || 0}</span>
            <span><span class="ranking-badge ${taxaClass}">${taxaEntrega}%</span></span>
          </div>
        `;
      }).join('')}
    `;
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

      if (loading) loading.style.display = 'none';

      if (dadosMateriais.length === 0) {
        if (empty) empty.style.display = 'block';
      } else {
        if (container) container.style.display = 'block';
        renderizarMateriais(dadosMateriais);
        filtrarPorMaterial(document.getElementById('filtroMaterialInput')?.value || '');
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
    const maxItens = Math.max(...materiais.map(m => m.totalItens || 0), 1);

    container.innerHTML = `
      <div class="materiais-horizontal-list">
        ${materiais.map(m => {
      const porcentagem = totalItens > 0 ? ((m.totalItens || 0) / totalItens * 100) : 0;
      const largura = maxItens > 0 ? ((m.totalItens || 0) / maxItens * 100) : 0;

      return `
          <div class="material-horizontal-item" title="${escapeHtml(m.material)}: ${formatarNumero(m.totalItens || 0)} itens (${porcentagem.toFixed(1)}%)">
            <div class="material-horizontal-header">
              <span class="material-horizontal-label">${escapeHtml(m.material)}</span>
              <span class="material-horizontal-value">${formatarNumero(m.totalItens || 0)} itens</span>
            </div>
            <div class="material-horizontal-meta">
              <span>${m.totalPedidos || 0} fichas</span>
              <span>${porcentagem.toFixed(1)}% do total</span>
            </div>
            <div class="material-horizontal-track">
              <div class="material-horizontal-fill" data-width="${Math.max(largura, 3)}" style="width: 0%;"></div>
            </div>
          </div>
        `;
    }).join('')}
      </div>
    `;
    animarBarrasQuandoVisivel(container, '.material-horizontal-fill', 'width', '%');
  }

  function filtrarPorMaterial(material) {
    const termo = normalizarTextoBusca(material);
    if (!termo) {
      renderizarMateriais(dadosMateriais);
      return;
    }

    const filtrado = dadosMateriais.filter(m => normalizarTextoBusca(m.material).includes(termo));
    renderizarMateriais(filtrado);
  }

  // Rankings

  async function carregarRankingProdutos() {
    const container = document.getElementById('produtosRanking');
    if (!container) return;

    try {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Carregando...</p></div>';
      const url = `${db.baseURL}/relatorio/produtos?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      const produtos = await response.json();
      dadosProdutos = (Array.isArray(produtos) ? produtos : []).map(p => ({
        produto: p.produto || 'Não especificado',
        quantidade: p.quantidade || 0
      }));

      if (dadosProdutos.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-tshirt"></i><p>Nenhum produto</p></div>';
        return;
      }

      renderizarRankingProdutos(dadosProdutos.slice(0, 5));
      filtrarPorProduto(document.getElementById('filtroProdutoInput')?.value || '');

    } catch (error) {
      dadosProdutos = [];
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar</p></div>';
    }
  }

  function renderizarRankingProdutos(produtos) {
    const container = document.getElementById('produtosRanking');
    if (!container) return;

    if (!Array.isArray(produtos) || produtos.length === 0) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-search"></i><p>Nenhum produto encontrado</p></div>';
      return;
    }

    container.innerHTML = produtos.map((p, i) => `
      <div class="mini-ranking-item">
        <span class="mini-pos">${i + 1}º</span>
        <span class="mini-name">${escapeHtml(p.produto || 'Não especificado')}</span>
        <span class="mini-value">${formatarNumero(p.quantidade || 0)}</span>
      </div>
    `).join('');
  }

  function filtrarPorProduto(produto) {
    const termo = normalizarTextoBusca(produto);
    if (!termo) {
      renderizarRankingProdutos(dadosProdutos.slice(0, 5));
      return;
    }

    const filtrados = dadosProdutos.filter(p => normalizarTextoBusca(p.produto).includes(termo));
    renderizarRankingProdutos(filtrados.slice(0, 10));
  }

  async function carregarRankingClientes() {
    const container = document.getElementById('clientesRanking');
    if (!container) return;

    try {
      const url = `${db.baseURL}/relatorio/clientes-top?${buildUrlParams()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro');

      let clientes = await response.json();

      clientes.sort((a, b) => {
        const totalA = a.total_pedidos || a.totalPedidos || 0;
        const totalB = b.total_pedidos || b.totalPedidos || 0;
        return totalB - totalA;
      });

      if (clientes.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-users"></i><p>Nenhum cliente</p></div>';
        return;
      }

      container.innerHTML = clientes.slice(0, 5).map((c, i) => `
        <div class="mini-ranking-item">
          <span class="mini-pos">${i + 1}º</span>
          <span class="mini-name">${escapeHtml(c.cliente)}</span>
          <span class="mini-value">${c.total_pedidos || c.totalPedidos || 0} fichas</span>
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

      const tamanhosFiltrados = consolidarTamanhosEquivalentes(tamanhos)
        .filter(t => {
          if (!catalogoTamanhos || catalogoTamanhos.size === 0) return true;
          return catalogoTamanhos.has(obterChaveTamanhoCanonica(t?.tamanho));
        })
        .sort((a, b) => (b?.quantidade || 0) - (a?.quantidade || 0));

      if (tamanhosFiltrados.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-ruler"></i><p>Nenhum dado de tamanho</p></div>';
        return;
      }

      const maxQtd = Math.max(...tamanhosFiltrados.map(t => t.quantidade || 0), 1);
      const totalQtd = tamanhosFiltrados.reduce((sum, t) => sum + (t.quantidade || 0), 0);

      container.innerHTML = `
        <div class="tamanhos-horizontal-list">
          ${tamanhosFiltrados.map(t => {
        const largura = maxQtd > 0 ? ((t.quantidade || 0) / maxQtd * 100) : 0;
        const percent = totalQtd > 0 ? ((t.quantidade || 0) / totalQtd * 100).toFixed(1) : 0;
        return `
              <div class="tamanho-horizontal-item" title="${t.tamanho}: ${formatarNumero(t.quantidade)} (${percent}%)">
                <div class="tamanho-horizontal-header">
                  <span class="tamanho-horizontal-label">${t.tamanho}</span>
                  <span class="tamanho-horizontal-value">${formatarNumero(t.quantidade || 0)} (${percent}%)</span>
                </div>
                <div class="tamanho-horizontal-track">
                  <div class="tamanho-horizontal-fill" data-width="${Math.max(largura, 3)}" style="width: 0%;"></div>
                </div>
              </div>
            `;
      }).join('')}
        </div>
      `;
      animarBarrasQuandoVisivel(container, '.tamanho-horizontal-fill', 'width', '%');

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
    const taxa = total > 0 ? Math.min(100, Math.round((entregues / total) * 100)) : 0;
    const printBodyColor = getCssVar('--color-report-body', getCssVar('--color-dark-1', 'black'));
    const printHeadingColor = getCssVar('--color-report-heading', getCssVar('--color-dark-1', 'black'));
    const printMutedColor = getCssVar('--color-report-muted', getCssVar('--color-dark-2', 'gray'));
    const printBorderColor = getCssVar('--color-light-1', getCssVar('--color-light-1', 'lightgray'));
    const printInfoBg = getCssVar('--color-neutral-50', getCssVar('--color-light-4', 'whitesmoke'));
    const printPrimary = getCssVar('--color-primary-main', getCssVar('--color-primary-main', 'steelblue'));
    const printPrimaryDark = getCssVar('--color-primary-darker', getCssVar('--color-primary-darker', 'slateblue'));
    const printSuccess = getCssVar('--color-success', getCssVar('--color-success', 'green'));
    const printWarning = getCssVar('--color-warning', getCssVar('--color-warning', 'orange'));
    const printDanger = getCssVar('--color-danger', getCssVar('--color-danger', 'red'));
    const taxaColor = taxa >= 80 ? printSuccess : taxa >= 50 ? printWarning : printDanger;
    const printFont = getCssVar('--font-family-base', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Produção - ${periodo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${printFont}; padding: 40px; color: ${printBodyColor}; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid ${printPrimary}; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 28px; color: ${printPrimaryDark}; margin-bottom: 8px; }
        .header .periodo { font-size: 18px; color: ${printMutedColor}; }
        .header .data-geracao { font-size: 12px; color: ${printMutedColor}; margin-top: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { border: 2px solid ${printBorderColor}; border-radius: 12px; padding: 20px; text-align: center; }
        .stat-card.green { border-left: 5px solid ${printSuccess}; }
        .stat-card.orange { border-left: 5px solid ${printWarning}; }
        .stat-card.blue { border-left: 5px solid ${printPrimary}; }
        .stat-card.purple { border-left: 5px solid ${printPrimaryDark}; }
        .stat-card .label { font-size: 14px; color: ${printMutedColor}; margin-bottom: 8px; }
        .stat-card .value { font-size: 36px; font-weight: 700; color: ${printHeadingColor}; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 600; color: ${printHeadingColor}; border-bottom: 2px solid ${printBorderColor}; padding-bottom: 10px; margin-bottom: 15px; }
        .two-columns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .info-box { background: ${printInfoBg}; border-radius: 10px; padding: 20px; }
        .info-box .title { font-size: 14px; color: ${printMutedColor}; margin-bottom: 10px; }
        .info-box .content { font-size: 20px; font-weight: 600; color: ${printHeadingColor}; }
        .info-box .subtitle { font-size: 14px; color: ${printMutedColor}; }
        .taxa-box { text-align: center; }
        .taxa-valor { font-size: 48px; font-weight: 700; color: ${taxaColor}; }
        .taxa-legenda { color: ${printMutedColor}; font-size: 14px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: ${printMutedColor}; border-top: 1px solid ${printBorderColor}; padding-top: 20px; }
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
        <div class="stat-card green"><div class="label">Fichas Entregues</div><div class="value">${entregues}</div></div>
        <div class="stat-card orange"><div class="label">Fichas Pendentes</div><div class="value">${pendentes}</div></div>
        <div class="stat-card blue"><div class="label">Itens Confeccionados</div><div class="value">${formatarNumero(relatorioAtual.itensConfeccionados || 0)}</div></div>
        <div class="stat-card purple"><div class="label">Novos Clientes</div><div class="value">${relatorioAtual.novosClientes || 0}</div></div>
    </div>
    <div class="section">
        <div class="section-title">Detalhes</div>
        <div class="two-columns">
            <div class="info-box">
                <div class="title">🏆 Vendedor Destaque</div>
                <div class="content">${relatorioAtual.topVendedor || 'Nenhum'}</div>
                <div class="subtitle">${relatorioAtual.topVendedorTotal || 0} fichas no período</div>
            </div>
            <div class="info-box taxa-box">
                <div class="title">📈 Taxa de Entrega</div>
                <div class="taxa-valor">${taxa}%</div>
                <div class="taxa-legenda">${entregues} de ${total} fichas entregues</div>
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

    try {
      if (typeof window.jspdf === 'undefined') {
        await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.15/jspdf.plugin.autotable.min.js');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (typeof window.jspdf === 'undefined') {
        throw new Error('Biblioteca jsPDF não carregada');
      }

      const periodo = getPeriodoNome();

      const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const dataGeracao = new Date().toLocaleString('pt-BR');
      const entregues = relatorioAtual.fichasEntregues || 0;
      const pendentes = relatorioAtual.fichasPendentes || 0;
      const total = entregues + pendentes;
      const taxa = total > 0 ? Math.min(100, Math.round((entregues / total) * 100)) : 0;

      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(33, 97, 140);
      doc.text('Relatório de Produção | Priscila Confecções & Uniformes', centerX, 20, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Período: ${periodo}`, centerX, 30, { align: 'center' });
      doc.text(`Gerado em: ${dataGeracao}`, centerX, 37, { align: 'center' });

      const summaryData = [
        ['Métrica', 'Total'],
        ['Fichas Entregues', String(entregues)],
        ['Fichas Pendentes', String(pendentes)],
        ['Total de Fichas', String(total)],
        ['Taxa de Entrega', `${taxa}%`],
        ['Itens Confeccionados', String(relatorioAtual.itensConfeccionados || 0)],
        ['Novos Clientes', String(relatorioAtual.novosClientes || 0)]
      ];

      doc.autoTable({
        startY: 50,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [33, 97, 140] },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });

      const topVendedores = (dadosVendedores || [])
        .slice(0, 5)
        .map(v => [
          String(v.vendedor || 'N/A'),
          String(v.totalPedidos || 0),
          String(v.totalItens || 0),
          String(v.entregues || 0),
          `${v.totalPedidos > 0 ?
            Math.min(100, Math.round((v.entregues / v.totalPedidos) * 100)) : 0}%`
        ]);

      doc.autoTable({
        head: [['Vendedor', 'Fichas', 'Itens', 'Entregues', 'Taxa']],
        body: topVendedores,
        theme: 'striped',
        headStyles: { fillColor: [33, 97, 140] }
      });

      const topMateriais = (dadosMateriais || [])
        .slice(0, 5)
        .map(m => [
          String(m.material || 'N/A'),
          String(m.totalPedidos || 0),
          String(m.totalItens || 0)
        ]);

      doc.autoTable({
        head: [['Material', 'Fichas', 'Itens']],
        body: topMateriais,
        theme: 'striped',
        headStyles: { fillColor: [33, 97, 140] }
      });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Página 1 de 1`, centerX, 287, { align: 'center' });

      doc.save(`relatorio-${periodo.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);

      mostrarToast('PDF exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      mostrarErro(error.message || 'Erro ao gerar PDF');
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

  async function exportarExcel() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    // Carregar biblioteca ExcelJS
    if (typeof ExcelJS === 'undefined') {
      await carregarScript('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const periodo = getPeriodoNome();
      const dataGeracao = new Date().toLocaleString('pt-BR');

      // Calcular métricas principais
      const entregues = relatorioAtual.fichasEntregues || 0;
      const pendentes = relatorioAtual.fichasPendentes || 0;
      const total = entregues + pendentes;
      const taxa = total > 0 ? Math.min(100, Math.round((entregues / total) * 100)) : 0;

      // Metadados do workbook
      workbook.creator = 'Sistema de Produção';
      workbook.created = new Date();

      // ==================== PLANILHA ÚNICA: DASHBOARD ====================
      criarDashboardCompleto(workbook, {
        periodo,
        dataGeracao,
        entregues,
        pendentes,
        total,
        taxa,
        itensConfeccionados: relatorioAtual.itensConfeccionados || 0,
        novosClientes: relatorioAtual.novosClientes || 0,
        topVendedor: relatorioAtual.topVendedor || '-',
        topVendedorTotal: relatorioAtual.topVendedorTotal || 0
      });

      // ==================== PLANILHA 2: DADOS DETALHADOS ====================
      if (relatorioAtual.detalhes && relatorioAtual.detalhes.length > 0) {
        criarPlanilhaDetalhada(workbook, relatorioAtual.detalhes);
      }

      // Gerar e baixar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nomeArquivo = `relatorio-producao-${periodo.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = nomeArquivo;
      link.click();

      mostrarToast('Relatório exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      mostrarErro('Erro ao gerar relatório: ' + error.message);
    }
  }

  // ==================== FUNÇÃO DE DASHBOARD UNIFICADO ====================

  function criarDashboardCompleto(workbook, dados) {
    const worksheet = workbook.addWorksheet('Dashboard', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Configurar larguras das colunas para acomodar 3 tabelas lado a lado
    worksheet.columns = [
      // RESUMO (A-B)
      { width: 28 },
      { width: 22 },
      // Espaço (C)
      { width: 3 },
      // VENDEDORES (D-I)
      { width: 28 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      // Espaço (J)
      { width: 3 },
      // MATERIAIS (K-N)
      { width: 32 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    // ==================== TABELA 1: RESUMO EXECUTIVO (Colunas A-B) ====================

    // Título principal
    const tituloRow = worksheet.addRow(['RELATÓRIO DE PRODUÇÃO']);
    worksheet.mergeCells('A1:B1');
    tituloRow.getCell(1).style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    tituloRow.height = 30;

    worksheet.addRow([]);

    // Informações do período
    addStyledRowRange(worksheet, 3, 'A', 'B', ['Período:', dados.periodo], { boldFirst: true });
    addStyledRowRange(worksheet, 4, 'A', 'B', ['Gerado em:', dados.dataGeracao], { boldFirst: true });
    worksheet.addRow([]);

    // Seção de métricas principais
    const headerMetricas = worksheet.getRow(6);
    headerMetricas.getCell(1).value = 'RESUMO DE DESEMPENHO';
    worksheet.mergeCells('A6:B6');
    headerMetricas.getCell(1).style = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    headerMetricas.height = 25;

    worksheet.addRow([]);

    // Cabeçalho da tabela
    const headerRow = worksheet.getRow(8);
    headerRow.getCell(1).value = 'Métrica';
    headerRow.getCell(2).value = 'Valor';
    headerRow.getCell(1).style = headerRow.getCell(2).style = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    headerRow.height = 20;

    // Dados das métricas
    const metricas = [
      ['Fichas Entregues', dados.entregues],
      ['Fichas Pendentes', dados.pendentes],
      ['Total de Fichas', dados.total],
      ['Taxa de Entrega', `${dados.taxa}%`],
      ['Itens Confeccionados', dados.itensConfeccionados],
      ['Novos Clientes', dados.novosClientes]
    ];

    metricas.forEach((metrica, index) => {
      const rowNum = 9 + index;
      const row = worksheet.getRow(rowNum);
      row.getCell(1).value = metrica[0];
      row.getCell(2).value = metrica[1];

      row.getCell(1).style = {
        font: { size: 10, bold: true },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: getBordaCompleta(),
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' } }
      };

      row.getCell(2).style = {
        font: { size: 10 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: getBordaCompleta(),
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' } }
      };

      // Formatação especial para taxa de entrega
      if (metrica[0] === 'Taxa de Entrega') {
        row.getCell(2).style.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getTaxaColor(dados.taxa) }
        };
        row.getCell(2).style.font = { bold: true, size: 11 };
      }
    });

    worksheet.addRow([]);

    // Vendedor destaque
    const headerVendedor = worksheet.getRow(16);
    headerVendedor.getCell(1).value = 'VENDEDOR DESTAQUE DO PERÍODO';
    worksheet.mergeCells('A16:B16');
    headerVendedor.getCell(1).style = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    headerVendedor.height = 25;

    worksheet.addRow([]);
    addStyledRowRange(worksheet, 18, 'A', 'B', ['Nome', dados.topVendedor], { boldFirst: true });
    addStyledRowRange(worksheet, 19, 'A', 'B', ['Total de Fichas', dados.topVendedorTotal], { boldFirst: true });

    // ==================== TABELA 2: VENDEDORES (Colunas D-I) ====================

    // Título
    const tituloVendedores = worksheet.getRow(1);
    tituloVendedores.getCell(4).value = 'ANÁLISE DE DESEMPENHO POR VENDEDOR';
    worksheet.mergeCells('D1:I1');
    tituloVendedores.getCell(4).style = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    tituloVendedores.height = 28;

    // Cabeçalho
    const headerVend = worksheet.getRow(3);
    const colsVend = ['Vendedor', 'Fichas', 'Itens', 'Entregues', 'Pendentes', 'Taxa Entrega'];
    colsVend.forEach((col, idx) => {
      headerVend.getCell(4 + idx).value = col;
      headerVend.getCell(4 + idx).style = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: getBordaCompleta()
      };
    });
    headerVend.height = 20;

    // Dados
    if (typeof dadosVendedores !== 'undefined' && dadosVendedores.length > 0) {
      dadosVendedores.forEach((v, index) => {
        const taxaV = v.totalPedidos > 0 ?
          Math.min(100, Math.round((v.entregues / v.totalPedidos) * 100)) : 0;

        const rowNum = 4 + index;
        const row = worksheet.getRow(rowNum);

        const valores = [v.vendedor, v.totalPedidos, v.totalItens, v.entregues, v.pendentes, taxaV / 100];
        valores.forEach((val, colIdx) => {
          row.getCell(4 + colIdx).value = val;
          row.getCell(4 + colIdx).style = {
            font: { size: 10 },
            alignment: {
              horizontal: colIdx === 0 ? 'left' : 'center',
              vertical: 'middle'
            },
            border: getBordaCompleta(),
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
            }
          };

          if (colIdx === 5) {
            row.getCell(4 + colIdx).numFmt = '0%';
          }
        });
      });

      // Linha de total
      const totalRowNum = 4 + dadosVendedores.length + 1;
      const totais = calcularTotaisVendedores(dadosVendedores);
      const taxaTotal = totais.pedidos > 0 ?
        Math.min(100, Math.round((totais.entregues / totais.pedidos) * 100)) : 0;

      const totalRow = worksheet.getRow(totalRowNum);
      const valoresTotal = ['TOTAL GERAL', totais.pedidos, totais.itens, totais.entregues, totais.pendentes, taxaTotal / 100];

      valoresTotal.forEach((val, colIdx) => {
        totalRow.getCell(4 + colIdx).value = val;
        totalRow.getCell(4 + colIdx).style = {
          font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
          alignment: {
            horizontal: colIdx === 0 ? 'left' : 'center',
            vertical: 'middle'
          },
          border: getBordaCompleta()
        };

        if (colIdx === 5) {
          totalRow.getCell(4 + colIdx).numFmt = '0%';
        }
      });
    }

    // ==================== TABELA 3: MATERIAIS (Colunas K-N) ====================

    // Título
    const tituloMateriais = worksheet.getRow(1);
    tituloMateriais.getCell(11).value = 'ANÁLISE DE PRODUÇÃO POR MATERIAL';
    worksheet.mergeCells('K1:N1');
    tituloMateriais.getCell(11).style = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };

    // Cabeçalho
    const headerMat = worksheet.getRow(3);
    const colsMat = ['Material', 'Fichas', 'Itens', '% do Total'];
    colsMat.forEach((col, idx) => {
      headerMat.getCell(11 + idx).value = col;
      headerMat.getCell(11 + idx).style = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: getBordaCompleta()
      };
    });

    // Dados
    if (typeof dadosMateriais !== 'undefined' && dadosMateriais.length > 0) {
      const totalItens = dadosMateriais.reduce((sum, m) => sum + m.totalItens, 0);

      dadosMateriais.forEach((m, index) => {
        const percentual = totalItens > 0 ? (m.totalItens / totalItens) : 0;

        const rowNum = 4 + index;
        const row = worksheet.getRow(rowNum);

        const valores = [m.material, m.totalPedidos, m.totalItens, percentual];
        valores.forEach((val, colIdx) => {
          row.getCell(11 + colIdx).value = val;
          row.getCell(11 + colIdx).style = {
            font: { size: 10 },
            alignment: {
              horizontal: colIdx === 0 ? 'left' : 'center',
              vertical: 'middle'
            },
            border: getBordaCompleta(),
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
            }
          };

          if (colIdx === 3) {
            row.getCell(11 + colIdx).numFmt = '0.0%';
          }
        });
      });

      // Total
      const totalRowNum = 4 + dadosMateriais.length + 1;
      const totais = calcularTotaisMateriais(dadosMateriais);
      const totalRow = worksheet.getRow(totalRowNum);

      const valoresTotal = ['TOTAL GERAL', totais.pedidos, totais.itens, 1];
      valoresTotal.forEach((val, colIdx) => {
        totalRow.getCell(11 + colIdx).value = val;
        totalRow.getCell(11 + colIdx).style = {
          font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
          alignment: {
            horizontal: colIdx === 0 ? 'left' : 'center',
            vertical: 'middle'
          },
          border: getBordaCompleta()
        };

        if (colIdx === 3) {
          totalRow.getCell(11 + colIdx).numFmt = '0%';
        }
      });
    }
  }

  function addStyledRowRange(worksheet, rowNum, startCol, endCol, values, options = {}) {
    const row = worksheet.getRow(rowNum);
    const startColNum = startCol.charCodeAt(0) - 64;

    values.forEach((val, idx) => {
      row.getCell(startColNum + idx).value = val;
      row.getCell(startColNum + idx).style = {
        font: {
          size: 10,
          bold: options.boldFirst && idx === 0
        },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
    });
  }

  // ==================== PLANILHA DE DADOS DETALHADOS ====================

  function criarPlanilhaDetalhada(workbook, detalhes) {
    const worksheet = workbook.addWorksheet('Dados Detalhados');

    // Configurar larguras
    worksheet.columns = [
      { width: 12 },
      { width: 28 },
      { width: 22 },
      { width: 22 },
      { width: 12 },
      { width: 15 },
      { width: 15 }
    ];

    // Título
    const tituloRow = worksheet.addRow(['DADOS DETALHADOS DE PEDIDOS']);
    worksheet.mergeCells('A1:G1');
    tituloRow.getCell(1).style = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: getBordaCompleta()
    };
    tituloRow.height = 28;

    worksheet.addRow([]);

    // Cabeçalho
    const headerRow = worksheet.addRow(['ID Pedido', 'Cliente', 'Vendedor', 'Material', 'Quantidade', 'Status', 'Data']);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: getBordaCompleta()
      };
    });
    headerRow.height = 20;

    // Dados
    detalhes.forEach((item, index) => {
      const row = worksheet.addRow([
        item.id || '',
        item.cliente || '',
        item.vendedor || '',
        item.material || '',
        item.quantidade || 0,
        item.status || '',
        item.data || ''
      ]);

      row.eachCell((cell) => {
        cell.style = {
          font: { size: 9 },
          alignment: { horizontal: 'left', vertical: 'middle' },
          border: getBordaCompleta(),
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
          }
        };
      });
    });
  }

  // ==================== FUNÇÕES AUXILIARES ====================

  function getBordaCompleta() {
    return {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
    };
  }

  function getTaxaColor(taxa) {
    if (taxa >= 90) return 'FFC6EFCE'; // Verde claro
    if (taxa >= 70) return 'FFFFEB9C'; // Amarelo claro
    return 'FFFFC7CE'; // Vermelho claro
  }

  function calcularTotaisVendedores(dados) {
    return dados.reduce((acc, v) => ({
      pedidos: acc.pedidos + v.totalPedidos,
      itens: acc.itens + v.totalItens,
      entregues: acc.entregues + v.entregues,
      pendentes: acc.pendentes + v.pendentes
    }), { pedidos: 0, itens: 0, entregues: 0, pendentes: 0 });
  }

  function calcularTotaisMateriais(dados) {
    return dados.reduce((acc, m) => ({
      pedidos: acc.pedidos + m.totalPedidos,
      itens: acc.itens + m.totalItens
    }), { pedidos: 0, itens: 0 });
  }

  async function carregarScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Utilitários

  function getPeriodoNome() {
    if (periodoAtual === 'mes') return 'Este Mês';
    if (periodoAtual === 'ultimo_mes') return 'Último Mês';
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

  function preencherDatalist(listId, values) {
    const datalist = document.getElementById(listId);
    if (!datalist) return;

    datalist.innerHTML = '';
    (Array.isArray(values) ? values : []).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      datalist.appendChild(option);
    });
  }

  function normalizarTextoBusca(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function prepararAnimacaoCards() {
    const blocos = document.querySelectorAll('.stats-grid-large > *, .card');
    blocos.forEach((bloco, index) => {
      bloco.style.setProperty('--card-delay', `${Math.min(index * 40, 420)}ms`);
      bloco.classList.add('report-card-enter');
    });
  }

  function setRelatoriosLoadingState(isLoading) {
    if (!isLoading) document.body.classList.add('relatorios-ready');
  }

  function animateCounter(element, toValue, options = {}) {
    if (!element) return;
    const duration = Number(options.duration) || 700;
    const suffix = String(options.suffix || '');
    const fromValue = Number(element.dataset.counterValue || 0);
    const target = Number(toValue || 0);
    element.dataset.counterValue = String(target);

    const start = performance.now();
    const delta = target - fromValue;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromValue + (delta * eased);
      const rounded = Math.round(current);
      element.textContent = `${formatarNumero(rounded)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function animarBarrasQuandoVisivel(container, selector, prop, unit) {
    if (!container) return;
    const barras = Array.from(container.querySelectorAll(selector));
    if (!barras.length) return;

    const animar = () => {
      barras.forEach((bar, index) => {
        const target = Number(bar.dataset[prop] ?? bar.dataset.width ?? bar.dataset.height ?? 0);
        bar.style.transition = `${prop} 700ms cubic-bezier(.2,.8,.2,1)`;
        bar.style.transitionDelay = `${120 + (index * 90)}ms`;
        requestAnimationFrame(() => {
          bar.style[prop] = `${target}${unit}`;
        });
      });
    };

    if (!('IntersectionObserver' in window)) {
      animar();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          animar();
          observer.disconnect();
        }
      });
    }, { threshold: [0.55], rootMargin: '0px 0px -8% 0px' });
    observer.observe(container);
  }

  function bindHeatmapTooltip() {
    const container = document.getElementById('fichasHeatmap');
    const tooltip = document.getElementById('heatmapTooltip');
    if (!container || !tooltip) return;

    const show = (target, event) => {
      const text = target?.dataset?.tooltip;
      if (!text) return;
      tooltip.textContent = text;
      tooltip.hidden = false;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left + 12;
      const y = event.clientY - rect.top - 12;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    };

    const hide = () => {
      tooltip.hidden = true;
    };

    container.onmousemove = (event) => {
      const target = event.target.closest('.heatmap-cell');
      if (!target || target.classList.contains('empty')) {
        hide();
        return;
      }
      show(target, event);
    };

    container.onmouseleave = hide;
  }

  async function carregarInsightsVisuais() {
    const heatmapContainer = document.getElementById('fichasHeatmap');
    const personalizacoesContainer = document.getElementById('personalizacoesChart');
    if (!heatmapContainer || !personalizacoesContainer) return;

    try {
      const rangePersonalizacoes = obterRangePeriodoAtual();
      if (!rangePersonalizacoes) {
        throw new Error('Período inválido');
      }

      const rangeHeatmap = obterRangeUltimos365Dias();
      const [resHeatmap, resPersonal] = await Promise.all([
        fetch(`${db.baseURL}/fichas?${new URLSearchParams(rangeHeatmap).toString()}`),
        fetch(`${db.baseURL}/fichas?${new URLSearchParams(rangePersonalizacoes).toString()}`)
      ]);
      if (!resHeatmap.ok || !resPersonal.ok) throw new Error('Erro ao carregar fichas');

      const [fichasHeatmap, fichasPersonal] = await Promise.all([resHeatmap.json(), resPersonal.json()]);
      renderizarHeatmapFichas(Array.isArray(fichasHeatmap) ? fichasHeatmap : [], rangeHeatmap);
      renderizarGraficoPersonalizacoes(Array.isArray(fichasPersonal) ? fichasPersonal : []);
    } catch (error) {
      heatmapContainer.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar heatmap</p></div>';
      personalizacoesContainer.innerHTML = '<div class="empty-placeholder"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar personalizações</p></div>';
    }
  }

  function obterRangePeriodoAtual() {
    const hoje = new Date();
    const hojeIso = toISODate(hoje);
    if (periodoAtual === 'customizado') {
      const dataInicio = document.getElementById('relDataInicio')?.value;
      const dataFim = document.getElementById('relDataFim')?.value;
      if (!dataInicio || !dataFim) return null;
      return { dataInicio, dataFim };
    }

    if (periodoAtual === 'ano') {
      return { dataInicio: `${hoje.getFullYear()}-01-01`, dataFim: hojeIso };
    }

    if (periodoAtual === 'mes') {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { dataInicio: toISODate(primeiroDiaMes), dataFim: hojeIso };
    }

    if (periodoAtual === 'ultimo_mes') {
      const primeiroDiaUltimoMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimoDiaUltimoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { dataInicio: toISODate(primeiroDiaUltimoMes), dataFim: toISODate(ultimoDiaUltimoMes) };
    }

    return { dataInicio: '2020-01-01', dataFim: hojeIso };
  }

  function obterRangeUltimos365Dias() {
    const fim = new Date();
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - 364);
    return { dataInicio: toISODate(inicio), dataFim: toISODate(fim) };
  }

  function renderizarHeatmapFichas(fichas, range) {
    const container = document.getElementById('fichasHeatmap');
    if (!container) return;

    const dataFim = parseISODate(range.dataFim);
    const dataInicioRange = parseISODate(range.dataInicio);
    if (!dataFim || !dataInicioRange) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-calendar-times"></i><p>Período inválido</p></div>';
      return;
    }

    const dataInicio = dataInicioRange;
    const contagemPorDia = new Map();

    fichas.forEach(ficha => {
      const data = obterDataCriacaoFicha(ficha);
      if (!data) return;
      const diaSemana = data.getDay();
      if (diaSemana === 0 || diaSemana === 6) return;
      const chave = toISODate(data);
      contagemPorDia.set(chave, (contagemPorDia.get(chave) || 0) + 1);
    });

    const dias = [];
    const cursor = new Date(dataInicio);
    while (cursor <= dataFim) {
      const diaSemana = cursor.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        const chave = toISODate(cursor);
        dias.push({ data: new Date(cursor), quantidade: contagemPorDia.get(chave) || 0 });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const max = Math.max(...dias.map(d => d.quantidade), 0);
    if (!dias.length) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-calendar"></i><p>Sem dados para o período</p></div>';
      return;
    }

    const primeiroDiaSemana = dias[0].data.getDay(); // 1..5 (seg..sex)
    const blanks = Math.max(0, primeiroDiaSemana - 1); // alinhar em colunas seg-sex
    const cells = [];
    for (let i = 0; i < blanks; i++) {
      cells.push({ empty: true, nivel: 0, tooltip: '', date: null });
    }
    dias.forEach(dia => {
      const nivel = obterNivelHeatmap(dia.quantidade, max);
      const tooltip = `${dia.data.toLocaleDateString('pt-BR')}: ${dia.quantidade} ficha(s) criada(s)`;
      cells.push({ empty: false, nivel, tooltip, date: dia.data });
    });
    while (cells.length % 5 !== 0) {
      cells.push({ empty: true, nivel: 0, tooltip: '', date: null });
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 5) {
      weeks.push(cells.slice(i, i + 5));
    }

    const weeksHtml = weeks.map(week => {
      const cellsHtml = week.map(cell => {
        if (cell.empty) return '<span class="heatmap-cell empty"></span>';
        return `<span class="heatmap-cell level-${cell.nivel}" data-tooltip="${escapeHtml(cell.tooltip)}"></span>`;
      }).join('');
      return `<div class="heatmap-week">${cellsHtml}</div>`;
    }).join('');

    container.innerHTML = `<div class="heatmap-lines"><div class="heatmap-line">${weeksHtml}</div></div><div id="heatmapTooltip" class="heatmap-tooltip" hidden></div>`;
    bindHeatmapTooltip();
  }

  function obterNivelHeatmap(qtd, max) {
    if (!qtd || max <= 0) return 0;
    const ratio = qtd / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  function renderizarGraficoPersonalizacoes(fichas) {
    const container = document.getElementById('personalizacoesChart');
    if (!container) return;

    const mapa = new Map();
    fichas.forEach(ficha => {
      const chave = normalizarChavePersonalizacao(ficha?.arte);
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });

    const dados = Array.from(mapa.entries())
      .map(([chave, quantidade]) => ({ chave, quantidade, label: rotuloPersonalizacao(chave) }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 7);

    if (!dados.length) {
      container.innerHTML = '<div class="empty-placeholder"><i class="fas fa-paint-brush"></i><p>Sem personalizações no período</p></div>';
      return;
    }

    const max = Math.max(...dados.map(item => item.quantidade), 1);
    container.innerHTML = `
      <div class="personalizacoes-columns">
        ${dados.map(item => {
      const altura = Math.max(14, Math.round((item.quantidade / max) * 120));
      return `
            <div class="personalizacao-col" title="${escapeHtml(item.label)}: ${item.quantidade}">
              <div class="personalizacao-bar-wrap">
                <span class="personalizacao-value">${formatarNumero(item.quantidade)}</span>
                <div class="personalizacao-bar" data-height="${altura}" style="height: 0px;"></div>
              </div>
              <span class="personalizacao-label">${escapeHtml(item.label)}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;
    animarBarrasQuandoVisivel(container, '.personalizacao-bar', 'height', 'px');
  }

  function normalizarChavePersonalizacao(valor) {
    const key = normalizarTextoBusca(valor).replace(/\s+/g, '_');
    return key || 'sem_personalizacao';
  }

  function rotuloPersonalizacao(chave) {
    const mapa = {
      sem_personalizacao: 'Sem personalização',
      sublimacao: 'Sublimação',
      serigrafia: 'Serigrafia',
      bordado: 'Bordado',
      dtf: 'DTF Têxtil',
      sublimacao_serigrafia: 'Sublimação + Serigrafia',
      serigrafia_dtf: 'Serigrafia + DTF',
      serigrafia_bordado: 'Serigrafia + Bordado'
    };
    if (mapa[chave]) return mapa[chave];
    return chave.split('_').filter(Boolean).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
  }

  function obterDataCriacaoFicha(ficha) {
    const raw = ficha?.data_criacao || ficha?.created_at || ficha?.data_inicio;
    if (!raw) return null;
    const data = new Date(raw);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function parseISODate(iso) {
    if (!iso) return null;
    const data = new Date(`${iso}T00:00:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function toISODate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function initEfeitosScroll() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

    const elementos = document.querySelectorAll('.card, .stat-card-large');
    elementos.forEach(el => {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }
})();



