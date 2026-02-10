/**
 * Dashboard de Fichas Técnicas
 */

(function () {
  'use strict';

  let fichasCache = [];
  let fichasFiltradas = [];
  let fichaParaDeletar = null;
  let paginaAtual = 1;
  const itensPorPagina = 10;

  document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
  });

  async function initDashboard() {
    try {
      await db.init();
      criarPaginacao();
      initEventListeners(); // CORREÇÃO: Inicializar listeners ANTES de carregar dados
      await carregarFichas();
      await atualizarEstatisticas();
      verificarParametrosURL();
    } catch (error) {
      console.error('Erro ao inicializar dashboard:', error);
      mostrarErro('Erro ao carregar dados do servidor');
    }
  }

  function initEventListeners() {
    // CORREÇÃO: Garantir que pelo menos um botão de filtro esteja ativo
    const statusFilterBtns = document.querySelectorAll('.status-filter .btn');
    
    // Ativar o botão "Todos" por padrão se nenhum estiver ativo
    const btnAtivo = document.querySelector('.status-filter .btn.active');
    if (!btnAtivo && statusFilterBtns.length > 0) {
      statusFilterBtns[0].classList.add('active');
    }

    statusFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        statusFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        aplicarFiltros();
      });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(aplicarFiltros, 300));
    }

    const filterDataInicio = document.getElementById('filterDataInicio');
    const filterDataFim = document.getElementById('filterDataFim');
    if (filterDataInicio) filterDataInicio.addEventListener('change', aplicarFiltros);
    if (filterDataFim) filterDataFim.addEventListener('change', aplicarFiltros);

    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) {
      btnLimparFiltros.addEventListener('click', limparFiltros);
    }

    const btnExportarBackup = document.getElementById('btnExportarBackup');
    if (btnExportarBackup) {
      btnExportarBackup.addEventListener('click', exportarBackup);
    }

    const btnImportarBackup = document.getElementById('btnImportarBackup');
    if (btnImportarBackup) {
      btnImportarBackup.addEventListener('click', () => {
        const importInput = document.getElementById('importFileInput');
        if (importInput) importInput.click();
      });
    }

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', importarBackup);
    }

    const btnCancelarDelete = document.getElementById('btnCancelarDelete');
    const btnConfirmarDelete = document.getElementById('btnConfirmarDelete');
    if (btnCancelarDelete) btnCancelarDelete.addEventListener('click', fecharModalDelete);
    if (btnConfirmarDelete) btnConfirmarDelete.addEventListener('click', confirmarDelete);

    const modalOverlay = document.querySelector('#deleteModal .modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', fecharModalDelete);
    }
  }

  function verificarParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const clienteFiltro = params.get('cliente');

    if (clienteFiltro) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = clienteFiltro;
        aplicarFiltros();
      }
    }
  }

  // Paginação

  function criarPaginacao() {
    const container = document.getElementById('pagination');
    if (!container) return;

    container.innerHTML = '';

    const btnPrev = document.createElement('button');
    btnPrev.id = 'btnPrevPage';
    btnPrev.className = 'btn btn-secondary';
    btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
    btnPrev.addEventListener('click', () => mudarPagina(-1));

    const pageInfo = document.createElement('span');
    pageInfo.id = 'pageInfo';
    pageInfo.className = 'page-info';

    const btnNext = document.createElement('button');
    btnNext.id = 'btnNextPage';
    btnNext.className = 'btn btn-secondary';
    btnNext.innerHTML = 'Próxima <i class="fas fa-chevron-right"></i>';
    btnNext.addEventListener('click', () => mudarPagina(1));

    container.appendChild(btnPrev);
    container.appendChild(pageInfo);
    container.appendChild(btnNext);
  }

  function mudarPagina(direcao) {
    const totalPaginas = Math.ceil(fichasFiltradas.length / itensPorPagina);
    const novaPagina = paginaAtual + direcao;

    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      paginaAtual = novaPagina;
      renderizarPagina();
    }
  }

  function atualizarPaginacao() {
    const totalPaginas = Math.ceil(fichasFiltradas.length / itensPorPagina) || 1;
    const container = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (!container) return;

    if (totalPaginas <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    if (pageInfo) {
      pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    }
    if (btnPrev) {
      btnPrev.style.display = paginaAtual === 1 ? 'none' : 'inline-flex';
    }
    if (btnNext) {
      btnNext.style.display = paginaAtual === totalPaginas ? 'none' : 'inline-flex';
    }
  }

  function renderizarPagina() {
    const startIdx = (paginaAtual - 1) * itensPorPagina;
    const endIdx = startIdx + itensPorPagina;
    const fichasPagina = fichasFiltradas.slice(startIdx, endIdx);

    renderizarFichas(fichasPagina);
    atualizarPaginacao();
  }

  // Fichas

  async function carregarFichas() {
    try {
      fichasCache = await db.listarFichas();
      fichasFiltradas = [...fichasCache];
      paginaAtual = 1;
      renderizarPagina();
    } catch (error) {
      console.error('Erro ao carregar fichas:', error);
      mostrarErro('Erro ao carregar fichas');
    }
  }

  function renderizarFichas(fichas) {
    const container = document.getElementById('fichasContainer');
    const emptyState = document.getElementById('emptyState');
    const resultadosCount = document.getElementById('resultadosCount');

    if (!container) return;

    const totalFiltrado = fichasFiltradas.length;
    if (resultadosCount) {
      resultadosCount.textContent = `${totalFiltrado} ${totalFiltrado === 1 ? 'resultado' : 'resultados'}`;
    }

    if (!fichas || fichas.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = fichas.map(ficha => criarCardFicha(ficha)).join('');

    container.querySelectorAll('.btn-visualizar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        visualizarFicha(id);
      });
    });

    container.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        editarFicha(id);
      });
    });

    container.querySelectorAll('.btn-entregar').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        await marcarComoEntregue(id);
      });
    });

    container.querySelectorAll('.btn-desmarcar-entrega').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        await desmarcarComoEntregue(id);
      });
    });

    container.querySelectorAll('.btn-deletar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        abrirModalDelete(id);
      });
    });
  }

  function criarCardFicha(ficha) {
    const dataInicio = ficha.data_inicio ? formatarData(ficha.data_inicio) : '-';
    const dataEntrega = ficha.data_entrega ? formatarData(ficha.data_entrega) : '-';
    const totalItens = calcularTotalItens(ficha.produtos || []);
    const isEvento = ficha.evento === 'sim';
    const isPendente = ficha.status === 'pendente';

    return `
    <div class="ficha-item ${isPendente ? '' : 'ficha-entregue'}">
      <div class="ficha-main">
        <div class="ficha-header">
          <span class="ficha-cliente">${ficha.cliente || 'Cliente não informado'}</span>
          ${ficha.numero_venda ? `<span class="ficha-numero">#${ficha.numero_venda}</span>` : ''}
          ${isEvento ? '<span class="ficha-evento-badge"><i class="fas fa-star"></i> Evento</span>' : ''}
          ${!isPendente ? '<span class="ficha-status-badge entregue"><i class="fas fa-check"></i> Entregue</span>' : ''}
        </div>

        <div class="ficha-details">
          ${ficha.vendedor ? `
            <div class="ficha-detail">
              <i class="fas fa-user"></i>
              <span>${ficha.vendedor}</span>
            </div>
          ` : ''}

          <div class="ficha-detail">
            <i class="fas fa-calendar"></i>
            <span>Início: ${dataInicio}</span>
          </div>

          <div class="ficha-detail">
            <i class="fas fa-calendar-check"></i>
            <span>Entrega: ${dataEntrega}</span>
          </div>

          <div class="ficha-detail">
            <i class="fas fa-boxes"></i>
            <span>${totalItens} ${totalItens === 1 ? 'item' : 'itens'}</span>
          </div>
        </div>
      </div>

      <div class="ficha-actions">
        ${isPendente ? `
          <button class="btn btn-success btn-entregar" data-id="${ficha.id}" title="Marcar como Entregue">
            <i class="fas fa-check-circle"></i>
          </button>
        ` : `
          <button class="btn btn-warning btn-desmarcar-entrega" data-id="${ficha.id}" title="Desmarcar como Entregue">
            <i class="fas fa-undo"></i>
          </button>
        `}
        <button class="btn btn-primary btn-visualizar" data-id="${ficha.id}" title="Visualizar">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-secondary btn-editar" data-id="${ficha.id}" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-deletar" data-id="${ficha.id}" title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
  }

  // Filtros

  function aplicarFiltros() {
    const searchInput = document.getElementById('searchInput');
    const filterDataInicio = document.getElementById('filterDataInicio');
    const filterDataFim = document.getElementById('filterDataFim');

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const dataInicio = filterDataInicio ? filterDataInicio.value : '';
    const dataFim = filterDataFim ? filterDataFim.value : '';
    
    // CORREÇÃO: Verificar se o elemento existe antes de acessar .id
    const btnAtivo = document.querySelector('.status-filter .btn.active');
    const filtroStatusAtivo = btnAtivo ? btnAtivo.id : 'btnFiltroTodos';

    fichasFiltradas = fichasCache.filter(ficha => {
      // Filtro de busca por texto
      if (searchTerm) {
        const cliente = (ficha.cliente || '').toLowerCase();
        const numeroVenda = (ficha.numero_venda || '').toLowerCase();
        const vendedor = (ficha.vendedor || '').toLowerCase();

        if (!cliente.includes(searchTerm) &&
          !numeroVenda.includes(searchTerm) &&
          !vendedor.includes(searchTerm)) {
          return false;
        }
      }

      // Filtro de data inicial
      if (dataInicio && ficha.data_inicio) {
        if (ficha.data_inicio < dataInicio) return false;
      }

      // Filtro de data final
      if (dataFim && ficha.data_inicio) {
        if (ficha.data_inicio > dataFim) return false;
      }

      // Filtro de status
      switch (filtroStatusAtivo) {
        case 'btnFiltroTodos':
          return true;
        case 'btnFiltroPendentes':
          return ficha.status === 'pendente';
        case 'btnFiltroEntregues':
          return ficha.status !== 'pendente';
        case 'btnFiltroEvento':
          return ficha.evento === 'sim';
        default:
          return true;
      }
    });

    paginaAtual = 1;
    renderizarPagina();
  }

  function limparFiltros() {
    const searchInput = document.getElementById('searchInput');
    const filterDataInicio = document.getElementById('filterDataInicio');
    const filterDataFim = document.getElementById('filterDataFim');
    const statusFilterBtns = document.querySelectorAll('.status-filter .btn');

    if (searchInput) searchInput.value = '';
    if (filterDataInicio) filterDataInicio.value = '';
    if (filterDataFim) filterDataFim.value = '';

    // Resetar filtro de status para "Todos"
    statusFilterBtns.forEach(btn => btn.classList.remove('active'));
    const btnTodos = document.getElementById('btnFiltroTodos');
    if (btnTodos) btnTodos.classList.add('active');

    window.history.replaceState({}, '', window.location.pathname);

    fichasFiltradas = [...fichasCache];
    paginaAtual = 1;
    renderizarPagina();
  }

  // Estatísticas

  async function atualizarEstatisticas() {
    try {
      const stats = await db.buscarEstatisticas();

      const statTotalFichas = document.getElementById('statTotalFichas');
      const statPendentes = document.getElementById('statPendentes');
      const statClientes = document.getElementById('statClientes');
      const statEsteMes = document.getElementById('statEsteMes');

      if (statTotalFichas) statTotalFichas.textContent = stats.totalFichas || 0;
      if (statPendentes) statPendentes.textContent = stats.pendentes || 0;
      if (statClientes) statClientes.textContent = stats.totalClientes || 0;
      if (statEsteMes) statEsteMes.textContent = stats.esteMes || 0;
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  // Ações

  function visualizarFicha(id) {
    window.location.href = `index.html?visualizar=${id}`;
  }

  function editarFicha(id) {
    window.location.href = `index.html?editar=${id}`;
  }

  async function marcarComoEntregue(id) {
    const confirmar = confirm('Deseja marcar este pedido como entregue?');
    if (!confirmar) return;

    try {
      await db.marcarComoEntregue(id);
      await carregarFichas();
      aplicarFiltros();
      await atualizarEstatisticas();
      mostrarSucesso('Pedido marcado como entregue!');
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      mostrarErro('Erro ao marcar pedido como entregue');
    }
  }

  function abrirModalDelete(id) {
    fichaParaDeletar = id;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'flex';
  }

  function fecharModalDelete() {
    fichaParaDeletar = null;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'none';
  }

  async function confirmarDelete() {
    if (!fichaParaDeletar) return;

    try {
      await db.deletarFicha(fichaParaDeletar);
      await carregarFichas();
      aplicarFiltros();
      await atualizarEstatisticas();
      fecharModalDelete();
      mostrarSucesso('Ficha excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar ficha:', error);
      mostrarErro('Erro ao excluir ficha');
    }
  }

  async function desmarcarComoEntregue(id) {
    const confirmar = confirm('Deseja desmarcar este pedido como entregue?');
    if (!confirmar) return;

    try {
      await db.marcarComoPendente(id);
      await carregarFichas();
      aplicarFiltros();
      await atualizarEstatisticas();
      mostrarSucesso('Pedido desmarcado como entregue!');
    } catch (error) {
      console.error('Erro ao desmarcar como entregue:', error);
      mostrarErro('Erro ao desmarcar pedido como entregue');
    }
  }

  // Backup

  async function exportarBackup() {
    try {
      const backup = await db.exportarBackup();

      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-fichas-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);

      mostrarSucesso('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      mostrarErro('Erro ao exportar backup');
    }
  }

  async function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const texto = await file.text();
      const dados = JSON.parse(texto);

      if (!dados.fichas || !Array.isArray(dados.fichas)) {
        throw new Error('Formato de backup inválido');
      }

      const confirmar = confirm(
        `Deseja importar ${dados.fichas.length} ficha(s)? ` +
        `Isso não apagará suas fichas existentes.`
      );

      if (!confirmar) return;

      await db.importarBackup(dados);
      await carregarFichas();
      await atualizarEstatisticas();

      mostrarSucesso(`${dados.fichas.length} ficha(s) importada(s) com sucesso!`);

    } catch (error) {
      console.error('Erro ao importar backup:', error);
      mostrarErro('Erro ao importar backup. Verifique o arquivo.');
    }

    event.target.value = '';
  }

  // Utilitários

  function formatarData(dataStr) {
    if (!dataStr) return '-';

    try {
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataStr;
    }
  }

  function calcularTotalItens(produtos) {
    if (!Array.isArray(produtos)) return 0;

    return produtos.reduce((total, p) => {
      const qtd = parseInt(p.quantidade) || 0;
      return total + qtd;
    }, 0);
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function mostrarSucesso(mensagem) {
    mostrarToast(mensagem, 'success');
  }

  function mostrarErro(mensagem) {
    mostrarToast(mensagem, 'error');
  }
})();