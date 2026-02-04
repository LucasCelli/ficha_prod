/**
 * Gestão de Clientes - Seguindo padrão do Dashboard
 */

(function() {
  'use strict';

  let clientesCache = [];
  let clientesFiltrados = [];
  let paginaAtual = 1;
  const itensPorPagina = 15;
  let ordenacaoAtual = 'nome_asc';
  let clienteParaDeletar = null;

  document.addEventListener('DOMContentLoaded', async () => {
    await initClientes();
  });

  async function initClientes() {
    try {
      await db.init();
      console.log('✅ Página de clientes inicializada');

      await carregarClientes();
      initEventListeners();
    } catch (error) {
      console.error('❌ Erro ao inicializar:', error);
      mostrarToast('Erro ao conectar com o servidor', 'error');
    }
  }

  function initEventListeners() {
    // Busca
    const searchInput = document.getElementById('searchCliente');
    searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    // Ordenação
    const ordenarSelect = document.getElementById('ordenarPor');
    ordenarSelect.addEventListener('change', (e) => {
      ordenacaoAtual = e.target.value;
      aplicarFiltros();
    });

    // Limpar filtros
    document.getElementById('btnLimparFiltros').addEventListener('click', limparFiltros);

    // Paginação
    document.getElementById('btnPrevPage').addEventListener('click', () => mudarPagina(-1));
    document.getElementById('btnNextPage').addEventListener('click', () => mudarPagina(1));

    // Modal de edição
    document.getElementById('editForm').addEventListener('submit', salvarEdicao);
    document.getElementById('btnCancelarEdit').addEventListener('click', fecharModalEdit);
    document.querySelector('#editModal .modal-overlay').addEventListener('click', fecharModalEdit);

    // Modal de exclusão
    document.getElementById('btnCancelarDelete').addEventListener('click', fecharModalDelete);
    document.getElementById('btnConfirmarDelete').addEventListener('click', confirmarDelete);
    document.querySelector('#deleteModal .modal-overlay').addEventListener('click', fecharModalDelete);
  }

  async function carregarClientes() {
    try {
      const response = await fetch(db.baseURL + '/clientes/lista');

      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }

      clientesCache = await response.json();

      // Atualizar estatísticas
      atualizarEstatisticas();

      // Aplicar filtros e renderizar
      aplicarFiltros();

    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      mostrarToast('Erro ao carregar clientes', 'error');
    }
  }

  function atualizarEstatisticas() {
    const totalClientes = clientesCache.length;
    const totalPedidos = clientesCache.reduce((sum, c) => sum + (c.total_pedidos || 0), 0);
    const mediaPedidos = totalClientes > 0 ? (totalPedidos / totalClientes).toFixed(1) : 0;

    // Clientes novos este mês
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const novosEsteMes = clientesCache.filter(c => 
      c.primeiro_pedido && c.primeiro_pedido.startsWith(mesAtual)
    ).length;

    document.getElementById('statTotalClientes').textContent = totalClientes;
    document.getElementById('statTotalPedidos').textContent = totalPedidos;
    document.getElementById('statNovosClientes').textContent = novosEsteMes;
    document.getElementById('statMediaPedidos').textContent = mediaPedidos;
  }

  function aplicarFiltros() {
    const termoBusca = document.getElementById('searchCliente').value.toLowerCase().trim();

    // Filtrar
    clientesFiltrados = clientesCache.filter(cliente => {
      if (termoBusca && !cliente.nome.toLowerCase().includes(termoBusca)) {
        return false;
      }
      return true;
    });

    // Ordenar
    ordenarClientes();

    // Resetar para página 1
    paginaAtual = 1;

    // Renderizar
    renderizarClientes();
    atualizarPaginacao();
  }

  function ordenarClientes() {
    const [campo, direcao] = ordenacaoAtual.includes('_') 
      ? ordenacaoAtual.split('_') 
      : [ordenacaoAtual, 'asc'];

    const multiplicador = direcao === 'desc' ? -1 : 1;

    clientesFiltrados.sort((a, b) => {
      let valorA, valorB;

      switch (campo) {
        case 'nome':
          valorA = (a.nome || '').toLowerCase();
          valorB = (b.nome || '').toLowerCase();
          return multiplicador * valorA.localeCompare(valorB, 'pt-BR');

        case 'pedidos':
          valorA = a.total_pedidos || 0;
          valorB = b.total_pedidos || 0;
          return multiplicador * (valorA - valorB);

        case 'recente':
          valorA = a.ultimo_pedido || '';
          valorB = b.ultimo_pedido || '';
          return -1 * valorA.localeCompare(valorB);

        case 'antigo':
          valorA = a.primeiro_pedido || '';
          valorB = b.primeiro_pedido || '';
          return valorA.localeCompare(valorB);

        default:
          return 0;
      }
    });
  }

  function renderizarClientes() {
    const container = document.getElementById('clientesContainer');
    const emptyState = document.getElementById('emptyState');
    const resultadosCount = document.getElementById('resultadosCount');

    // Atualizar contador
    resultadosCount.textContent = `${clientesFiltrados.length} ${clientesFiltrados.length === 1 ? 'resultado' : 'resultados'}`;

    if (clientesFiltrados.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      document.getElementById('paginacao').style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';

    // Paginação
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const clientesPagina = clientesFiltrados.slice(inicio, fim);

    container.innerHTML = clientesPagina.map(cliente => criarCardCliente(cliente)).join('');

    // Event listeners para os botões
    container.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        abrirModalEdit(id);
      });
    });

    container.querySelectorAll('.btn-fichas').forEach(btn => {
      btn.addEventListener('click', () => {
        const nome = btn.dataset.nome;
        verFichasCliente(nome);
      });
    });

    container.querySelectorAll('.btn-deletar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const nome = btn.dataset.nome;
        abrirModalDelete(id, nome);
      });
    });

    // Mostrar paginação
    document.getElementById('paginacao').style.display = clientesFiltrados.length > itensPorPagina ? 'flex' : 'none';
  }

  function criarCardCliente(cliente) {
    const primeiroPedido = formatarData(cliente.primeiro_pedido);
    const ultimoPedido = formatarData(cliente.ultimo_pedido);
    const totalPedidos = cliente.total_pedidos || 0;

    return `
      <div class="ficha-item">
        <div class="ficha-main">
          <div class="ficha-header">
            <span class="ficha-cliente">${escapeHtml(cliente.nome)}</span>
            <span class="ficha-numero">${totalPedidos} ${totalPedidos === 1 ? 'pedido' : 'pedidos'}</span>
          </div>

          <div class="ficha-details">
            <div class="ficha-detail">
              <i class="fas fa-calendar-plus"></i>
              <span>Primeiro: ${primeiroPedido}</span>
            </div>

            <div class="ficha-detail">
              <i class="fas fa-calendar-check"></i>
              <span>Último: ${ultimoPedido}</span>
            </div>
          </div>
        </div>

        <div class="ficha-actions">
          <button class="btn btn-primary btn-editar" data-id="${cliente.id}" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-secondary btn-fichas" data-nome="${escapeHtml(cliente.nome)}" title="Ver Fichas">
            <i class="fas fa-file-alt"></i>
          </button>
          <button class="btn btn-danger btn-deletar" data-id="${cliente.id}" data-nome="${escapeHtml(cliente.nome)}" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  function atualizarPaginacao() {
    const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina) || 1;

    document.getElementById('pageInfo').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btnPrevPage').disabled = paginaAtual <= 1;
    document.getElementById('btnNextPage').disabled = paginaAtual >= totalPaginas;
  }

  function mudarPagina(delta) {
    const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina) || 1;
    paginaAtual = Math.max(1, Math.min(totalPaginas, paginaAtual + delta));
    renderizarClientes();
    atualizarPaginacao();
  }

  function limparFiltros() {
    document.getElementById('searchCliente').value = '';
    document.getElementById('ordenarPor').value = 'nome_asc';
    ordenacaoAtual = 'nome_asc';
    aplicarFiltros();
  }

  // ==================== MODAL EDITAR ====================

  function abrirModalEdit(id) {
    const cliente = clientesCache.find(c => c.id === id);
    if (!cliente) return;

    document.getElementById('editId').value = id;
    document.getElementById('editNome').value = cliente.nome || '';
    document.getElementById('editPrimeiroPedido').value = cliente.primeiro_pedido || '';
    document.getElementById('editUltimoPedido').value = cliente.ultimo_pedido || '';

    document.getElementById('editModal').style.display = 'flex';
  }

  function fecharModalEdit() {
    document.getElementById('editModal').style.display = 'none';
  }

  async function salvarEdicao(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const dados = {
      nome: document.getElementById('editNome').value.trim(),
      primeiro_pedido: document.getElementById('editPrimeiroPedido').value || null,
      ultimo_pedido: document.getElementById('editUltimoPedido').value || null
    };

    if (!dados.nome) {
      mostrarToast('Nome do cliente é obrigatório', 'error');
      return;
    }

    try {
      const response = await fetch(`${db.baseURL}/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar');
      }

      mostrarToast('Cliente atualizado com sucesso!', 'success');
      fecharModalEdit();
      await carregarClientes();

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      mostrarToast(error.message || 'Erro ao atualizar cliente', 'error');
    }
  }

  // ==================== MODAL DELETE ====================

  function abrirModalDelete(id, nome) {
    clienteParaDeletar = id;
    document.getElementById('deleteClienteNome').textContent = nome;
    document.getElementById('deleteModal').style.display = 'flex';
  }

  function fecharModalDelete() {
    document.getElementById('deleteModal').style.display = 'none';
    clienteParaDeletar = null;
  }

  async function confirmarDelete() {
    if (!clienteParaDeletar) return;

    try {
      const response = await fetch(`${db.baseURL}/clientes/${clienteParaDeletar}`, {
        method: 'DELETE'
      });

      // Verificar content-type antes de tentar parsear JSON
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        let errorMsg = 'Erro ao excluir cliente';
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            errorMsg = error.error || errorMsg;
          } catch (e) {
            // Ignorar erro de parse
          }
        }
        throw new Error(errorMsg);
      }

      mostrarToast('Cliente excluído com sucesso!', 'success');
      fecharModalDelete();
      await carregarClientes();

    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      // Evitar mostrar erro de parse JSON no toast
      const msg = error.message || 'Erro ao excluir cliente';
      const msgLimpa = msg.includes('Unexpected token') ? 'Erro ao excluir cliente' : msg;
      mostrarToast(msgLimpa, 'error');
    }
  }

  // ==================== VER FICHAS ====================

  function verFichasCliente(nomeCliente) {
    window.location.href = `dashboard.html?cliente=${encodeURIComponent(nomeCliente)}`;
  }

  // ==================== UTILITÁRIOS ====================

  function formatarData(dataISO) {
    if (!dataISO) return '-';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
})();