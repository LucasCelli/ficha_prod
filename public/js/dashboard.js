/**
 * Dashboard de Fichas Técnicas
 */

(function () {
  'use strict';

  let fichasCache = [];
  let fichaParaDeletar = null;

  document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
  });

  async function initDashboard() {
    try {
      await db.init();
      await carregarFichas();
      initEventListeners();
      await atualizarEstatisticas();
      verificarParametrosURL();
    } catch (error) {
      mostrarErro('Erro ao carregar dados do servidor');
    }
  }

  function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    const filterDataInicio = document.getElementById('filterDataInicio');
    const filterDataFim = document.getElementById('filterDataFim');
    filterDataInicio.addEventListener('change', aplicarFiltros);
    filterDataFim.addEventListener('change', aplicarFiltros);

    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    btnLimparFiltros.addEventListener('click', limparFiltros);

    const btnExportarBackup = document.getElementById('btnExportarBackup');
    btnExportarBackup.addEventListener('click', exportarBackup);

    const btnImportarBackup = document.getElementById('btnImportarBackup');
    btnImportarBackup.addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });

    const importFileInput = document.getElementById('importFileInput');
    importFileInput.addEventListener('change', importarBackup);

    const btnCancelarDelete = document.getElementById('btnCancelarDelete');
    const btnConfirmarDelete = document.getElementById('btnConfirmarDelete');
    btnCancelarDelete.addEventListener('click', fecharModalDelete);
    btnConfirmarDelete.addEventListener('click', confirmarDelete);

    document.querySelector('#deleteModal .modal-overlay').addEventListener('click', fecharModalDelete);
  }

  function verificarParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const clienteFiltro = params.get('cliente');

    if (clienteFiltro) {
      document.getElementById('searchInput').value = clienteFiltro;
      aplicarFiltros();
    }
  }

  async function carregarFichas() {
    try {
      fichasCache = await db.listarFichas();
      renderizarFichas(fichasCache);
    } catch (error) {
      mostrarErro('Erro ao carregar fichas');
    }
  }

  function renderizarFichas(fichas) {
    const container = document.getElementById('fichasContainer');
    const emptyState = document.getElementById('emptyState');
    const resultadosCount = document.getElementById('resultadosCount');

    resultadosCount.textContent = `${fichas.length} ${fichas.length === 1 ? 'resultado' : 'resultados'}`;

    if (!fichas || fichas.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

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
          ` : ''}
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

  async function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;

    let fichasFiltradas = fichasCache.filter(ficha => {
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

      if (dataInicio && ficha.data_inicio) {
        if (ficha.data_inicio < dataInicio) return false;
      }

      if (dataFim && ficha.data_inicio) {
        if (ficha.data_inicio > dataFim) return false;
      }

      return true;
    });

    renderizarFichas(fichasFiltradas);
  }

  function limparFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';

    window.history.replaceState({}, '', window.location.pathname);

    renderizarFichas(fichasCache);
  }

  async function atualizarEstatisticas() {
    try {
      const stats = await db.buscarEstatisticas();

      document.getElementById('statTotalFichas').textContent = stats.totalFichas || 0;
      document.getElementById('statPendentes').textContent = stats.pendentes || 0;
      document.getElementById('statClientes').textContent = stats.totalClientes || 0;
      document.getElementById('statEsteMes').textContent = stats.esteMes || 0;
    } catch (error) {}
  }

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
      await atualizarEstatisticas();
      mostrarSucesso('Pedido marcado como entregue!');
    } catch (error) {
      mostrarErro('Erro ao marcar pedido como entregue');
    }
  }

  function abrirModalDelete(id) {
    fichaParaDeletar = id;
    document.getElementById('deleteModal').style.display = 'flex';
  }

  function fecharModalDelete() {
    fichaParaDeletar = null;
    document.getElementById('deleteModal').style.display = 'none';
  }

  async function confirmarDelete() {
    if (!fichaParaDeletar) return;

    try {
      await db.deletarFicha(fichaParaDeletar);
      await carregarFichas();
      await atualizarEstatisticas();
      fecharModalDelete();
      mostrarSucesso('Ficha excluída com sucesso!');
    } catch (error) {
      mostrarErro('Erro ao excluir ficha');
    }
  }

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