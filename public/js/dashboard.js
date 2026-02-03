/**
 * Dashboard de Fichas Técnicas - Versão com Backend
 */

(function () {
  'use strict';

  let fichasCache = [];
  let fichaParaDeletar = null;

  document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
    criarModalDelete();
  });

  async function initDashboard() {
    try {
      // Inicializar API
      await db.init();

      // Carregar fichas
      await carregarFichas();

      // Configurar event listeners
      initEventListeners();

      // Atualizar estatísticas
      await atualizarEstatisticas();

    } catch (error) {
      console.error('❌ Erro ao inicializar dashboard:', error);
      mostrarToast('Erro ao carregar dados do servidor', 'error');
    }
  }

  // Criar modal de delete moderno
  function criarModalDelete() {
    // Remover modal existente se houver
    const existente = document.getElementById('modalDeleteCustom');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modalDeleteCustom';
    modal.innerHTML = `
      <div class="modal-overlay-custom"></div>
      <div class="modal-container-custom">
        <div class="modal-icon-custom">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="modal-title-custom">Confirmar Exclusão</h3>
        <p class="modal-message-custom">Tem certeza que deseja excluir esta ficha?<br><strong>Esta ação não pode ser desfeita.</strong></p>
        <div class="modal-buttons-custom">
          <button class="btn-cancelar-custom" id="btnCancelarCustom">
            <i class="fas fa-times"></i>
            Cancelar
          </button>
          <button class="btn-confirmar-custom" id="btnConfirmarCustom">
            <i class="fas fa-trash"></i>
            Sim, Excluir
          </button>
        </div>
      </div>
    `;

    // Estilos do modal
    const styles = document.createElement('style');
    styles.textContent = `
      #modalDeleteCustom {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        align-items: center;
        justify-content: center;
      }

      #modalDeleteCustom.show {
        display: flex;
        animation: fadeIn 0.2s ease;
      }

      .modal-overlay-custom {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      .modal-container-custom {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
      }

      .modal-icon-custom {
        width: 70px;
        height: 70px;
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      }

      .modal-icon-custom i {
        font-size: 32px;
        color: #dc2626;
      }

      .modal-title-custom {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 12px;
      }

      .modal-message-custom {
        color: #6b7280;
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 28px;
      }

      .modal-message-custom strong {
        color: #dc2626;
      }

      .modal-buttons-custom {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .btn-cancelar-custom,
      .btn-confirmar-custom {
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        border: none;
      }

      .btn-cancelar-custom {
        background: #f3f4f6;
        color: #4b5563;
      }

      .btn-cancelar-custom:hover {
        background: #e5e7eb;
        transform: translateY(-1px);
      }

      .btn-confirmar-custom {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
      }

      .btn-confirmar-custom:hover {
        background: linear-gradient(135deg, #b91c1c, #991b1b);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes slideOut {
        from { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to { 
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
      }

      /* Toast styles */
      .toast-custom {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        animation: toastIn 0.4s ease;
      }

      .toast-custom.success {
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .toast-custom.error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }

      .toast-custom.warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .toast-custom i {
        font-size: 1.2rem;
      }

      @keyframes toastIn {
        from { 
          transform: translateX(100%);
          opacity: 0;
        }
        to { 
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes toastOut {
        from { 
          transform: translateX(0);
          opacity: 1;
        }
        to { 
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(modal);

    // Event listeners do modal
    document.getElementById('btnCancelarCustom').addEventListener('click', fecharModalDelete);
    document.getElementById('btnConfirmarCustom').addEventListener('click', confirmarDelete);
    document.querySelector('.modal-overlay-custom').addEventListener('click', fecharModalDelete);

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('modalDeleteCustom').classList.contains('show')) {
        fecharModalDelete();
      }
    });
  }

  function initEventListeners() {
    // Pesquisa
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    // Filtros de data
    const filterDataInicio = document.getElementById('filterDataInicio');
    const filterDataFim = document.getElementById('filterDataFim');
    filterDataInicio.addEventListener('change', aplicarFiltros);
    filterDataFim.addEventListener('change', aplicarFiltros);

    // Filtro de vendedor
    const filterVendedor = document.getElementById('filterVendedor');
    filterVendedor.addEventListener('change', aplicarFiltros);

    // Limpar filtros
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    btnLimparFiltros.addEventListener('click', limparFiltros);

    // Exportar backup
    const btnExportarBackup = document.getElementById('btnExportarBackup');
    btnExportarBackup.addEventListener('click', exportarBackup);

    // Importar backup
    const btnImportarBackup = document.getElementById('btnImportarBackup');
    btnImportarBackup.addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });

    const importFileInput = document.getElementById('importFileInput');
    importFileInput.addEventListener('change', importarBackup);
  }

  async function carregarFichas() {
    try {
      fichasCache = await db.listarFichas();
      renderizarFichas(fichasCache);
    } catch (error) {
      console.error('❌ Erro ao carregar fichas:', error);
      mostrarToast('Erro ao carregar fichas', 'error');
    }
  }

  async function atualizarDashboard() {
    await carregarFichas();
    await atualizarEstatisticas();
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

    // Event listeners
    container.querySelectorAll('.btn-visualizar').forEach(btn => {
      btn.addEventListener('click', () => visualizarFicha(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => editarFicha(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.btn-entregar').forEach(btn => {
      btn.addEventListener('click', () => marcarComoEntregue(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.btn-pendente').forEach(btn => {
      btn.addEventListener('click', () => marcarComoPendente(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.btn-deletar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalDelete(parseInt(btn.dataset.id)));
    });
  }

  function criarCardFicha(ficha) {
    const dataInicio = ficha.data_inicio ? formatarData(ficha.data_inicio) : '-';
    const dataEntrega = ficha.data_entrega ? formatarData(ficha.data_entrega) : '-';
    const totalItens = calcularTotalItens(ficha.produtos || []);
    const isEvento = ficha.evento === 'sim';
    const isPendente = ficha.status === 'pendente';

    return `
      <div class="ficha-item ${isPendente ? '' : 'ficha-entregue'}" data-id="${ficha.id}">
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
            <button class="btn btn-warning btn-pendente" data-id="${ficha.id}" title="Voltar para Pendente">
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

  async function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value;
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;
    const vendedor = document.getElementById('filterVendedor').value;

    try {
      const filtros = {};
      if (searchTerm) filtros.cliente = searchTerm;
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (vendedor) filtros.vendedor = vendedor;

      const fichasFiltradas = await db.listarFichas(filtros);

      fichasCache = fichasFiltradas;
      renderizarFichas(fichasFiltradas);
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
    }
  }

  function limparFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterVendedor').value = '';

    carregarFichas();
  }

  async function atualizarEstatisticas() {
    try {
      const stats = await db.buscarEstatisticas();

      document.getElementById('statTotalFichas').textContent = stats.totalFichas || 0;
      document.getElementById('statPendentes').textContent = stats.pendentes || 0;
      document.getElementById('statClientes').textContent = stats.totalClientes || 0;
      document.getElementById('statEsteMes').textContent = stats.esteMes || 0;
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  function visualizarFicha(id) {
    window.location.href = `index.html?visualizar=${id}`;
  }

  function editarFicha(id) {
    window.location.href = `index.html?editar=${id}`;
  }

  // Marcar como entregue SEM confirmação
  async function marcarComoEntregue(id) {
    try {
      await db.marcarComoEntregue(id);
      await atualizarDashboard();
      mostrarToast('Pedido marcado como entregue!', 'success');
    } catch (error) {
      console.error('❌ Erro ao marcar como entregue:', error);
      mostrarToast('Erro ao marcar pedido como entregue', 'error');
    }
  }

  // Marcar como pendente SEM confirmação
  async function marcarComoPendente(id) {
    try {
      await db.marcarComoPendente(id);
      await atualizarDashboard();
      mostrarToast('Pedido voltou para pendente!', 'warning');
    } catch (error) {
      console.error('❌ Erro ao marcar como pendente:', error);
      mostrarToast('Erro ao marcar pedido como pendente', 'error');
    }
  }

  // Deletar COM modal de confirmação moderno
  function abrirModalDelete(id) {
    fichaParaDeletar = id;
    document.getElementById('modalDeleteCustom').classList.add('show');
  }

  function fecharModalDelete() {
    const modal = document.getElementById('modalDeleteCustom');
    const container = modal.querySelector('.modal-container-custom');

    container.style.animation = 'slideOut 0.2s ease';

    setTimeout(() => {
      modal.classList.remove('show');
      container.style.animation = '';
      fichaParaDeletar = null;
    }, 200);
  }

  async function confirmarDelete() {
    if (!fichaParaDeletar) return;

    const id = fichaParaDeletar;

    try {
      // Desabilitar botão enquanto processa
      const btnConfirmar = document.getElementById('btnConfirmarCustom');
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

      await db.deletarFicha(id);

      fecharModalDelete();
      await atualizarDashboard();

      mostrarToast('Ficha excluída com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao deletar ficha:', error);
      mostrarToast('Erro ao excluir ficha', 'error');
    } finally {
      // Restaurar botão
      const btnConfirmar = document.getElementById('btnConfirmarCustom');
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML = '<i class="fas fa-trash"></i> Sim, Excluir';
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

      mostrarToast('Backup exportado com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar backup:', error);
      mostrarToast('Erro ao exportar backup', 'error');
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

      await db.importarBackup(dados);
      await atualizarDashboard();

      mostrarToast(`${dados.fichas.length} ficha(s) importada(s) com sucesso!`, 'success');

    } catch (error) {
      console.error('❌ Erro ao importar backup:', error);
      mostrarToast('Erro ao importar backup. Verifique o arquivo.', 'error');
    }

    event.target.value = '';
  }

  // UTILITÁRIOS

  function formatarData(dataStr) {
    if (!dataStr) return '-';

    try {
      const data = new Date(dataStr + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
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

  function mostrarToast(mensagem, tipo = 'success') {
    // Remover toast existente
    const existente = document.querySelector('.toast-custom');
    if (existente) existente.remove();

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = `toast-custom ${tipo}`;
    toast.innerHTML = `
      <i class="fas ${icons[tipo] || icons.success}"></i>
      <span>${mensagem}</span>
    `;

    document.body.appendChild(toast);

    // Remover após 3 segundos
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

})();