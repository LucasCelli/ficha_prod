/**
 * Quadro Kanban de Producao
 */
(function () {
  'use strict';

  const COLUMN_DEFINITIONS = [
    { key: 'pendente', label: 'Pendente' },
    { key: 'exportando', label: 'Exportando/Preparando Arte' },
    { key: 'fila_impressao', label: 'Na Fila de Impressão/Imprimindo' },
    { key: 'sublimando', label: 'Sublimando/Na Estamparia' },
    { key: 'na_costura', label: 'Na Costura/Em Revisão' }
  ];
  const CARD_STATUS_LABELS = {
    pendente: 'Pend.',
    exportando: 'Arte',
    fila_impressao: 'Impr.',
    sublimando: 'Estam.',
    na_costura: 'Rev.'
  };

  const VALID_STATUS = new Set(COLUMN_DEFINITIONS.map(col => col.key));
  const NAME_EXCEPTIONS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const STORAGE_FILTER_KEY = 'kanban_filters_v1';

  const state = {
    fichas: [],
    filters: {
      cliente: '',
      pedido: '',
      sortDate: 'data_desc'
    },
    drag: {
      fichaId: null
    },
    pendingPersistById: Object.create(null),
    lastMovedFichaId: null
  };

  const ui = {
    viewModal: null,
    viewOverlay: null,
    viewFrame: null,
    viewFichaId: null,
    viewCloseBtn: null
  };

  document.addEventListener('DOMContentLoaded', () => {
    initKanban().catch(error => {
      console.error('Erro ao inicializar quadro Kanban:', error);
      if (typeof window.mostrarErro === 'function') {
        window.mostrarErro('Erro ao carregar quadro Kanban');
      }
    });
  });

  async function initKanban() {
    const ok = await db.init();
    if (!ok) {
      throw new Error('Falha de conexao com API');
    }

    state.filters = loadFilters();

    initEventListeners();
    hydrateFilterControls();
    await carregarFichas();
    renderKanban();
  }

  function initEventListeners() {
    const btnToggleFiltros = document.getElementById('btnToggleFiltrosKanban');
    const filtrosBody = document.getElementById('kanbanFiltersBody');
    const filtrosCard = document.querySelector('.kanban-filters-card');
    const filterCliente = document.getElementById('filterClienteKanban');
    const searchPedido = document.getElementById('searchPedidoKanban');
    const sortData = document.getElementById('sortDataKanban');
    const btnLimpar = document.getElementById('btnLimparFiltrosKanban');
    const btnAtualizar = document.getElementById('btnAtualizarKanban');
    const kanbanBoard = document.getElementById('kanbanBoard');
    ui.viewModal = document.getElementById('kanbanViewModal');
    ui.viewOverlay = ui.viewModal ? ui.viewModal.querySelector('.kanban-view-modal-overlay') : null;
    ui.viewFrame = document.getElementById('kanbanViewFrame');
    ui.viewFichaId = document.getElementById('kanbanViewFichaId');
    ui.viewCloseBtn = document.getElementById('btnCloseKanbanViewModal');

    if (btnToggleFiltros && filtrosBody && filtrosCard) {
      const setAccordionState = expanded => {
        btnToggleFiltros.setAttribute('aria-expanded', String(expanded));
        filtrosBody.hidden = !expanded;
        filtrosCard.classList.toggle('is-expanded', expanded);
        filtrosCard.classList.toggle('is-collapsed', !expanded);
      };

      const startsExpanded = btnToggleFiltros.getAttribute('aria-expanded') === 'true' && !filtrosBody.hidden;
      setAccordionState(startsExpanded);

      btnToggleFiltros.addEventListener('click', () => {
        const expanded = btnToggleFiltros.getAttribute('aria-expanded') === 'true';
        setAccordionState(!expanded);
      });
    }

    if (filterCliente) {
      filterCliente.addEventListener('input', debounce(event => {
        state.filters.cliente = event.target.value || '';
        saveFilters();
        renderKanban();
      }, 180));
    }

    if (searchPedido) {
      searchPedido.addEventListener('input', debounce(event => {
        state.filters.pedido = event.target.value || '';
        saveFilters();
        renderKanban();
      }, 180));
    }

    if (sortData) {
      sortData.addEventListener('change', event => {
        state.filters.sortDate = event.target.value || 'data_desc';
        saveFilters();
        renderKanban();
      });
    }

    if (btnLimpar) {
      btnLimpar.addEventListener('click', () => {
        state.filters = {
          cliente: '',
          pedido: '',
          sortDate: 'data_desc'
        };
        hydrateFilterControls();
        saveFilters();
        renderKanban();
      });
    }

    if (btnAtualizar) {
      btnAtualizar.addEventListener('click', async () => {
        await carregarFichas();
        renderKanban();
        if (typeof window.mostrarInfo === 'function') {
          window.mostrarInfo('Quadro atualizado');
        }
      });
    }

    if (kanbanBoard) {
      kanbanBoard.addEventListener('click', handleBoardClick);
      kanbanBoard.addEventListener('dragstart', handleDragStart);
      kanbanBoard.addEventListener('dragend', handleDragEnd);
    }

    if (ui.viewCloseBtn) {
      ui.viewCloseBtn.addEventListener('click', closeViewModal);
    }

    if (ui.viewOverlay) {
      ui.viewOverlay.addEventListener('click', closeViewModal);
    }

    document.addEventListener('keydown', handleGlobalKeydown);

    document.querySelectorAll('.kanban-column').forEach(column => {
      column.addEventListener('dragenter', handleDragEnterColumn);
      column.addEventListener('dragover', handleDragOverColumn);
      column.addEventListener('dragleave', handleDragLeaveColumn);
      column.addEventListener('drop', handleDropColumn);
    });
  }

  async function carregarFichas() {
    const fichas = await db.listarFichas();
    state.fichas = (Array.isArray(fichas) ? fichas : []).map(normalizeFichaKanbanStatus);
  }

  function normalizeFichaKanbanStatus(ficha) {
    return {
      ...ficha,
      kanban_status: normalizeBoardStatus(ficha?.kanban_status)
    };
  }

  function renderKanban() {
    const fichasFiltradas = getFichasFiltradasEOrdenadas();
    const fichasSemRepeticao = dedupeByNumeroVenda(fichasFiltradas);
    const agrupadas = groupByColumn(fichasSemRepeticao);

    COLUMN_DEFINITIONS.forEach(column => {
      const cards = agrupadas[column.key] || [];
      renderColumn(column.key, cards);
      updateColumnCounter(column.key, cards.length);
    });

    updateTotalCounter(fichasSemRepeticao.length);
    animateMovedCardIfNeeded();
  }

  function getFichasFiltradasEOrdenadas() {
    const clienteTerm = normalizeText(state.filters.cliente);
    const pedidoTerm = normalizeText(state.filters.pedido);
    const sortMode = state.filters.sortDate === 'data_asc' ? 'data_asc' : 'data_desc';

    return state.fichas
      .filter(ficha => {
        const cliente = normalizeText(ficha.cliente);
        const pedido = normalizeText(ficha.numero_venda);

        if (clienteTerm && !cliente.includes(clienteTerm)) return false;
        if (pedidoTerm && !pedido.includes(pedidoTerm)) return false;
        return true;
      })
      .sort((a, b) => {
        const dataA = getSortTimestamp(a);
        const dataB = getSortTimestamp(b);
        if (sortMode === 'data_asc') {
          return dataA - dataB || Number(a.id) - Number(b.id);
        }
        return dataB - dataA || Number(b.id) - Number(a.id);
      });
  }

  function groupByColumn(fichas) {
    const grouped = {};
    COLUMN_DEFINITIONS.forEach(column => {
      grouped[column.key] = [];
    });

    fichas.forEach(ficha => {
      const status = getBoardStatus(ficha);
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(ficha);
    });

    return grouped;
  }

  function dedupeByNumeroVenda(fichas) {
    const seenNumeroVenda = new Set();
    const unique = [];

    fichas.forEach(ficha => {
      const numeroVenda = normalizeNumeroVenda(ficha?.numero_venda);
      if (!numeroVenda) {
        unique.push(ficha);
        return;
      }

      if (seenNumeroVenda.has(numeroVenda)) return;
      seenNumeroVenda.add(numeroVenda);
      unique.push(ficha);
    });

    return unique;
  }

  function renderColumn(statusKey, fichas) {
    const listEl = document.getElementById(`kanban-list-${statusKey}`);
    if (!listEl) return;

    if (!fichas.length) {
      listEl.innerHTML = '<div class="kanban-empty">Nenhuma ficha nesta etapa</div>';
      return;
    }

    listEl.innerHTML = fichas.map(ficha => {
      const fichaId = Number(ficha.id);
      const isSaving = Boolean(state.pendingPersistById[String(fichaId)]);
      const cardStatus = getBoardStatus(ficha);
      const cliente = escapeHtml(formatDisplayName(ficha.cliente || 'Cliente nao informado'));
      const numeroPedido = escapeHtml(String(ficha.numero_venda || '-'));
      const dataRef = getDisplayDate(ficha);
      const statusLabel = getCardStatusLabel(cardStatus);
      const cardClass = isSaving ? 'kanban-card is-saving' : 'kanban-card';

      return `
        <article class="${cardClass}" draggable="${isSaving ? 'false' : 'true'}" data-ficha-id="${fichaId}" data-status="${cardStatus}">
          <h3 class="kanban-card-cliente">${cliente}</h3>
          <div class="kanban-card-header">
            <span class="kanban-card-pedido">
              <i class="fas fa-hashtag"></i>
              <span>${numeroPedido}</span>
            </span>
            <span class="kanban-card-tools">
              <span class="kanban-card-status ${cardStatus}" title="${escapeHtml(getStatusLabel(cardStatus))}">${statusLabel}</span>
              <button type="button" class="kanban-btn-view-icon" data-action="view" data-id="${fichaId}" title="Visualizar ficha" aria-label="Visualizar ficha #${fichaId}">
                <i class="fas fa-eye"></i>
              </button>
            </span>
          </div>
          <div class="kanban-card-meta">
            <i class="fas fa-calendar-day"></i>
            <span>${escapeHtml(dataRef)}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  function updateColumnCounter(statusKey, total) {
    const countEl = document.querySelector(`.kanban-column-count[data-count-for="${statusKey}"]`);
    if (!countEl) return;
    countEl.textContent = String(total);
  }

  function updateTotalCounter(total) {
    const totalEl = document.getElementById('kanbanTotalCount');
    if (!totalEl) return;
    totalEl.textContent = `${total} ${total === 1 ? 'ficha' : 'fichas'}`;
  }

  function handleBoardClick(event) {
    const viewButton = event.target.closest('button[data-action="view"]');
    if (!viewButton) return;

    const id = Number(viewButton.dataset.id);
    if (!id) return;

    openViewModal(id);
  }

  function handleGlobalKeydown(event) {
    if (event.key !== 'Escape') return;
    if (!ui.viewModal || ui.viewModal.hidden) return;
    closeViewModal();
  }

  function openViewModal(fichaId) {
    if (!ui.viewModal || !ui.viewFrame) return;

    if (ui.viewFichaId) ui.viewFichaId.textContent = `#${fichaId}`;
    ui.viewFrame.src = `index.html?visualizar=${fichaId}`;

    ui.viewModal.hidden = false;
    ui.viewModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('kanban-modal-open');
  }

  function closeViewModal() {
    if (!ui.viewModal) return;

    ui.viewModal.hidden = true;
    ui.viewModal.setAttribute('aria-hidden', 'true');
    if (ui.viewFrame) ui.viewFrame.src = 'about:blank';
    document.body.classList.remove('kanban-modal-open');
  }

  function handleDragStart(event) {
    const card = event.target.closest('.kanban-card');
    if (!card || !event.dataTransfer) return;

    const fichaId = Number(card.dataset.fichaId);
    if (!fichaId) return;
    if (state.pendingPersistById[String(fichaId)]) {
      event.preventDefault();
      return;
    }

    state.drag.fichaId = fichaId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(fichaId));

    card.classList.add('is-dragging');
    document.body.classList.add('kanban-dragging');
  }

  function handleDragEnd(event) {
    const card = event.target.closest('.kanban-card');
    if (card) card.classList.remove('is-dragging');

    clearDropHighlights();
    state.drag.fichaId = null;
    document.body.classList.remove('kanban-dragging');
  }

  function handleDragEnterColumn(event) {
    if (!state.drag.fichaId) return;
    event.preventDefault();
    const column = event.currentTarget;
    if (column) column.classList.add('is-drop-target');
  }

  function handleDragOverColumn(event) {
    if (!state.drag.fichaId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const column = event.currentTarget;
    if (column) column.classList.add('is-drop-target');
  }

  function handleDragLeaveColumn(event) {
    const column = event.currentTarget;
    if (!column) return;
    if (event.relatedTarget && column.contains(event.relatedTarget)) return;
    column.classList.remove('is-drop-target');
  }

  async function handleDropColumn(event) {
    event.preventDefault();
    const column = event.currentTarget;
    if (!column) return;

    const targetStatus = column.dataset.status;
    if (!VALID_STATUS.has(targetStatus)) return;

    const draggedId = Number(state.drag.fichaId || (event.dataTransfer ? event.dataTransfer.getData('text/plain') : 0));
    if (!draggedId) return;

    const ficha = findFichaById(draggedId);
    if (!ficha) return;

    const currentStatus = getBoardStatus(ficha);
    clearDropHighlights();

    if (currentStatus === targetStatus) return;
    if (state.pendingPersistById[String(draggedId)]) return;

    state.pendingPersistById[String(draggedId)] = true;
    setBoardStatus(draggedId, targetStatus);
    state.lastMovedFichaId = draggedId;
    renderKanban();

    try {
      const response = await db.atualizarKanbanStatus(draggedId, targetStatus);
      const persistedStatus = normalizeBoardStatus(response?.kanbanStatus || targetStatus);
      setBoardStatus(draggedId, persistedStatus);

      if (typeof window.mostrarInfo === 'function') {
        window.mostrarInfo(`Ficha #${draggedId} movida para ${getStatusLabel(persistedStatus)}`);
      }
    } catch (error) {
      console.error('Erro ao persistir status do kanban:', error);
      setBoardStatus(draggedId, currentStatus);
      state.lastMovedFichaId = draggedId;

      if (typeof window.mostrarErro === 'function') {
        window.mostrarErro(`Nao foi possivel mover a ficha #${draggedId}`);
      }
    } finally {
      delete state.pendingPersistById[String(draggedId)];
      renderKanban();
    }
  }

  function findFichaById(fichaId) {
    return state.fichas.find(ficha => Number(ficha.id) === Number(fichaId)) || null;
  }

  function setBoardStatus(fichaId, status) {
    if (!VALID_STATUS.has(status)) return;
    const ficha = findFichaById(fichaId);
    if (!ficha) return;
    ficha.kanban_status = status;
  }

  function getBoardStatus(ficha) {
    return normalizeBoardStatus(ficha?.kanban_status);
  }

  function normalizeBoardStatus(status) {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    return VALID_STATUS.has(normalized) ? normalized : 'pendente';
  }

  function clearDropHighlights() {
    document.querySelectorAll('.kanban-column.is-drop-target').forEach(col => {
      col.classList.remove('is-drop-target');
    });
  }

  function animateMovedCardIfNeeded() {
    if (!state.lastMovedFichaId) return;
    const selector = `.kanban-card[data-ficha-id="${state.lastMovedFichaId}"]`;
    const card = document.querySelector(selector);
    if (!card) {
      state.lastMovedFichaId = null;
      return;
    }

    card.classList.add('drop-animate');
    setTimeout(() => {
      card.classList.remove('drop-animate');
    }, 280);
    state.lastMovedFichaId = null;
  }

  function loadFilters() {
    try {
      const raw = localStorage.getItem(STORAGE_FILTER_KEY);
      if (!raw) return { cliente: '', pedido: '', sortDate: 'data_desc' };

      const parsed = JSON.parse(raw);
      return {
        cliente: typeof parsed.cliente === 'string' ? parsed.cliente : '',
        pedido: typeof parsed.pedido === 'string' ? parsed.pedido : '',
        sortDate: parsed.sortDate === 'data_asc' ? 'data_asc' : 'data_desc'
      };
    } catch (_) {
      return { cliente: '', pedido: '', sortDate: 'data_desc' };
    }
  }

  function saveFilters() {
    localStorage.setItem(STORAGE_FILTER_KEY, JSON.stringify(state.filters));
  }

  function hydrateFilterControls() {
    const filterCliente = document.getElementById('filterClienteKanban');
    const searchPedido = document.getElementById('searchPedidoKanban');
    const sortData = document.getElementById('sortDataKanban');

    if (filterCliente) filterCliente.value = state.filters.cliente;
    if (searchPedido) searchPedido.value = state.filters.pedido;
    if (sortData) sortData.value = state.filters.sortDate;
  }

  function getStatusLabel(statusKey) {
    const match = COLUMN_DEFINITIONS.find(col => col.key === statusKey);
    return match ? match.label : 'Pendente';
  }

  function getCardStatusLabel(statusKey) {
    return CARD_STATUS_LABELS[statusKey] || 'Pend.';
  }

  function getDisplayDate(ficha) {
    const dateValue = ficha.data_entrega || ficha.data_inicio || '';
    return formatDate(dateValue);
  }

  function getSortTimestamp(ficha) {
    const dateValue = ficha.data_entrega || ficha.data_inicio || '';
    const time = Date.parse(dateValue || '');
    if (Number.isNaN(time)) return 0;
    return time;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = String(dateString).split('-');
    if (!year || !month || !day) return '-';
    return `${day}/${month}/${year}`;
  }

  function formatDisplayName(value) {
    if (typeof value !== 'string') return '';
    const text = value.trim().replace(/\s+/g, ' ');
    if (!text) return '';

    return text
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        return word
          .split(/([-/])/)
          .map(part => {
            if (!part || part === '-' || part === '/') return part;
            if (index > 0 && NAME_EXCEPTIONS.has(part)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join('');
      })
      .join(' ');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function normalizeNumeroVenda(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function debounce(fn, delay) {
    let timeout = null;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }
})();
