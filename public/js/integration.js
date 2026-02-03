/**
 * Integração do formulário com o banco de dados
 * Adiciona funcionalidades de salvar, carregar e autocomplete
 */

(function () {
  'use strict';

  let fichaAtualId = null;
  let modoVisualizacao = false;

  const camposBancoParaForm = {
    'id': 'id',
    'cliente': 'cliente',
    'vendedor': 'vendedor',
    'data_inicio': 'dataInicio',
    'numero_venda': 'numeroVenda',
    'data_entrega': 'dataEntrega',
    'evento': 'evento',
    'status': 'status',
    'material': 'material',
    'composicao': 'composicao',
    'cor_material': 'corMaterial',
    'manga': 'manga',
    'acabamento_manga': 'acabamentoManga',
    'largura_manga': 'larguraManga',
    'gola': 'gola',
    'acabamento_gola': 'acabamentoGola',
    'cor_peitilho_interno': 'corPeitilhoInterno',
    'cor_peitilho_externo': 'corPeitilhoExterno',
    'abertura_lateral': 'aberturaLateral',
    'reforco_gola': 'reforcoGola',
    'cor_reforco': 'corReforco',
    'bolso': 'bolso',
    'filete': 'filete',
    'faixa': 'faixa',
    'arte': 'arte',
    'cor_sublimacao': 'corSublimacao',
    'observacoes': 'observacoes',
    'imagens_data': 'imagensData',
    'imagem_data': 'imagemData',
    'produtos': 'produtos'
  };

  function converterBancoParaForm(fichaBanco) {
    const fichaForm = {};
    for (const [chaveBanco, valor] of Object.entries(fichaBanco)) {
      const chaveForm = camposBancoParaForm[chaveBanco] || chaveBanco;
      fichaForm[chaveForm] = valor;
    }
    return fichaForm;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await initDatabaseIntegration();
  });

  async function initDatabaseIntegration() {
    try {
      await db.init();
      console.log('✅ Integração com banco de dados inicializada');

      await initClienteAutocomplete();
      await verificarParametrosURL();
      configurarBotoesAcao();

    } catch (error) {
      console.error('❌ Erro na integração com banco de dados:', error);
    }
  }

  async function initClienteAutocomplete() {
    const inputCliente = document.getElementById('cliente');
    if (!inputCliente) return;

    let datalist = document.getElementById('clientesList');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'clientesList';
      inputCliente.parentNode.appendChild(datalist);
      inputCliente.setAttribute('list', 'clientesList');
    }

    const clientes = await db.buscarClientes();

    datalist.innerHTML = '';
    clientes.forEach(cliente => {
      const option = document.createElement('option');
      option.value = typeof cliente === 'object' ? cliente.nome : cliente;
      datalist.appendChild(option);
    });

    console.log(`✅ ${clientes.length} clientes carregados para autocomplete`);

    inputCliente.addEventListener('input', async (e) => {
      const termo = e.target.value;
      if (termo.length < 2) return;

      const clientesFiltrados = await db.buscarClientes(termo);

      datalist.innerHTML = '';
      clientesFiltrados.forEach(cliente => {
        const option = document.createElement('option');
        option.value = typeof cliente === 'object' ? cliente.nome : cliente;
        datalist.appendChild(option);
      });
    });
  }

  function configurarBotoesAcao() {
    const container = document.getElementById('acoesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (modoVisualizacao) {
      const btnImprimir = criarBotao('btnImprimir', 'btn-primary', 'fa-print', 'Imprimir', () => {
        if (typeof gerarVersaoImpressao === 'function') {
          gerarVersaoImpressao();
        } else {
          window.print();
        }
      });

      const btnDuplicar = criarBotao('btnDuplicar', 'btn-success', 'fa-copy', 'Duplicar Ficha', duplicarFicha);

      const btnEditar = criarBotao('btnEditar', 'btn-warning', 'fa-edit', 'Editar', () => {
        window.location.href = `index.html?editar=${fichaAtualId}`;
      });

      const btnDashboard = criarBotao('btnDashboard', 'btn-secondary', 'fa-chart-line', 'Dashboard', () => {
        window.location.href = 'dashboard.html';
      });
      btnDashboard.style.marginLeft = 'auto';

      container.appendChild(btnImprimir);
      container.appendChild(btnDuplicar);
      container.appendChild(btnEditar);
      container.appendChild(btnDashboard);

    } else if (fichaAtualId) {
      const btnAtualizar = criarBotao('btnSalvarDB', 'btn-success', 'fa-save', `Atualizar Ficha #${fichaAtualId}`, salvarNoBanco);

      const btnImprimir = criarBotao('btnImprimir', 'btn-warning', 'fa-print', 'Imprimir', () => {
        if (typeof gerarVersaoImpressao === 'function') {
          gerarVersaoImpressao();
        } else {
          window.print();
        }
      });

      const btnBaixar = criarBotao('btnBaixar', 'btn-secondary', 'fa-download', 'Baixar JSON', () => {
        if (typeof salvarFicha === 'function') salvarFicha();
      });

      const btnCarregar = criarBotao('btnCarregar', 'btn-secondary', 'fa-folder-open', 'Carregar JSON', () => {
        if (typeof carregarFichaDeArquivo === 'function') carregarFichaDeArquivo();
      });

      const btnDashboard = criarBotao('btnDashboard', 'btn-primary', 'fa-chart-line', 'Dashboard', () => {
        window.location.href = 'dashboard.html';
      });
      btnDashboard.style.marginLeft = 'auto';

      container.appendChild(btnAtualizar);
      container.appendChild(btnImprimir);
      container.appendChild(btnBaixar);
      container.appendChild(btnCarregar);
      container.appendChild(btnDashboard);

    } else {
      const btnSalvar = criarBotao('btnSalvarDB', 'btn-success', 'fa-save', 'Salvar Ficha', salvarNoBanco);

      const btnImprimir = criarBotao('btnImprimir', 'btn-warning', 'fa-print', 'Imprimir', () => {
        if (typeof gerarVersaoImpressao === 'function') {
          gerarVersaoImpressao();
        } else {
          window.print();
        }
      });

      const btnBaixar = criarBotao('btnBaixar', 'btn-secondary', 'fa-download', 'Baixar JSON', () => {
        if (typeof salvarFicha === 'function') salvarFicha();
      });

      const btnCarregar = criarBotao('btnCarregar', 'btn-secondary', 'fa-folder-open', 'Carregar JSON', () => {
        if (typeof carregarFichaDeArquivo === 'function') carregarFichaDeArquivo();
      });

      const btnDashboard = criarBotao('btnDashboard', 'btn-primary', 'fa-chart-line', 'Dashboard', () => {
        window.location.href = 'dashboard.html';
      });
      btnDashboard.style.marginLeft = 'auto';

      container.appendChild(btnSalvar);
      container.appendChild(btnImprimir);
      container.appendChild(btnBaixar);
      container.appendChild(btnCarregar);
      container.appendChild(btnDashboard);
    }
  }

  function criarBotao(id, classe, icone, texto, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = `btn ${classe}`;
    btn.innerHTML = `<i class="fas ${icone}"></i><span>${texto}</span>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  async function duplicarFicha() {
    try {
      habilitarCampos();

      const dados = coletarDadosFormulario();
      delete dados.id;

      if (dados.numeroVenda) {
        dados.numeroVenda = dados.numeroVenda + '-COPIA';
      }

      const novoId = await db.salvarFicha(dados);

      mostrarToast('Ficha duplicada com sucesso!', 'success');

      setTimeout(() => {
        window.location.href = `index.html?editar=${novoId}`;
      }, 1000);

    } catch (error) {
      console.error('❌ Erro ao duplicar ficha:', error);
      mostrarToast('Erro ao duplicar ficha', 'error');
    }
  }

  async function salvarNoBanco() {
    try {
      const dados = coletarDadosFormulario();

      if (!dados.cliente || !dados.cliente.trim()) {
        mostrarToast('Por favor, informe o nome do cliente', 'error');
        document.getElementById('cliente').focus();
        return;
      }

      if (fichaAtualId) {
        dados.id = fichaAtualId;
        console.log(`📝 Atualizando ficha existente #${fichaAtualId}`);
      } else {
        console.log('📝 Criando nova ficha');
      }

      const id = await db.salvarFicha(dados);

      if (!fichaAtualId) {
        fichaAtualId = id;

        const novaUrl = new URL(window.location.href);
        novaUrl.searchParams.set('editar', id);
        window.history.replaceState({}, '', novaUrl);

        const header = document.querySelector('header h1');
        if (header) {
          header.innerHTML = `<i class="fas fa-edit"></i> Editando Ficha #${fichaAtualId}`;
        }

        configurarBotoesAcao();
      }

      const acao = dados.id && dados.id === fichaAtualId ? 'atualizada' : 'salva';
      mostrarToast(`Ficha ${acao} com sucesso!`, 'success');

      await initClienteAutocomplete();

    } catch (error) {
      console.error('❌ Erro ao salvar ficha:', error);
      mostrarToast('Erro ao salvar ficha no banco de dados', 'error');
    }
  }

  function coletarDadosFormulario() {
    // Coletar imagens do novo sistema de múltiplas imagens
    let imagensData = [];
    if (typeof window.getImagens === 'function') {
      imagensData = window.getImagens();
    }

    // DEBUG: Log das imagens coletadas
    console.log('📸 Coletando imagens para salvar:', imagensData.length, 'imagem(ns)');

    const dados = {
      cliente: document.getElementById('cliente')?.value || '',
      vendedor: document.getElementById('vendedor')?.value || '',
      dataInicio: document.getElementById('dataInicio')?.value || '',
      numeroVenda: document.getElementById('numeroVenda')?.value || '',
      dataEntrega: document.getElementById('dataEntrega')?.value || '',
      evento: document.getElementById('evento')?.value || 'nao',
      produtos: coletarProdutos(),
      material: document.getElementById('material')?.value || '',
      composicao: document.getElementById('composicao')?.value || '',
      corMaterial: document.getElementById('corMaterial')?.value || '',
      manga: document.getElementById('manga')?.value || '',
      acabamentoManga: document.getElementById('acabamentoManga')?.value || '',
      larguraManga: document.getElementById('larguraManga')?.value || '',
      gola: document.getElementById('gola')?.value || '',
      acabamentoGola: document.getElementById('acabamentoGola')?.value || '',
      corPeitilhoInterno: document.getElementById('corPeitilhoInterno')?.value || '',
      corPeitilhoExterno: document.getElementById('corPeitilhoExterno')?.value || '',
      aberturaLateral: document.getElementById('aberturaLateral')?.checked ? 'sim' : 'nao',
      reforcoGola: document.getElementById('reforcoGola')?.checked ? 'sim' : 'nao',
      corReforco: document.getElementById('corReforco')?.value || '',
      bolso: document.getElementById('bolso')?.value || '',
      filete: document.getElementById('filete')?.value || '',
      faixa: document.getElementById('faixa')?.value || '',
      arte: document.getElementById('arte')?.value || '',
      corSublimacao: document.getElementById('cor')?.value || '#ffffff',
      observacoes: document.getElementById('observacoes')?.value || '',
      // NOVO: Salvar array de imagens como JSON string
      imagensData: JSON.stringify(imagensData),
      // Manter compatibilidade: primeira imagem no campo antigo
      imagemData: imagensData.length > 0 ? imagensData[0].src : ''
    };

    return dados;
  }

  function coletarProdutos() {
    const produtos = [];
    const rows = document.querySelectorAll('#produtosTable tr');

    rows.forEach(row => {
      const tamanho = row.querySelector('.tamanho')?.value || '';
      const quantidade = row.querySelector('.quantidade')?.value || '';
      const descricao = row.querySelector('.descricao')?.value || '';

      if (tamanho || quantidade || descricao) {
        produtos.push({ tamanho, quantidade, descricao });
      }
    });

    return produtos;
  }

  async function verificarParametrosURL() {
    const params = new URLSearchParams(window.location.search);

    const editarId = params.get('editar');
    const visualizarId = params.get('visualizar');

    if (editarId) {
      modoVisualizacao = false;
      await carregarFichaParaEdicao(parseInt(editarId));
    } else if (visualizarId) {
      modoVisualizacao = true;
      await carregarFichaParaVisualizacao(parseInt(visualizarId));
    }
  }

  async function carregarFichaParaEdicao(id) {
    try {
      const fichaBanco = await db.buscarFicha(id);

      if (!fichaBanco) {
        mostrarToast('Ficha não encontrada', 'error');
        window.location.href = 'dashboard.html';
        return;
      }

      fichaAtualId = id;
      console.log(`✅ Editando ficha #${fichaAtualId}`);

      // DEBUG: Log do que veio do banco
      console.log('📦 Dados brutos do banco:', fichaBanco);

      const ficha = converterBancoParaForm(fichaBanco);

      // DEBUG: Log após conversão
      console.log('🔄 Dados após conversão:', ficha);

      setTimeout(() => {
        preencherFormulario(ficha);
        configurarBotoesAcao();
      }, 100);

      const header = document.querySelector('header h1');
      if (header) {
        header.innerHTML = `<i class="fas fa-edit"></i> Editando Ficha #${id}`;
      }

    } catch (error) {
      console.error('❌ Erro ao carregar ficha:', error);
      mostrarToast('Erro ao carregar ficha para edição', 'error');
    }
  }

  async function carregarFichaParaVisualizacao(id) {
    try {
      const fichaBanco = await db.buscarFicha(id);

      if (!fichaBanco) {
        mostrarToast('Ficha não encontrada', 'error');
        window.location.href = 'dashboard.html';
        return;
      }

      fichaAtualId = id;
      console.log(`✅ Visualizando ficha #${fichaAtualId}`);

      // DEBUG: Log do que veio do banco
      console.log('📦 Dados brutos do banco:', fichaBanco);

      const ficha = converterBancoParaForm(fichaBanco);

      // DEBUG: Log após conversão
      console.log('🔄 Dados após conversão:', ficha);

      setTimeout(() => {
        preencherFormulario(ficha);
        desabilitarCampos();
        configurarBotoesAcao();
      }, 100);

      const header = document.querySelector('header h1');
      if (header) {
        header.innerHTML = `<i class="fas fa-eye"></i> Visualizando Ficha #${id}`;
      }

      document.body.classList.add('modo-visualizacao');

    } catch (error) {
      console.error('❌ Erro ao carregar ficha:', error);
      mostrarToast('Erro ao carregar ficha para visualização', 'error');
    }
  }

  function desabilitarCampos() {
    const campos = document.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
      campo.disabled = true;
      campo.style.opacity = '0.8';
      campo.style.cursor = 'not-allowed';
    });

    const botoesOcultar = document.querySelectorAll('#adicionarProduto, #ordenarProdutos, .remover-produto, .duplicar-produto, #imageUpload, .btn-add-produto, .image-delete-btn, .image-drag-handle, .drag-handle');
    botoesOcultar.forEach(btn => {
      btn.style.display = 'none';
    });

    const style = document.createElement('style');
    style.id = 'estiloVisualizacao';
    style.textContent = `
      .modo-visualizacao .card {
        position: relative;
      }
      .modo-visualizacao input:disabled,
      .modo-visualizacao select:disabled,
      .modo-visualizacao textarea:disabled {
        background-color: #f8f9fa !important;
        border-color: #e9ecef !important;
      }
      .modo-visualizacao .image-card {
        pointer-events: none;
      }
      .modo-visualizacao .image-delete-btn,
      .modo-visualizacao .image-drag-handle {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function habilitarCampos() {
    const campos = document.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
      campo.disabled = false;
      campo.style.opacity = '1';
      campo.style.cursor = '';
    });

    const botoesOcultar = document.querySelectorAll('#adicionarProduto, #ordenarProdutos, .remover-produto, .duplicar-produto, #imageUpload, .btn-add-produto');
    botoesOcultar.forEach(btn => {
      btn.style.display = '';
    });

    const estilo = document.getElementById('estiloVisualizacao');
    if (estilo) estilo.remove();

    document.body.classList.remove('modo-visualizacao');
  }

  // ==================== FUNÇÃO CORRIGIDA PARA PARSEAR IMAGENS ====================

  function parsearImagensData(imagensData) {
    // Se não tem dados, retorna array vazio
    if (!imagensData) {
      console.log('📸 imagensData está vazio/null');
      return [];
    }

    // Se já é um array, retorna direto
    if (Array.isArray(imagensData)) {
      console.log('📸 imagensData já é array com', imagensData.length, 'item(ns)');
      return imagensData;
    }

    // Se é string
    if (typeof imagensData === 'string') {
      // String vazia
      if (imagensData.trim() === '') {
        console.log('📸 imagensData é string vazia');
        return [];
      }

      // String "[]" 
      if (imagensData.trim() === '[]') {
        console.log('📸 imagensData é "[]"');
        return [];
      }

      // Tentar parsear JSON
      try {
        const parsed = JSON.parse(imagensData);

        // Verificar se o resultado é array
        if (Array.isArray(parsed)) {
          console.log('📸 imagensData parseado com sucesso:', parsed.length, 'imagem(ns)');
          return parsed;
        }

        // Se parseou mas não é array, pode ser outro tipo de dado
        console.warn('📸 imagensData parseado mas não é array:', typeof parsed);
        return [];

      } catch (e) {
        console.warn('📸 Erro ao parsear imagensData:', e.message);
        console.warn('📸 Conteúdo original:', imagensData.substring(0, 100) + '...');
        return [];
      }
    }

    console.warn('📸 imagensData tem tipo inesperado:', typeof imagensData);
    return [];
  }

  function preencherFormulario(ficha) {
    console.log('🔧 Preenchendo formulário com:', ficha);

    const camposTexto = [
      'cliente', 'vendedor', 'dataInicio', 'numeroVenda', 
      'dataEntrega', 'evento', 'material', 'composicao',
      'corMaterial', 'manga', 'acabamentoManga', 'larguraManga',
      'gola', 'acabamentoGola', 'corPeitilhoInterno', 'corPeitilhoExterno',
      'corReforco', 'bolso', 'filete', 'faixa', 'arte', 'observacoes'
    ];

    camposTexto.forEach(campo => {
      const elemento = document.getElementById(campo);
      const valor = ficha[campo];

      if (elemento && valor !== undefined && valor !== null) {
        elemento.value = valor;
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const checkboxes = ['aberturaLateral', 'reforcoGola'];
    checkboxes.forEach(campo => {
      const elemento = document.getElementById(campo);
      const valor = ficha[campo];

      if (elemento) {
        elemento.checked = valor === 'sim' || valor === true || valor === 1 || valor === '1';
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const corSublimacao = ficha.corSublimacao || ficha.cor_sublimacao;
    if (corSublimacao) {
      const corInput = document.getElementById('cor');
      const corPreview = document.getElementById('corPreview');

      if (corInput) corInput.value = corSublimacao;
      if (corPreview) corPreview.style.backgroundColor = corSublimacao;
    }

    // Preencher produtos
    const produtos = ficha.produtos;
    if (produtos) {
      const produtosArray = typeof produtos === 'string' ? JSON.parse(produtos) : produtos;

      if (Array.isArray(produtosArray) && produtosArray.length > 0) {
        const tbody = document.getElementById('produtosTable');
        if (tbody) {
          tbody.innerHTML = '';

          produtosArray.forEach(produto => {
            if (typeof window.adicionarProduto === 'function') {
              window.adicionarProduto();

              const rows = tbody.querySelectorAll('tr');
              const ultimaLinha = rows[rows.length - 1];

              if (ultimaLinha) {
                const selectTamanho = ultimaLinha.querySelector('.tamanho');
                const inputQuantidade = ultimaLinha.querySelector('.quantidade');
                const inputDescricao = ultimaLinha.querySelector('.descricao');

                if (selectTamanho) selectTamanho.value = produto.tamanho || '';
                if (inputQuantidade) inputQuantidade.value = produto.quantidade || '';
                if (inputDescricao) inputDescricao.value = produto.descricao || '';
              }
            }
          });

          if (typeof window.atualizarTotalItens === 'function') {
            window.atualizarTotalItens();
          }
        }
      }
    }

    // ==================== CORREÇÃO: Carregar múltiplas imagens ====================
    if (typeof window.setImagens === 'function') {
      let imagensCarregadas = [];

      // DEBUG: Mostrar o que veio em cada campo
      console.log('📸 DEBUG - Campos de imagem recebidos:');
      console.log('  - ficha.imagensData:', typeof ficha.imagensData, ficha.imagensData ? (typeof ficha.imagensData === 'string' ? ficha.imagensData.substring(0,50) + '...' : ficha.imagensData) : '(vazio)');
      console.log('  - ficha.imagens_data:', typeof ficha.imagens_data, ficha.imagens_data ? (typeof ficha.imagens_data === 'string' ? ficha.imagens_data.substring(0,50) + '...' : ficha.imagens_data) : '(vazio)');
      console.log('  - ficha.imagemData:', typeof ficha.imagemData, ficha.imagemData ? ficha.imagemData.substring(0,50) + '...' : '(vazio)');
      console.log('  - ficha.imagem_data:', typeof ficha.imagem_data, ficha.imagem_data ? ficha.imagem_data.substring(0,50) + '...' : '(vazio)');

      // 1. Tentar carregar do novo formato (imagensData)
      const imagensDataRaw = ficha.imagensData || ficha.imagens_data;
      imagensCarregadas = parsearImagensData(imagensDataRaw);

      // 2. Se não conseguiu do novo formato, tentar formato antigo
      if (imagensCarregadas.length === 0) {
        console.log('📸 Tentando fallback para formato antigo...');

        const imagemData = ficha.imagemData || ficha.imagem_data;

        if (imagemData && typeof imagemData === 'string' && imagemData.length > 0) {
          // Verificar se é base64 válido
          if (imagemData.startsWith('data:image')) {
            console.log('📸 Usando fallback: imagem única do campo antigo');
            imagensCarregadas = [{ src: imagemData, descricao: '' }];
          } else {
            console.log('📸 Campo imagemData não é base64 válido');
          }
        }
      }

      // Setar imagens no sistema
      window.setImagens(imagensCarregadas);
      console.log(`✅ ${imagensCarregadas.length} imagem(ns) carregada(s) no formulário`);
    } else {
      console.warn('⚠️ window.setImagens não está disponível');
    }

    console.log('✅ Formulário preenchido!');
  }

  function mostrarToast(mensagem, tipo = 'success') {
    const existente = document.querySelector('.toast-custom');
    if (existente) existente.remove();

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle'
    };

    const cores = {
      success: 'linear-gradient(135deg, #10b981, #059669)',
      error: 'linear-gradient(135deg, #ef4444, #dc2626)',
      warning: 'linear-gradient(135deg, #f59e0b, #d97706)'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-custom';
    toast.innerHTML = `<i class="fas ${icons[tipo]}"></i><span>${mensagem}</span>`;
    toast.style.cssText = `
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
      background: ${cores[tipo]};
      animation: toastIn 0.4s ease;
    `;

    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        @keyframes toastIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  window.dbIntegration = {
    salvarNoBanco,
    coletarDadosFormulario,
    converterBancoParaForm,
    getFichaAtualId: () => fichaAtualId,
    isModoVisualizacao: () => modoVisualizacao
  };

})();