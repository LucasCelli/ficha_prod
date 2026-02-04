(function () {
  'use strict';

  const CATALOG_URL = 'data/catalogo.json';
  const MAX_IMAGES = 4;

  let catalog = {
    tamanhos: [],
    produtos: [],
    materiais: []
  };

  // Array para armazenar as imagens
  let imagens = [];

  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  async function initApp() {
    await loadCatalog();
    initDefaultDates();
    initEventoAlert();
    initCatalogInUI();
    initProductTable();
    initTotals();
    initSpecsAutoFill();
    initGolaControls();
    initArtColorControls();
    initFileteFaixaControls();
    initIconPreview();
    initMultipleImages();
    initSaveLoad();
    initPrint();
    initPrazoCalculator();
  }

  async function loadCatalog() {
    try {
      const response = await fetch(CATALOG_URL);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      catalog = data;

      console.log('✅ Catálogo carregado com sucesso:', catalog);

    } catch (error) {
      console.error('❌ Erro ao carregar catálogo:', error);
      console.warn('⚠️ Usando dados de fallback mínimos');

      catalog = {
        tamanhos: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
        produtos: ['Camiseta Básica', 'Polo', 'Baby Look'],
        materiais: [
          {
            id: 'malha_fria_pv',
            nome: 'Malha Fria (PV)',
            composicao: '65% Poliéster / 35% Viscose'
          },
          {
            id: 'dry_fit',
            nome: 'Dry Fit',
            composicao: '100% Poliéster'
          }
        ]
      };
    }
  }

  function initCatalogInUI() {
    preencherProdutosList();
    preencherMateriaisDatalist();
    preencherTamanhosDatalist();
  }

  function preencherProdutosList() {
    const datalist = document.getElementById('produtosList');
    if (!datalist) return;

    datalist.innerHTML = '';

    if (!catalog.produtos || catalog.produtos.length === 0) {
      console.warn('⚠️ Nenhum produto encontrado no catálogo');
      return;
    }

    catalog.produtos.forEach(prod => {
      const opt = document.createElement('option');
      opt.value = prod;
      datalist.appendChild(opt);
    });

    console.log(`✅ ${catalog.produtos.length} produtos carregados no datalist`);
  }

  function preencherMateriaisDatalist() {
    const datalist = document.getElementById('materiaisList');
    if (!datalist) return;

    datalist.innerHTML = '';

    if (!catalog.materiais || catalog.materiais.length === 0) {
      console.warn('⚠️ Nenhum material encontrado no catálogo');
      return;
    }

    catalog.materiais.forEach(mat => {
      const opt = document.createElement('option');
      opt.value = mat.nome;
      opt.dataset.composicao = mat.composicao || '';
      datalist.appendChild(opt);
    });

    console.log(`✅ ${catalog.materiais.length} materiais carregados no datalist`);
  }

  function preencherTamanhosDatalist() {
    let datalist = document.getElementById('tamanhosList');

    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'tamanhosList';
      document.body.appendChild(datalist);
    }

    datalist.innerHTML = '';

    if (!catalog.tamanhos || catalog.tamanhos.length === 0) {
      console.warn('⚠️ Nenhum tamanho encontrado no catálogo');
      return;
    }

    catalog.tamanhos.forEach(tam => {
      const opt = document.createElement('option');
      opt.value = tam;
      datalist.appendChild(opt);
    });

    console.log(`✅ ${catalog.tamanhos.length} tamanhos carregados no datalist`);
  }

  function initDefaultDates() {
    const hoje = new Date();
    const dataInicio = document.getElementById('dataInicio');
    const dataEntrega = document.getElementById('dataEntrega');

    if (dataInicio && !dataInicio.value) {
      dataInicio.valueAsDate = hoje;
    }

    if (dataEntrega && !dataEntrega.value) {
      const umaSemanaDepois = new Date(hoje);
      umaSemanaDepois.setDate(hoje.getDate() + 7);
      dataEntrega.valueAsDate = umaSemanaDepois;
    }
  }

  function initEventoAlert() {
    const eventoSelect = document.getElementById('evento');
    const alertDiv = document.getElementById('eventoAlert');
    if (!eventoSelect || !alertDiv) return;

    function atualizar() {
      alertDiv.style.display = eventoSelect.value === 'sim' ? 'flex' : 'none';
    }

    eventoSelect.addEventListener('change', atualizar);
    atualizar();
  }

  function initPrazoCalculator() {
    const dataInicio = document.getElementById('dataInicio');
    const dataEntrega = document.getElementById('dataEntrega');
    const prazoInfo = document.getElementById('prazoInfo');
    const prazoTexto = document.getElementById('prazoTexto');

    if (!dataInicio || !dataEntrega || !prazoInfo || !prazoTexto) return;

    function calcularPrazo() {
      const inicio = dataInicio.value;
      const entrega = dataEntrega.value;

      if (!inicio || !entrega) {
        prazoInfo.style.display = 'none';
        return;
      }

      const dateInicio = new Date(inicio);
      const dateEntrega = new Date(entrega);

      const diffTime = dateEntrega - dateInicio;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        prazoTexto.textContent = 'A data de entrega é anterior à data de início!';
        prazoInfo.className = 'prazo-info urgente';
        prazoInfo.style.display = 'flex';
      } else if (diffDays === 0) {
        prazoTexto.textContent = 'Entrega no mesmo dia!';
        prazoInfo.className = 'prazo-info urgente';
        prazoInfo.style.display = 'flex';
      } else if (diffDays <= 3) {
        prazoTexto.textContent = `Prazo curto: ${diffDays} dia${diffDays > 1 ? 's' : ''} para produção`;
        prazoInfo.className = 'prazo-info urgente';
        prazoInfo.style.display = 'flex';
      } else {
        prazoTexto.textContent = `Prazo: ${diffDays} dia${diffDays > 1 ? 's' : ''} para produção`;
        prazoInfo.className = 'prazo-info';
        prazoInfo.style.display = 'flex';
      }
    }

    dataInicio.addEventListener('change', calcularPrazo);
    dataEntrega.addEventListener('change', calcularPrazo);
    calcularPrazo();
  }

  // ==================== DRAG AND DROP (PRODUTOS) ====================

  let draggedRow = null;
  let dropPosition = null;
  let isDragging = false;

  function initDragAndDrop(tabelaBody) {
    tabelaBody.addEventListener('mousedown', handleMouseDown);
    tabelaBody.addEventListener('dragstart', handleDragStart);
    tabelaBody.addEventListener('dragend', handleDragEnd);
    tabelaBody.addEventListener('dragover', handleDragOver);
    tabelaBody.addEventListener('dragleave', handleDragLeave);
    tabelaBody.addEventListener('drop', handleDrop);
  }

  function handleMouseDown(e) {
    const handle = e.target.closest('.drag-handle');
    const row = e.target.closest('tr');

    if (handle && row) {
      row.draggable = true;
      isDragging = true;
    } else if (row) {
      row.draggable = false;
      isDragging = false;
    }
  }

  function handleDragStart(e) {
    if (!isDragging) {
      e.preventDefault();
      return;
    }

    const row = e.target.closest('tr');
    if (!row) return;

    draggedRow = row;
    row.classList.add('dragging');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');

    setTimeout(() => {
      row.style.opacity = '0.5';
    }, 0);
  }

  function handleDragEnd(e) {
    const row = e.target.closest('tr');
    if (row) {
      row.classList.remove('dragging');
      row.style.opacity = '1';
      row.draggable = false;
    }

    document.querySelectorAll('#produtosTable tr').forEach(tr => {
      tr.classList.remove('drag-over-top', 'drag-over-bottom');
      tr.draggable = false;
    });

    draggedRow = null;
    dropPosition = null;
    isDragging = false;
  }

  function handleDragOver(e) {
    if (!isDragging || !draggedRow) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetRow = e.target.closest('tr');
    if (!targetRow || targetRow === draggedRow) return;

    const rect = targetRow.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const isAbove = e.clientY < midPoint;

    document.querySelectorAll('#produtosTable tr').forEach(tr => {
      if (tr !== targetRow) {
        tr.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });

    targetRow.classList.remove('drag-over-top', 'drag-over-bottom');
    if (isAbove) {
      targetRow.classList.add('drag-over-top');
      dropPosition = 'before';
    } else {
      targetRow.classList.add('drag-over-bottom');
      dropPosition = 'after';
    }
  }

  function handleDragLeave(e) {
    const targetRow = e.target.closest('tr');
    if (!targetRow) return;

    const relatedTarget = e.relatedTarget;
    if (relatedTarget && targetRow.contains(relatedTarget)) return;

    targetRow.classList.remove('drag-over-top', 'drag-over-bottom');
  }

  function handleDrop(e) {
    e.preventDefault();

    if (!isDragging || !draggedRow) return;

    const targetRow = e.target.closest('tr');
    if (!targetRow || targetRow === draggedRow) return;

    const tabelaBody = document.getElementById('produtosTable');

    if (dropPosition === 'before') {
      tabelaBody.insertBefore(draggedRow, targetRow);
    } else {
      tabelaBody.insertBefore(draggedRow, targetRow.nextSibling);
    }

    targetRow.classList.remove('drag-over-top', 'drag-over-bottom');

    draggedRow.classList.add('just-dropped');
    setTimeout(() => {
      draggedRow.classList.remove('just-dropped');
    }, 300);

    console.log('✅ Produto reposicionado');
  }

  // ==================== ORDENAÇÃO AUTOMÁTICA ====================

  function ordenarProdutosPorTamanho() {
    const tabelaBody = document.getElementById('produtosTable');
    if (!tabelaBody) return;

    const rows = Array.from(tabelaBody.querySelectorAll('tr'));

    if (rows.length <= 1) {
      console.log('⚠️ Nada para ordenar');
      return;
    }

    const ordemTamanhos = {};
    catalog.tamanhos.forEach((tam, index) => {
      ordemTamanhos[tam.toUpperCase()] = index;
    });

    function getOrdem(tamanho) {
      const tamUpper = (tamanho || '').toUpperCase().trim();

      if (ordemTamanhos.hasOwnProperty(tamUpper)) {
        return { tipo: 0, valor: ordemTamanhos[tamUpper] };
      }

      const numMatch = tamUpper.match(/^(\d+)$/);
      if (numMatch) {
        return { tipo: 1, valor: parseInt(numMatch[1]) };
      }

      const numPrefixMatch = tamUpper.match(/^(\d+)(.*)$/);
      if (numPrefixMatch) {
        return { tipo: 2, valor: parseInt(numPrefixMatch[1]), texto: numPrefixMatch[2] };
      }

      return { tipo: 3, valor: tamUpper };
    }

    function comparar(a, b) {
      const tamanhoA = a.querySelector('.tamanho')?.value || '';
      const tamanhoB = b.querySelector('.tamanho')?.value || '';

      const ordemA = getOrdem(tamanhoA);
      const ordemB = getOrdem(tamanhoB);

      if (ordemA.tipo !== ordemB.tipo) {
        return ordemA.tipo - ordemB.tipo;
      }

      if (ordemA.tipo === 0 || ordemA.tipo === 1) {
        return ordemA.valor - ordemB.valor;
      }

      if (ordemA.tipo === 2) {
        if (ordemA.valor !== ordemB.valor) {
          return ordemA.valor - ordemB.valor;
        }
        return (ordemA.texto || '').localeCompare(ordemB.texto || '');
      }

      return String(ordemA.valor).localeCompare(String(ordemB.valor));
    }

    rows.sort(comparar);

    rows.forEach(row => tabelaBody.appendChild(row));

    console.log('✅ Produtos ordenados por tamanho');

    tabelaBody.classList.add('sorted-flash');
    setTimeout(() => {
      tabelaBody.classList.remove('sorted-flash');
    }, 500);
  }

  window.ordenarProdutosPorTamanho = ordenarProdutosPorTamanho;

  // ==================== TABELA DE PRODUTOS ====================

  function initProductTable() {
    const tabelaBody = document.getElementById('produtosTable');
    const template = document.getElementById('productRowTemplate');
    const btnAdicionar = document.getElementById('adicionarProduto');

    if (!tabelaBody || !template || !btnAdicionar) return;

    initDragAndDrop(tabelaBody);
    adicionarBotaoOrdenar();

    function adicionarLinhaProduto(produto) {
      const row = template.content.firstElementChild.cloneNode(true);

      row.draggable = false;

      const firstTd = row.querySelector('td');
      if (firstTd) {
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        dragHandle.title = 'Arraste para reordenar';
        firstTd.insertBefore(dragHandle, firstTd.firstChild);
      }

      const tamanhoElement = row.querySelector('.tamanho');

      if (tamanhoElement && tamanhoElement.tagName.toLowerCase() === 'select') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control tamanho';
        input.placeholder = 'Tam.';
        input.setAttribute('list', 'tamanhosList');
        input.autocomplete = 'off';

        tamanhoElement.parentNode.replaceChild(input, tamanhoElement);

        if (produto && produto.tamanho) {
          input.value = produto.tamanho;
        }
      } else if (tamanhoElement) {
        tamanhoElement.setAttribute('list', 'tamanhosList');
        tamanhoElement.placeholder = 'Tam.';
        tamanhoElement.autocomplete = 'off';

        if (produto && produto.tamanho) {
          tamanhoElement.value = produto.tamanho;
        }
      }

      const inputQuantidade = row.querySelector('.quantidade');
      const inputDescricao = row.querySelector('.descricao');

      if (produto) {
        if (inputQuantidade) inputQuantidade.value = produto.quantidade || 1;
        if (inputDescricao) inputDescricao.value = produto.descricao || '';
      }

      tabelaBody.appendChild(row);
      atualizarTotalItens();
    }

    btnAdicionar.addEventListener('click', () => adicionarLinhaProduto());

    tabelaBody.addEventListener('click', e => {
      const btnDuplicar = e.target.closest('.duplicar-produto');
      const btnRemover = e.target.closest('.remover-produto');

      if (btnDuplicar) {
        const row = btnDuplicar.closest('tr');
        const tamanho = row.querySelector('.tamanho')?.value || '';
        const quantidade = row.querySelector('.quantidade')?.value || 1;
        const descricao = row.querySelector('.descricao')?.value || '';

        adicionarLinhaProduto({ tamanho, quantidade, descricao });
      }

      if (btnRemover) {
        const row = btnRemover.closest('tr');
        if (row) {
          row.remove();
          if (!tabelaBody.querySelector('tr')) {
            adicionarLinhaProduto();
          }
          atualizarTotalItens();
        }
      }
    });

    tabelaBody.addEventListener('input', e => {
      if (e.target.classList.contains('quantidade')) {
        atualizarTotalItens();
      }
      // Forçar uppercase no campo tamanho
      if (e.target.classList.contains('tamanho')) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
      }
    });

    tabelaBody.addEventListener('keydown', e => {
      if (e.target.classList.contains('quantidade') && e.key === 'Enter') {
        e.preventDefault();
        calcularExpressao(e.target);
      }
    });

    tabelaBody.addEventListener('blur', e => {
      if (e.target.classList.contains('quantidade')) {
        calcularExpressao(e.target);
      }
    }, true);

    adicionarLinhaProduto();

    window._addProductRowFromData = adicionarLinhaProduto;
    window.adicionarProduto = adicionarLinhaProduto;
  }

  function adicionarBotaoOrdenar() {
    const btnAdicionar = document.getElementById('adicionarProduto');
    if (!btnAdicionar) return;

    if (document.getElementById('ordenarProdutos')) return;

    const btnOrdenar = document.createElement('button');
    btnOrdenar.id = 'ordenarProdutos';
    btnOrdenar.type = 'button';
    btnOrdenar.className = 'btn btn-secondary';
    btnOrdenar.innerHTML = '<i class="fas fa-sort-amount-down"></i> <span>Ordenar</span>';
    btnOrdenar.title = 'Ordenar produtos por tamanho';
    btnOrdenar.addEventListener('click', ordenarProdutosPorTamanho);

    btnAdicionar.parentNode.insertBefore(btnOrdenar, btnAdicionar.nextSibling);
  }

  function initTotals() {
    atualizarTotalItens();
  }

  function atualizarTotalItens() {
    const quantities = document.querySelectorAll('#produtosTable .quantidade');
    let total = 0;
    quantities.forEach(input => {
      const n = parseInt(input.value, 10);
      if (!Number.isNaN(n) && n > 0) total += n;
    });
    const totalSpan = document.getElementById('totalItens');
    if (totalSpan) totalSpan.textContent = total;
  }

  window.atualizarTotalItens = atualizarTotalItens;

  function calcularExpressao(input) {
    if (!input || !input.value) return;

    const expressao = input.value.trim();

    if (!/[\+\-\*\/]/.test(expressao)) return;

    try {
      if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(expressao)) {
        console.warn('Expressão inválida:', expressao);
        return;
      }

      const resultado = Function(`'use strict'; return (${expressao})`)();

      if (typeof resultado === 'number' && !isNaN(resultado) && isFinite(resultado)) {
        input.value = Math.round(resultado);
        atualizarTotalItens();
      } else {
        console.warn('Resultado inválido:', resultado);
      }
    } catch (erro) {
      console.warn('Erro ao calcular expressão:', erro);
    }
  }

  // ==================== ESPECIFICAÇÕES - MATERIAL E MANGA ====================

  function initSpecsAutoFill() {
    const inputMaterial = document.getElementById('material');
    const composicaoInput = document.getElementById('composicao');
    const datalist = document.getElementById('materiaisList');

    if (!inputMaterial || !composicaoInput || !datalist) return;

    inputMaterial.addEventListener('input', () => {
      const valorDigitado = inputMaterial.value;

      const options = datalist.querySelectorAll('option');
      for (let opt of options) {
        if (opt.value === valorDigitado) {
          composicaoInput.value = opt.dataset.composicao || '';
          break;
        }
      }
    });

    // ==================== ACABAMENTO DA MANGA ====================
    const acabamentoManga = document.getElementById('acabamentoManga');
    const larguraMangaContainer = document.getElementById('larguraMangaContainer');
    const corAcabamentoMangaContainer = document.getElementById('corAcabamentoMangaContainer');

    function atualizarCamposManga() {
      const valor = acabamentoManga?.value || '';
      const mostrarExtras = valor === 'vies' || valor === 'punho';

      if (larguraMangaContainer) {
        larguraMangaContainer.style.display = mostrarExtras ? 'block' : 'none';
      }
      if (corAcabamentoMangaContainer) {
        corAcabamentoMangaContainer.style.display = mostrarExtras ? 'block' : 'none';
      }
    }

    if (acabamentoManga) {
      acabamentoManga.addEventListener('change', atualizarCamposManga);
      atualizarCamposManga();
    }
  }

  // ==================== CONTROLES DA GOLA (COMPLETO) ====================

  function initGolaControls() {
    // Elementos
    const tipoGola = document.getElementById('gola');
    const corGolaContainer = document.getElementById('corGolaContainer');
    const acabamentoGolaContainer = document.getElementById('acabamentoGolaContainer');
    const acabamentoGola = document.getElementById('acabamentoGola');
    const larguraGolaContainer = document.getElementById('larguraGolaContainer');
    const reforcoGolaContainer = document.getElementById('reforcoGolaContainer');
    const reforcoGola = document.getElementById('reforcoGola');
    const corReforcoContainer = document.getElementById('corReforcoContainer');

    // Campos específicos Polo
    const corPeitilhoInternoContainer = document.getElementById('corPeitilhoInternoContainer');
    const corPeitilhoExternoContainer = document.getElementById('corPeitilhoExternoContainer');
    const aberturaLateralContainer = document.getElementById('aberturaLateralContainer');
    const aberturaLateral = document.getElementById('aberturaLateral');
    const corAberturaLateralContainer = document.getElementById('corAberturaLateralContainer');

    function atualizarCamposGola() {
      const gola = tipoGola?.value || '';
      const isPolo = gola === 'polo' || gola === 'v_polo';
      const temGola = gola !== '';

      // Cor da Gola - aparece sempre que tem gola selecionada
      if (corGolaContainer) {
        corGolaContainer.style.display = temGola ? 'block' : 'none';
      }

      // Para Polo: esconde acabamento e largura da gola
      if (acabamentoGolaContainer) {
        acabamentoGolaContainer.style.display = isPolo ? 'none' : 'block';
      }
      if (larguraGolaContainer) {
        // Só mostra se NÃO for polo E tiver acabamento selecionado
        const acabamento = acabamentoGola?.value || '';
        larguraGolaContainer.style.display = (!isPolo && acabamento) ? 'block' : 'none';
      }

      // Reforço na Gola - aparece para TODAS as golas (incluindo polo)
      if (reforcoGolaContainer) {
        reforcoGolaContainer.style.display = temGola ? 'block' : 'none';
      }

      // Campos específicos de Polo
      if (corPeitilhoInternoContainer) {
        corPeitilhoInternoContainer.style.display = isPolo ? 'block' : 'none';
      }
      if (corPeitilhoExternoContainer) {
        corPeitilhoExternoContainer.style.display = isPolo ? 'block' : 'none';
      }
      if (aberturaLateralContainer) {
        aberturaLateralContainer.style.display = isPolo ? 'block' : 'none';
      }

      // Se não for polo, esconde cor da abertura lateral
      if (!isPolo && corAberturaLateralContainer) {
        corAberturaLateralContainer.style.display = 'none';
      }

      // Atualiza campos dependentes
      atualizarCorReforco();
      atualizarCorAberturaLateral();
    }

    function atualizarLarguraGola() {
      const gola = tipoGola?.value || '';
      const isPolo = gola === 'polo' || gola === 'v_polo';
      const acabamento = acabamentoGola?.value || '';

      if (larguraGolaContainer) {
        larguraGolaContainer.style.display = (!isPolo && acabamento) ? 'block' : 'none';
      }
    }

    function atualizarCorReforco() {
      // reforcoGola agora é SELECT (sim/nao)
      const reforcoMarcado = reforcoGola?.value === 'sim';
      if (corReforcoContainer) {
        corReforcoContainer.style.display = reforcoMarcado ? 'block' : 'none';
      }
    }

    function atualizarCorAberturaLateral() {
      // aberturaLateral agora é SELECT (sim/nao)
      const aberturaAtiva = aberturaLateral?.value === 'sim';
      const gola = tipoGola?.value || '';
      const isPolo = gola === 'polo' || gola === 'v_polo';

      if (corAberturaLateralContainer) {
        corAberturaLateralContainer.style.display = (isPolo && aberturaAtiva) ? 'block' : 'none';
      }
    }

    // Event listeners
    if (tipoGola) {
      tipoGola.addEventListener('change', atualizarCamposGola);
    }
    if (acabamentoGola) {
      acabamentoGola.addEventListener('change', atualizarLarguraGola);
    }
    if (reforcoGola) {
      reforcoGola.addEventListener('change', atualizarCorReforco);
    }
    if (aberturaLateral) {
      aberturaLateral.addEventListener('change', atualizarCorAberturaLateral);
    }

    // Inicializar
    atualizarCamposGola();
  }

  // ==================== FILETE E FAIXA REFLETIVA ====================

  function initFileteFaixaControls() {
    // Filete
    const fileteSelect = document.getElementById('filete');
    const fileteLocalContainer = document.getElementById('fileteLocalContainer');
    const fileteCorContainer = document.getElementById('fileteCorContainer');

    function atualizarCamposFilete() {
      const temFilete = fileteSelect?.value === 'sim';
      if (fileteLocalContainer) {
        fileteLocalContainer.style.display = temFilete ? 'block' : 'none';
      }
      if (fileteCorContainer) {
        fileteCorContainer.style.display = temFilete ? 'block' : 'none';
      }
    }

    if (fileteSelect) {
      fileteSelect.addEventListener('change', atualizarCamposFilete);
      atualizarCamposFilete();
    }

    // Faixa Refletiva
    const faixaSelect = document.getElementById('faixa');
    const faixaLocalContainer = document.getElementById('faixaLocalContainer');
    const faixaCorContainer = document.getElementById('faixaCorContainer');

    function atualizarCamposFaixa() {
      const temFaixa = faixaSelect?.value === 'sim';
      if (faixaLocalContainer) {
        faixaLocalContainer.style.display = temFaixa ? 'block' : 'none';
      }
      if (faixaCorContainer) {
        faixaCorContainer.style.display = temFaixa ? 'block' : 'none';
      }
    }

    if (faixaSelect) {
      faixaSelect.addEventListener('change', atualizarCamposFaixa);
      atualizarCamposFaixa();
    }
  }

  function initArtColorControls() {
    const arteSelect = document.getElementById('arte');
    const corContainer = document.getElementById('corContainer');
    const corInput = document.getElementById('cor');
    const corPreview = document.getElementById('corPreview');
    if (!arteSelect || !corContainer || !corInput || !corPreview) return;

    function atualizarVisibilidade() {
      const v = arteSelect.value || '';
      const mostrar = v.includes('sublimacao');
      corContainer.style.display = mostrar ? 'flex' : 'none';
    }

    arteSelect.addEventListener('change', atualizarVisibilidade);
    atualizarVisibilidade();

    corInput.addEventListener('input', () => {
      corPreview.style.backgroundColor = corInput.value;
    });
    corPreview.style.backgroundColor = corInput.value;
  }

  function initIconPreview() {
    const inputMaterial = document.getElementById('material');

    ['manga', 'gola', 'arte'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', atualizarIconPreview);
    });

    if (inputMaterial) {
      inputMaterial.addEventListener('input', atualizarIconPreview);
    }

    atualizarIconPreview();
  }

  function atualizarIconPreview() {
    const map = [
      { id: 'material', spec: 'material', isInput: true },
      { id: 'manga', spec: 'manga', isInput: false },
      { id: 'gola', spec: 'gola', isInput: false },
      { id: 'arte', spec: 'arte', isInput: false }
    ];

    map.forEach(({ id, spec, isInput }) => {
      const el = document.getElementById(id);
      const label = document.querySelector(`.icon-item[data-spec="${spec}"] .icon-label`);
      if (!el || !label) return;

      let text = '';
      if (isInput) {
        text = el.value || '';
      } else if (el.tagName.toLowerCase() === 'select') {
        const opt = el.options[el.selectedIndex];
        text = opt ? opt.text : '';
      }

      if (text) label.textContent = text;
    });
  }

  // ==================== SISTEMA DE MÚLTIPLAS IMAGENS ====================

  function initMultipleImages() {
    const dropArea = document.getElementById('imageUpload');
    const fileInput = document.getElementById('fileInput');
    const container = document.getElementById('imagesContainer');
    const counter = document.getElementById('imagesCounter');

    if (!dropArea || !fileInput || !container) return;

    // Atualizar contador
    function atualizarContador() {
      if (counter) {
        counter.textContent = `(${imagens.length}/${MAX_IMAGES})`;
      }

      // Mostrar/esconder área de upload
      if (imagens.length >= MAX_IMAGES) {
        dropArea.classList.add('hidden');
      } else {
        dropArea.classList.remove('hidden');
      }
    }

    // Renderizar imagens
    function renderizarImagens() {
      container.innerHTML = '';

      imagens.forEach((img, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.draggable = true;
        card.dataset.index = index;

        card.innerHTML = `
          <div class="image-wrapper">
            <span class="image-number">${index + 1}</span>
            <img src="${img.src}" alt="Imagem ${index + 1}" draggable="false">
            <button type="button" class="image-delete-btn" title="Remover imagem">
              <i class="fas fa-times"></i>
            </button>
            <div class="image-drag-handle">
              <i class="fas fa-grip-horizontal"></i>
              Arrastar
            </div>
          </div>
          <div class="image-description">
            <input type="text" placeholder="Descrição da imagem (opcional)" value="${img.descricao || ''}" data-index="${index}">
          </div>
        `;

        container.appendChild(card);

        // Event: Deletar
        card.querySelector('.image-delete-btn').addEventListener('click', () => {
          imagens.splice(index, 1);
          renderizarImagens();
          atualizarContador();
        });

        // Event: Atualizar descrição
        card.querySelector('input').addEventListener('input', (e) => {
          imagens[index].descricao = e.target.value;
        });

        // Events: Drag and drop para reordenar
        card.addEventListener('dragstart', handleImageDragStart);
        card.addEventListener('dragend', handleImageDragEnd);
        card.addEventListener('dragover', handleImageDragOver);
        card.addEventListener('drop', handleImageDrop);
        card.addEventListener('dragleave', handleImageDragLeave);
      });

      atualizarContador();
    }

    // Drag handlers para imagens
    let draggedImageIndex = null;

    function handleImageDragStart(e) {
      draggedImageIndex = parseInt(e.currentTarget.dataset.index);
      e.currentTarget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    }

    function handleImageDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      document.querySelectorAll('.image-card').forEach(card => {
        card.classList.remove('drag-over');
      });
      draggedImageIndex = null;
    }

    function handleImageDragOver(e) {
      e.preventDefault();
      const card = e.currentTarget;
      const targetIndex = parseInt(card.dataset.index);

      if (targetIndex !== draggedImageIndex) {
        card.classList.add('drag-over');
      }
    }

    function handleImageDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    }

    function handleImageDrop(e) {
      e.preventDefault();
      const card = e.currentTarget;
      card.classList.remove('drag-over');

      const targetIndex = parseInt(card.dataset.index);

      if (draggedImageIndex !== null && targetIndex !== draggedImageIndex) {
        // Reordenar array
        const [movedItem] = imagens.splice(draggedImageIndex, 1);
        imagens.splice(targetIndex, 0, movedItem);
        renderizarImagens();
        console.log('✅ Imagens reordenadas');
      }
    }

    // Adicionar imagem
    function adicionarImagem(src, descricao = '') {
      if (imagens.length >= MAX_IMAGES) {
        alert(`Máximo de ${MAX_IMAGES} imagens permitido.`);
        return false;
      }

      imagens.push({ src, descricao });
      renderizarImagens();
      return true;
    }

    // Processar arquivos
    function processarArquivos(files) {
      if (!files || !files.length) return;

      Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
          console.warn('Arquivo não é uma imagem:', file.name);
          return;
        }

        if (imagens.length >= MAX_IMAGES) {
          alert(`Máximo de ${MAX_IMAGES} imagens atingido.`);
          return;
        }

        const reader = new FileReader();
        reader.onload = e => adicionarImagem(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    // Events
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', () => {
      processarArquivos(fileInput.files);
      fileInput.value = '';
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
      dropArea.addEventListener(name, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropArea.addEventListener(name, () => {
        dropArea.classList.add('image-upload--active');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropArea.addEventListener(name, () => {
        dropArea.classList.remove('image-upload--active');
      });
    });

    dropArea.addEventListener('drop', e => {
      processarArquivos(e.dataTransfer.files);
    });

    // Paste (Ctrl+V)
    document.addEventListener('paste', e => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (!blob) continue;

          if (imagens.length >= MAX_IMAGES) {
            alert(`Máximo de ${MAX_IMAGES} imagens atingido.`);
            return;
          }

          const reader = new FileReader();
          reader.onload = ev => adicionarImagem(ev.target.result);
          reader.readAsDataURL(blob);
          break;
        }
      }
    });

    // Exportar funções
    if (!window.getImagens) {
      window.getImagens = () => imagens;
    }
    if (!window.setImagens) {
      window.setImagens = (novasImagens) => {
        imagens = novasImagens || [];
        renderizarImagens();
      };
    }
    window.adicionarImagem = adicionarImagem;

    // Inicializar
    atualizarContador();
  }

  // ==================== SALVAR E CARREGAR ====================

  function initSaveLoad() {
    const btnSalvar = document.getElementById('btnSalvar');
    const btnCarregar = document.getElementById('btnCarregar');

    btnSalvar?.addEventListener('click', salvarFicha);
    btnCarregar?.addEventListener('click', carregarFichaDeArquivo);
  }

  function coletarFicha() {
    const produtos = [];
    document.querySelectorAll('#produtosTable tr').forEach(row => {
      const tamanho = row.querySelector('.tamanho')?.value || '';
      const quantidade = row.querySelector('.quantidade')?.value || '';
      const descricao = row.querySelector('.descricao')?.value || '';
      if (!tamanho && !descricao) return;
      produtos.push({ tamanho, quantidade, descricao });
    });

    const arteVal = document.getElementById('arte')?.value || '';
    const corSublimacao =
      arteVal.includes('sublimacao') ? document.getElementById('cor')?.value || null : null;

    // Acabamento manga
    const acabamentoMangaVal = document.getElementById('acabamentoManga')?.value || '';
    const temAcabamentoManga = acabamentoMangaVal === 'vies' || acabamentoMangaVal === 'punho';
    const larguraManga = temAcabamentoManga ? (document.getElementById('larguraManga')?.value || '') : '';
    const corAcabamentoManga = temAcabamentoManga ? (document.getElementById('corAcabamentoManga')?.value || '') : '';

    // Gola
    const golaVal = document.getElementById('gola')?.value || '';
    const isPolo = golaVal === 'polo' || golaVal === 'v_polo';
    const temGola = golaVal !== '';

    // Cor da gola (para todas as golas)
    const corGola = temGola ? (document.getElementById('corGola')?.value || '') : '';

    // Acabamento gola (não salva para polo)
    const acabamentoGolaVal = isPolo ? '' : (document.getElementById('acabamentoGola')?.value || '');
    const larguraGola = (!isPolo && acabamentoGolaVal) ? (document.getElementById('larguraGola')?.value || '') : '';

    // Reforço na gola (agora é select sim/nao, disponível para TODAS as golas incluindo polo)
    const reforcoGolaVal = temGola ? (document.getElementById('reforcoGola')?.value || 'nao') : 'nao';
    const corReforco = reforcoGolaVal === 'sim' ? (document.getElementById('corReforco')?.value || '') : '';

    // Abertura lateral (só para polo, agora é select sim/nao)
    const aberturaLateralVal = isPolo ? (document.getElementById('aberturaLateral')?.value || 'nao') : 'nao';
    const corAberturaLateral = (isPolo && aberturaLateralVal === 'sim') ? (document.getElementById('corAberturaLateral')?.value || '') : '';

    // Filete
    const fileteVal = document.getElementById('filete')?.value || 'nao';
    const fileteLocal = fileteVal === 'sim' ? (document.getElementById('fileteLocal')?.value || '') : '';
    const fileteCor = fileteVal === 'sim' ? (document.getElementById('fileteCor')?.value || '') : '';

    // Faixa
    const faixaVal = document.getElementById('faixa')?.value || 'nao';
    const faixaLocal = faixaVal === 'sim' ? (document.getElementById('faixaLocal')?.value || '') : '';
    const faixaCor = faixaVal === 'sim' ? (document.getElementById('faixaCor')?.value || '') : '';

    return {
      cliente: document.getElementById('cliente')?.value || '',
      vendedor: document.getElementById('vendedor')?.value || '',
      dataInicio: document.getElementById('dataInicio')?.value || '',
      numeroVenda: document.getElementById('numeroVenda')?.value || '',
      dataEntrega: document.getElementById('dataEntrega')?.value || '',
      evento: document.getElementById('evento')?.value || 'nao',
      produtos,
      material: document.getElementById('material')?.value || '',
      corMaterial: document.getElementById('corMaterial')?.value || '',
      manga: document.getElementById('manga')?.value || '',
      acabamentoManga: acabamentoMangaVal,
      larguraManga,
      corAcabamentoManga,
      gola: golaVal,
      corGola,
      acabamentoGola: acabamentoGolaVal,
      larguraGola,
      reforcoGola: reforcoGolaVal,
      corReforco,
      corPeitilhoInterno: isPolo ? (document.getElementById('corPeitilhoInterno')?.value || '') : '',
      corPeitilhoExterno: isPolo ? (document.getElementById('corPeitilhoExterno')?.value || '') : '',
      aberturaLateral: aberturaLateralVal,
      corAberturaLateral,
      bolso: document.getElementById('bolso')?.value || 'nenhum',
      filete: fileteVal,
      fileteLocal,
      fileteCor,
      faixa: faixaVal,
      faixaLocal,
      faixaCor,
      arte: arteVal,
      composicao: document.getElementById('composicao')?.value || '',
      corSublimacao,
      observacoes: document.getElementById('observacoes')?.value || '',
      // Array de imagens com descrições
      imagens: window.getImagens ? window.getImagens() : [],
      // Manter compatibilidade com formato antigo
      imagem: (window.getImagens && window.getImagens().length > 0) ? window.getImagens()[0].src : ''
    };
  }

  function salvarFicha() {
    const ficha = coletarFicha();

    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(ficha, null, 2)
    )}`;

    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `ficha_tecnica_${ficha.numeroVenda || 'sem_numero'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  window.salvarFicha = salvarFicha;

  function carregarFichaDeArquivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const ficha = JSON.parse(ev.target.result);
          preencherFicha(ficha);
        } catch (err) {
          console.error(err);
          alert('❌ Erro ao ler arquivo JSON.');
        }
      };
      reader.readAsText(file, 'UTF-8');
    };

    input.click();
  }

  window.carregarFichaDeArquivo = carregarFichaDeArquivo;

  function preencherFicha(ficha) {
    if (!ficha) return;
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v || '';
    };

    setVal('cliente', ficha.cliente);
    setVal('vendedor', ficha.vendedor);
    setVal('dataInicio', ficha.dataInicio);
    setVal('numeroVenda', ficha.numeroVenda);
    setVal('dataEntrega', ficha.dataEntrega);
    setVal('evento', ficha.evento || 'nao');

    document.getElementById('evento')?.dispatchEvent(new Event('change'));
    document.getElementById('dataInicio')?.dispatchEvent(new Event('change'));
    document.getElementById('dataEntrega')?.dispatchEvent(new Event('change'));

    const tabelaBody = document.getElementById('produtosTable');
    if (tabelaBody) {
      tabelaBody.innerHTML = '';
      const arr = Array.isArray(ficha.produtos) ? ficha.produtos : [];
      if (!arr.length && window._addProductRowFromData) {
        window._addProductRowFromData();
      } else if (window._addProductRowFromData) {
        arr.forEach(p => window._addProductRowFromData(p));
      }
      atualizarTotalItens();
    }

    setVal('material', ficha.material);
    setVal('corMaterial', ficha.corMaterial);
    setVal('manga', ficha.manga);
    setVal('acabamentoManga', ficha.acabamentoManga);
    setVal('larguraManga', ficha.larguraManga);
    setVal('corAcabamentoManga', ficha.corAcabamentoManga);

    // Gola - primeiro setar o tipo para disparar a lógica de visibilidade
    setVal('gola', ficha.gola);
    document.getElementById('gola')?.dispatchEvent(new Event('change'));

    // Depois preencher os campos condicionais
    setVal('corGola', ficha.corGola);
    setVal('acabamentoGola', ficha.acabamentoGola);
    setVal('larguraGola', ficha.larguraGola);

    // Reforço na gola (agora é select)
    setVal('reforcoGola', ficha.reforcoGola || 'nao');
    document.getElementById('reforcoGola')?.dispatchEvent(new Event('change'));
    setVal('corReforco', ficha.corReforco);

    // Campos polo
    setVal('corPeitilhoInterno', ficha.corPeitilhoInterno);
    setVal('corPeitilhoExterno', ficha.corPeitilhoExterno);

    // Abertura lateral (agora é select)
    setVal('aberturaLateral', ficha.aberturaLateral || 'nao');
    document.getElementById('aberturaLateral')?.dispatchEvent(new Event('change'));
    setVal('corAberturaLateral', ficha.corAberturaLateral);

    setVal('bolso', ficha.bolso || 'nenhum');

    // Filete
    setVal('filete', ficha.filete || 'nao');
    setVal('fileteLocal', ficha.fileteLocal || '');
    setVal('fileteCor', ficha.fileteCor || '');
    document.getElementById('filete')?.dispatchEvent(new Event('change'));

    // Faixa
    setVal('faixa', ficha.faixa || 'nao');
    setVal('faixaLocal', ficha.faixaLocal || '');
    setVal('faixaCor', ficha.faixaCor || '');
    document.getElementById('faixa')?.dispatchEvent(new Event('change'));

    setVal('arte', ficha.arte);
    setVal('composicao', ficha.composicao);
    setVal('observacoes', ficha.observacoes);

    document.getElementById('arte')?.dispatchEvent(new Event('change'));
    document.getElementById('material')?.dispatchEvent(new Event('input'));
    document.getElementById('acabamentoManga')?.dispatchEvent(new Event('change'));
    document.getElementById('acabamentoGola')?.dispatchEvent(new Event('change'));

    if (ficha.corSublimacao) {
      const corInput = document.getElementById('cor');
      const corPreview = document.getElementById('corPreview');
      if (corInput && corPreview) {
        corInput.value = ficha.corSublimacao;
        corPreview.style.backgroundColor = ficha.corSublimacao;
      }
    }

    // Carregar múltiplas imagens
    if (window.setImagens) {
      let imagensCarregadas = [];

      // Tentar carregar do novo formato (imagensData como JSON string)
      const imagensData = ficha.imagensData || ficha.imagens_data;
      if (imagensData) {
        try {
          if (typeof imagensData === 'string') {
            imagensCarregadas = JSON.parse(imagensData);
          } else if (Array.isArray(imagensData)) {
            imagensCarregadas = imagensData;
          }
        } catch (e) {
          console.warn('Erro ao parsear imagens:', e);
        }
      }

      // Fallback: tentar campo imagens (array direto)
      if (imagensCarregadas.length === 0 && ficha.imagens && Array.isArray(ficha.imagens)) {
        imagensCarregadas = ficha.imagens;
      }

      // Fallback: formato antigo (imagemData única)
      if (imagensCarregadas.length === 0) {
        const imagemData = ficha.imagemData || ficha.imagem_data || ficha.imagem;
        if (imagemData && typeof imagemData === 'string' && imagemData.startsWith('data:')) {
          imagensCarregadas = [{ src: imagemData, descricao: '' }];
        }
      }

      window.setImagens(imagensCarregadas);
      console.log('✅ Imagens carregadas:', imagensCarregadas.length);
    }

    atualizarIconPreview();
  }

  // ==================== IMPRESSÃO ====================

  function initPrint() {
    const btn = document.getElementById('btnImprimir');
    btn?.addEventListener('click', gerarVersaoImpressao);
  }

  function formatarDataBrasil(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function gerarVersaoImpressao() {
    const hoje = new Date();
    const dataEmissao = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR');

    const isEvento = document.getElementById('evento')?.value === 'sim';

    // Função auxiliar para definir texto
    const setText = (id, val, fallback = '') => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val || fallback;
      }
    };

    // Função auxiliar para texto com highlight (eventos)
    const setTextWithHighlight = (id, val, shouldHighlight, fallback = '') => {
      const el = document.getElementById(id);
      if (el) {
        const text = val || fallback;
        if (shouldHighlight && text) {
          el.innerHTML = `<mark>${text}</mark>`;
        } else {
          el.textContent = text;
        }
      }
    };

    // Função auxiliar para mostrar/esconder divs
    const showDiv = (divId, show) => {
      const div = document.getElementById(divId);
      if (div) div.style.display = show ? 'block' : 'none';
    };

    // Função para pegar texto do select (opção selecionada)
    const getSelectText = id => {
      const sel = document.getElementById(id);
      if (!sel || sel.selectedIndex < 0) return '';
      const opt = sel.options[sel.selectedIndex];
      // Retorna vazio se for a opção padrão "-"
      if (opt.value === '' || opt.value === 'nenhum') return '';
      return opt.text;
    };

    // Função para pegar valor do input
    const getInputValue = id => {
      const el = document.getElementById(id);
      return el?.value || '';
    };

    // ═══════════════ DADOS DO PEDIDO ═══════════════
    setText('print-dataEmissao', dataEmissao);
    setText('print-numeroVenda', getInputValue('numeroVenda'), '-');
    setText('print-cliente', getInputValue('cliente'), '-');
    setText('print-vendedor', getInputValue('vendedor'), '-');

    setTextWithHighlight(
      'print-dataInicio',
      formatarDataBrasil(getInputValue('dataInicio')),
      isEvento,
      '-'
    );

    setTextWithHighlight(
      'print-dataEntrega',
      formatarDataBrasil(getInputValue('dataEntrega')),
      isEvento,
      '-'
    );

    const eventoEl = document.getElementById('print-evento');
    if (eventoEl) {
      if (isEvento) {
        eventoEl.innerHTML = '<span style="color: #dc2626; font-weight: bold;">★ Sim ★</span>';
      } else {
        eventoEl.textContent = 'Não';
      }
    }

    // Calcular prazo
    const dataEntregaVal = getInputValue('dataEntrega');
    const prazoEl = document.getElementById('print-prazo');
    if (prazoEl && dataEntregaVal) {
      const hojeDate = new Date();
      hojeDate.setHours(0, 0, 0, 0);
      const entrega = new Date(dataEntregaVal + 'T00:00:00');
      const diffTime = entrega - hojeDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let prazoTexto = '';
      let prazoStyle = '';

      if (diffDays < 0) {
        prazoTexto = `ATRASADO (${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''})`;
        prazoStyle = 'color: #dc2626; font-weight: bold;';
      } else if (diffDays === 0) {
        prazoTexto = 'ENTREGA HOJE!';
        prazoStyle = 'color: #dc2626; font-weight: bold;';
      } else if (diffDays <= 3) {
        prazoTexto = `${diffDays} dia${diffDays > 1 ? 's' : ''} restante${diffDays > 1 ? 's' : ''}`;
        prazoStyle = 'color: #dc2626; font-weight: bold;';
      } else if (diffDays <= 7) {
        prazoTexto = `${diffDays} dias restantes`;
        prazoStyle = 'color: #f59e0b; font-weight: bold;';
      } else {
        prazoTexto = `${diffDays} dias restantes`;
        prazoStyle = 'color: #059669; font-weight: bold;';
      }

      prazoEl.innerHTML = `<span style="${prazoStyle}">${prazoTexto}</span>`;
    } else if (prazoEl) {
      prazoEl.textContent = '-';
    }

    // ═══════════════ PRODUTOS ═══════════════
    const printBody = document.getElementById('print-produtosTable');
    if (printBody) {
      printBody.innerHTML = '';
      document.querySelectorAll('#produtosTable tr').forEach(row => {
        const tamanho = row.querySelector('.tamanho')?.value;
        const quantidade = row.querySelector('.quantidade')?.value;
        const descricao = row.querySelector('.descricao')?.value;
        if (!tamanho && !quantidade) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${tamanho || '-'}</td>
          <td>${quantidade || '-'}</td>
          <td>${descricao || '-'}</td>
        `;
        printBody.appendChild(tr);
      });
    }

    setText('print-totalItens', document.getElementById('totalItens')?.textContent || '0', '0');

    // ═══════════════ ESPECIFICAÇÕES TÉCNICAS ═══════════════

    // Material
    const materialVal = getInputValue('material');
    setText('print-material', materialVal, '-');

    const corMaterialVal = getInputValue('corMaterial');
    setText('print-corMaterial', corMaterialVal, '-');

    // Manga
    const mangaText = getSelectText('manga');
    setText('print-manga', mangaText, '-');

    const acabamentoMangaText = getSelectText('acabamentoManga');
    setText('print-acabamentoManga', acabamentoMangaText, '-');

    // Campos condicionais da manga (viés ou punho)
    const acabamentoMangaVal = getInputValue('acabamentoManga');
    const temAcabamentoMangaExtra = acabamentoMangaVal === 'vies' || acabamentoMangaVal === 'punho';

    const larguraMangaVal = getInputValue('larguraManga');
    setText('print-larguraManga', larguraMangaVal ? larguraMangaVal + ' cm' : '');
    showDiv('print-larguraMangaDiv', temAcabamentoMangaExtra && !!larguraMangaVal);

    const corAcabamentoMangaVal = getInputValue('corAcabamentoManga');
    setText('print-corAcabamentoManga', corAcabamentoMangaVal);
    showDiv('print-corAcabamentoMangaDiv', temAcabamentoMangaExtra && !!corAcabamentoMangaVal);

    // Gola
    const golaVal = getInputValue('gola');
    const golaText = getSelectText('gola');
    const isPolo = golaVal === 'polo' || golaVal === 'v_polo';
    const temGola = golaVal !== '';

    setText('print-gola', golaText, '-');

    // Cor da gola (para todas as golas)
    const corGolaVal = getInputValue('corGola');
    setText('print-corGola', corGolaVal);
    showDiv('print-corGolaDiv', temGola && !!corGolaVal);

    // Acabamento da gola (NÃO aparece para polo)
    const acabamentoGolaText = getSelectText('acabamentoGola');
    setText('print-acabamentoGola', acabamentoGolaText);
    showDiv('print-acabamentoGolaDiv', !isPolo && !!acabamentoGolaText);

    // Largura acabamento gola
    const larguraGolaVal = getInputValue('larguraGola');
    setText('print-larguraGola', larguraGolaVal ? larguraGolaVal + ' cm' : '');
    showDiv('print-larguraGolaDiv', !isPolo && !!larguraGolaVal);

    // Reforço na gola (disponível para TODAS as golas, incluindo polo)
    const reforcoGolaVal = document.getElementById('reforcoGola')?.value || 'nao';
    const temReforco = temGola && reforcoGolaVal === 'sim';
    setText('print-reforcoGola', temReforco ? 'Sim' : '');
    showDiv('print-reforcoGolaDiv', temReforco);

    const corReforcoVal = getInputValue('corReforco');
    setText('print-corReforco', corReforcoVal);
    showDiv('print-corReforcoDiv', temReforco && !!corReforcoVal);

    // Campos específicos Polo
    const corPeitilhoInternoVal = getInputValue('corPeitilhoInterno');
    setText('print-corPeitilhoInterno', corPeitilhoInternoVal);
    showDiv('print-corPeitilhoInternoDiv', isPolo && !!corPeitilhoInternoVal);

    const corPeitilhoExternoVal = getInputValue('corPeitilhoExterno');
    setText('print-corPeitilhoExterno', corPeitilhoExternoVal);
    showDiv('print-corPeitilhoExternoDiv', isPolo && !!corPeitilhoExternoVal);

    // Abertura lateral (só para polo)
    const aberturaLateralVal = document.getElementById('aberturaLateral')?.value || 'nao';
    const temAbertura = isPolo && aberturaLateralVal === 'sim';
    setText('print-aberturaLateral', temAbertura ? 'Sim' : '');
    showDiv('print-aberturaLateralDiv', temAbertura);

    const corAberturaLateralVal = getInputValue('corAberturaLateral');
    setText('print-corAberturaLateral', corAberturaLateralVal);
    showDiv('print-corAberturaLateralDiv', temAbertura && !!corAberturaLateralVal);

    // Bolso
    const bolsoText = getSelectText('bolso');
    setText('print-bolso', bolsoText, '-');

    // Filete
    const fileteVal = document.getElementById('filete')?.value || 'nao';
    const temFilete = fileteVal === 'sim';
    setText('print-filete', temFilete ? 'Sim' : 'Não');

    const fileteLocalVal = getInputValue('fileteLocal');
    setText('print-fileteLocal', fileteLocalVal);
    showDiv('print-fileteLocalDiv', temFilete && !!fileteLocalVal);

    const fileteCorVal = getInputValue('fileteCor');
    setText('print-fileteCor', fileteCorVal);
    showDiv('print-fileteCorDiv', temFilete && !!fileteCorVal);

    // Faixa
    const faixaVal = document.getElementById('faixa')?.value || 'nao';
    const temFaixa = faixaVal === 'sim';
    setText('print-faixa', temFaixa ? 'Sim' : 'Não');

    const faixaLocalVal = getInputValue('faixaLocal');
    setText('print-faixaLocal', faixaLocalVal);
    showDiv('print-faixaLocalDiv', temFaixa && !!faixaLocalVal);

    const faixaCorVal = getInputValue('faixaCor');
    setText('print-faixaCor', faixaCorVal);
    showDiv('print-faixaCorDiv', temFaixa && !!faixaCorVal);

    // Arte
    const arteText = getSelectText('arte');
    setText('print-arte', arteText, '-');

    const composicaoVal = getInputValue('composicao');
    setText('print-composicao', composicaoVal, '-');

    const observacoesVal = getInputValue('observacoes');
    setText('print-observacoes', observacoesVal, 'Nenhuma');

    // ═══════════════ IMAGENS ═══════════════
    const printImagesContainer = document.getElementById('print-imagesContainer');
    const printImagesSection = document.getElementById('print-imagesSection');

    if (printImagesContainer) {
      printImagesContainer.innerHTML = '';

      const imgs = window.getImagens ? window.getImagens() : [];

      if (imgs.length === 0) {
        if (printImagesSection) {
          printImagesSection.style.display = 'none';
        }
      } else {
        if (printImagesSection) {
          printImagesSection.style.display = 'block';
        }

        imgs.forEach((img, index) => {
          const div = document.createElement('div');
          div.className = imgs.length === 1 ? 'print-image-item single' : 'print-image-item';

          div.innerHTML = `
            <img src="${img.src}" alt="Imagem ${index + 1}">
            ${img.descricao ? `<div class="print-image-description">${img.descricao}</div>` : ''}
          `;

          printImagesContainer.appendChild(div);
        });
      }
    }

    // ═══════════════ EXIBIR E IMPRIMIR ═══════════════
    const normal = document.getElementById('normal-version');
    const printV = document.getElementById('print-version');

    if (normal && printV) {
      normal.style.display = 'none';
      printV.style.display = 'block';
      window.print();
      setTimeout(() => {
        normal.style.display = 'block';
        printV.style.display = 'none';
      }, 100);
    } else {
      window.print();
    }
  }

  // EXPORTAR FUNÇÕES GLOBALMENTE
  window.gerarVersaoImpressao = gerarVersaoImpressao;
  window.salvarFicha = salvarFicha;
  window.carregarFichaDeArquivo = carregarFichaDeArquivo;
  window.coletarFicha = coletarFicha;
  window.preencherFicha = preencherFicha;

})();