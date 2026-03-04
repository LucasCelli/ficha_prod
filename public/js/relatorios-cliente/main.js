import { fetchClientReport, fetchClients } from './api.js';
import { buildPeriodoLabel, exportExcel, exportPdf, setExportBusy } from './export.js';
import { renderDetailEmpty, renderDetailError, renderDetailLoading, renderDetailReport, renderSidebar } from './render.js';
import { buildCacheKey, CLIENT_LIMIT, HISTORY_LIMIT, state } from './state.js';
import { debounce, getQuickRange, isValidRange, toIsoDate } from './utils.js';

function toast(message, type = 'info') {
  if (typeof window.mostrarToast === 'function') {
    window.mostrarToast(message, type);
  }
}

function syncUrl() {
  const url = new URL(window.location.href);
  if (state.selectedClientId) url.searchParams.set('clienteId', String(state.selectedClientId));
  else url.searchParams.delete('clienteId');
  if (state.dataInicio && state.dataFim) {
    url.searchParams.set('dataInicio', state.dataInicio);
    url.searchParams.set('dataFim', state.dataFim);
  } else {
    url.searchParams.delete('dataInicio');
    url.searchParams.delete('dataFim');
  }
  if (state.selectedQuickRange) url.searchParams.set('atalho', state.selectedQuickRange);
  window.history.replaceState({}, '', url.toString());
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const clienteId = Number.parseInt(String(params.get('clienteId') || ''), 10);
  if (Number.isInteger(clienteId) && clienteId > 0) state.selectedClientId = clienteId;

  const dataInicio = String(params.get('dataInicio') || '').trim();
  const dataFim = String(params.get('dataFim') || '').trim();
  if (dataInicio && dataFim && isValidRange(dataInicio, dataFim)) {
    state.dataInicio = dataInicio;
    state.dataFim = dataFim;
  } else {
    const range = getQuickRange('30d');
    state.dataInicio = range.dataInicio;
    state.dataFim = range.dataFim;
  }

  const atalho = String(params.get('atalho') || '').trim();
  state.selectedQuickRange = atalho || '30d';
}

async function loadClients({ reset = false } = {}) {
  try {
    if (state.clientsLoading) return;
    state.clientsLoading = true;
    if (reset) {
      state.clientsOffset = 0;
      state.clients = [];
      state.clientsHasMore = false;
    }
    renderSidebar({
      clients: state.clients,
      loading: state.clientsLoading,
      hasMore: state.clientsHasMore,
      selectedClientId: state.selectedClientId
    });

    const response = await fetchClients({
      query: state.clientQuery,
      limit: CLIENT_LIMIT,
      offset: state.clientsOffset
    });

    const items = Array.isArray(response.items) ? response.items : [];
    state.clients = reset ? items : [...state.clients, ...items];
    state.clientsOffset = Number(response.offset || 0) + items.length;
    state.clientsHasMore = Boolean(response.hasMore);

    renderSidebar({
      clients: state.clients,
      loading: false,
      hasMore: state.clientsHasMore,
      selectedClientId: state.selectedClientId
    });
  } catch (error) {
    state.clientsLoading = false;
    renderSidebar({
      clients: state.clients,
      loading: false,
      hasMore: false,
      selectedClientId: state.selectedClientId
    });
    toast('Erro ao carregar clientes', 'error');
    return;
  }
  state.clientsLoading = false;
}

async function loadDetail({ historyOffset = 0 } = {}) {
  if (!state.selectedClientId) {
    state.detail = null;
    renderDetailEmpty();
    return;
  }

  state.detailLoading = true;
  state.historyOffset = historyOffset;
  renderDetailLoading();

  const cacheKey = buildCacheKey(
    state.selectedClientId,
    state.dataInicio,
    state.dataFim,
    state.historyOffset,
    HISTORY_LIMIT
  );

  try {
    let detail = state.cache.get(cacheKey);
    if (!detail) {
      detail = await fetchClientReport({
        clientId: state.selectedClientId,
        dataInicio: state.dataInicio,
        dataFim: state.dataFim,
        fichasLimit: HISTORY_LIMIT,
        fichasOffset: state.historyOffset
      });
      state.cache.set(cacheKey, detail);
    }

    state.detail = detail;
    state.detailLoading = false;

    renderDetailReport({
      detail,
      dataInicio: state.dataInicio,
      dataFim: state.dataFim,
      selectedQuickRange: state.selectedQuickRange,
      showAllProducts: Boolean(state.detail.__showAllProducts)
    });
    bindDetailEvents();
    syncUrl();
  } catch (error) {
    state.detailLoading = false;
    renderDetailError('Falha ao carregar relatório do cliente');
  }
}

function bindSidebarEvents() {
  const searchInput = document.getElementById('clienteSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(async e => {
      state.clientQuery = String(e.target?.value || '').trim();
      await loadClients({ reset: true });
    }, 300));
  }

  document.getElementById('btnLoadMoreClientes')?.addEventListener('click', async () => {
    if (!state.clientsHasMore) return;
    await loadClients({ reset: false });
  });

  document.getElementById('clienteList')?.addEventListener('click', async e => {
    const btn = e.target.closest('.cliente-list-item[data-client-id]');
    if (!btn) return;
    const clientId = Number.parseInt(String(btn.dataset.clientId || ''), 10);
    if (!Number.isInteger(clientId) || clientId <= 0) return;
    state.selectedClientId = clientId;
    state.historyOffset = 0;
    state.detail = null;
    renderSidebar({
      clients: state.clients,
      loading: false,
      hasMore: state.clientsHasMore,
      selectedClientId: state.selectedClientId
    });
    await loadDetail({ historyOffset: 0 });
  });
}

function bindDetailEvents() {
  document.getElementById('btnAplicarPeriodoCliente')?.addEventListener('click', async () => {
    const inicio = String(document.getElementById('periodoDataInicio')?.value || '').trim();
    const fim = String(document.getElementById('periodoDataFim')?.value || '').trim();
    if (!isValidRange(inicio, fim)) {
      toast('Data inicial deve ser menor ou igual à data final', 'error');
      return;
    }
    state.dataInicio = inicio;
    state.dataFim = fim;
    state.selectedQuickRange = '';
    state.historyOffset = 0;
    await loadDetail({ historyOffset: 0 });
  });

  document.querySelectorAll('[data-quick-range]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = String(btn.dataset.quickRange || '').trim();
      const range = getQuickRange(key);
      state.dataInicio = range.dataInicio;
      state.dataFim = range.dataFim;
      state.selectedQuickRange = key;
      state.historyOffset = 0;
      await loadDetail({ historyOffset: 0 });
    });
  });

  document.getElementById('btnHistoricoPrev')?.addEventListener('click', async () => {
    const nextOffset = Math.max(0, state.historyOffset - HISTORY_LIMIT);
    await loadDetail({ historyOffset: nextOffset });
  });

  document.getElementById('btnHistoricoNext')?.addEventListener('click', async () => {
    const nextOffset = state.historyOffset + HISTORY_LIMIT;
    await loadDetail({ historyOffset: nextOffset });
  });

  document.getElementById('btnToggleProdutos')?.addEventListener('click', () => {
    if (!state.detail) return;
    state.detail.__showAllProducts = !state.detail.__showAllProducts;
    renderDetailReport({
      detail: state.detail,
      dataInicio: state.dataInicio,
      dataFim: state.dataFim,
      selectedQuickRange: state.selectedQuickRange,
      showAllProducts: Boolean(state.detail.__showAllProducts)
    });
    bindDetailEvents();
  });

  document.getElementById('btnExportPdfCliente')?.addEventListener('click', async () => {
    if (!state.detail) return;
    try {
      setExportBusy(true);
      await exportPdf(state.detail, buildPeriodoLabel(state.dataInicio, state.dataFim));
      toast('PDF gerado com sucesso', 'success');
    } catch (error) {
      toast(`Falha ao gerar PDF: ${error.message}`, 'error');
    } finally {
      setExportBusy(false);
    }
  });

  document.getElementById('btnExportExcelCliente')?.addEventListener('click', async () => {
    if (!state.detail) return;
    try {
      setExportBusy(true);
      await exportExcel(state.detail, buildPeriodoLabel(state.dataInicio, state.dataFim));
      toast('Excel gerado com sucesso', 'success');
    } catch (error) {
      toast(`Falha ao gerar Excel: ${error.message}`, 'error');
    } finally {
      setExportBusy(false);
    }
  });
}

async function init() {
  try {
    if (window.db && typeof window.db.init === 'function') {
      await window.db.init();
    }
    hydrateFromUrl();
    bindSidebarEvents();
    await loadClients({ reset: true });
    if (state.selectedClientId) {
      await loadDetail({ historyOffset: 0 });
    } else {
      renderDetailEmpty();
    }
  } catch (error) {
    toast('Erro ao inicializar relatório de clientes', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);

