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
    initArtColorControls();
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

    const acabamentoManga = document.getElementById('acabamentoManga');
    const larguraMangaContainer = document.getElementById('larguraMangaContainer');

    if (acabamentoManga && larguraMangaContainer) {
      acabamentoManga.addEventListener('change', () => {
        const valor = acabamentoManga.value;
        if (valor === 'vies' || valor === 'punho') {
          larguraMangaContainer.style.display = 'block';
        } else {
          larguraMangaContainer.style.display = 'none';
        }
      });
    }

    const tipoGola = document.getElementById('gola');
    const acabamentoGola = document.getElementById('acabamentoGola');
    const corPeitilhoInternoContainer = document.getElementById('corPeitilhoInternoContainer');
    const corPeitilhoExternoContainer = document.getElementById('corPeitilhoExternoContainer');
    const aberturaLateralContainer = document.getElementById('aberturaLateralContainer');
    const reforcoGolaContainer = document.getElementById('reforcoGolaContainer');
    const reforcoGolaCheck = document.getElementById('reforcoGola');
    const corReforcoContainer = document.getElementById('corReforcoContainer');

    function atualizarCamposGola() {
      const gola = tipoGola?.value || '';
      const acabamento = acabamentoGola?.value || '';
      const isPolo = acabamento === 'polo';
      const temGola = gola !== '';

      if (corPeitilhoInternoContainer) {
        corPeitilhoInternoContainer.style.display = isPolo ? 'block' : 'none';
      }
      if (corPeitilhoExternoContainer) {
        corPeitilhoExternoContainer.style.display = isPolo ? 'block' : 'none';
      }
      if (aberturaLateralContainer) {
        aberturaLateralContainer.style.display = isPolo ? 'block' : 'none';
      }

      if (reforcoGolaContainer) {
        reforcoGolaContainer.style.display = (temGola && acabamento) ? 'block' : 'none';
      }
    }

    function atualizarCorReforco() {
      const reforcoMarcado = reforcoGolaCheck?.checked || false;
      if (corReforcoContainer) {
        corReforcoContainer.style.display = reforcoMarcado ? 'block' : 'none';
      }
    }

    if (tipoGola) {
      tipoGola.addEventListener('change', atualizarCamposGola);
    }
    if (acabamentoGola) {
      acabamentoGola.addEventListener('change', atualizarCamposGola);
    }
    if (reforcoGolaCheck) {
      reforcoGolaCheck.addEventListener('change', atualizarCorReforco);
    }

    atualizarCamposGola();
    atualizarCorReforco();
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
    window.getImagens = () => imagens;
    window.setImagens = (novasImagens) => {
      imagens = novasImagens || [];
      renderizarImagens();
    };
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
      acabamentoManga: document.getElementById('acabamentoManga')?.value || '',
      larguraManga: document.getElementById('larguraManga')?.value || '',
      gola: document.getElementById('gola')?.value || '',
      acabamentoGola: document.getElementById('acabamentoGola')?.value || '',
      corPeitilhoInterno: document.getElementById('corPeitilhoInterno')?.value || '',
      corPeitilhoExterno: document.getElementById('corPeitilhoExterno')?.value || '',
      aberturaLateral: document.getElementById('aberturaLateral')?.checked || false,
      reforcoGola: document.getElementById('reforcoGola')?.checked || false,
      corReforco: document.getElementById('corReforco')?.value || '',
      bolso: document.getElementById('bolso')?.value || 'nenhum',
      filete: document.getElementById('filete')?.value || 'nao',
      faixa: document.getElementById('faixa')?.value || 'nao',
      arte: arteVal,
      composicao: document.getElementById('composicao')?.value || '',
      corSublimacao,
      observacoes: document.getElementById('observacoes')?.value || '',
      // NOVO: Array de imagens com descrições
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

    const setCheck = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.checked = v || false;
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
    setVal('gola', ficha.gola);
    setVal('acabamentoGola', ficha.acabamentoGola);
    setVal('corPeitilhoInterno', ficha.corPeitilhoInterno);
    setVal('corPeitilhoExterno', ficha.corPeitilhoExterno);
    setCheck('aberturaLateral', ficha.aberturaLateral);
    setCheck('reforcoGola', ficha.reforcoGola);
    setVal('corReforco', ficha.corReforco);
    setVal('bolso', ficha.bolso || 'nenhum');
    setVal('filete', ficha.filete || 'nao');
    setVal('faixa', ficha.faixa || 'nao');
    setVal('arte', ficha.arte);
    setVal('composicao', ficha.composicao);
    setVal('observacoes', ficha.observacoes);

    document.getElementById('arte')?.dispatchEvent(new Event('change'));
    document.getElementById('material')?.dispatchEvent(new Event('input'));
    document.getElementById('acabamentoManga')?.dispatchEvent(new Event('change'));
    document.getElementById('gola')?.dispatchEvent(new Event('change'));
    document.getElementById('acabamentoGola')?.dispatchEvent(new Event('change'));
    document.getElementById('reforcoGola')?.dispatchEvent(new Event('change'));

    if (ficha.corSublimacao) {
      const corInput = document.getElementById('cor');
      const corPreview = document.getElementById('corPreview');
      if (corInput && corPreview) {
        corInput.value = ficha.corSublimacao;
        corPreview.style.backgroundColor = ficha.corSublimacao;
      }
    }

    // NOVO: Carregar múltiplas imagens
    if (window.setImagens) {
      if (ficha.imagens && Array.isArray(ficha.imagens) && ficha.imagens.length > 0) {
        window.setImagens(ficha.imagens);
      } else if (ficha.imagem) {
        // Compatibilidade com formato antigo (única imagem)
        window.setImagens([{ src: ficha.imagem, descricao: '' }]);
      } else {
        window.setImagens([]);
      }
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

    const setText = (id, val, fallback = 'Não informado') => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val || fallback;
        el.innerHTML = el.textContent;
      }
    };

    const setTextWithHighlight = (id, val, shouldHighlight, fallback = 'Não informado') => {
      const el = document.getElementById(id);
      if (el) {
        const text = val || fallback;
        if (shouldHighlight) {
          el.innerHTML = `<mark>${text}</mark>`;
        } else {
          el.textContent = text;
        }
      }
    };

    setText('print-dataEmissao', dataEmissao);
    setText('print-numeroVenda', document.getElementById('numeroVenda')?.value);
    setText('print-cliente', document.getElementById('cliente')?.value);
    setText('print-vendedor', document.getElementById('vendedor')?.value);

    setTextWithHighlight(
      'print-dataInicio', 
      formatarDataBrasil(document.getElementById('dataInicio')?.value),
      isEvento
    );

    setTextWithHighlight(
      'print-dataEntrega',
      formatarDataBrasil(document.getElementById('dataEntrega')?.value),
      isEvento
    );

    const eventoTxt = isEvento ? '★ Sim ★' : 'Não';
    const eventoEl = document.getElementById('print-evento');
    if (eventoEl) {
      if (isEvento) {
        eventoEl.innerHTML = '<span style="color: #dc2626; font-weight: bold;">★ Sim ★</span>';
      } else {
        eventoEl.textContent = 'Não';
      }
    }
    // Calcular e mostrar prazo restante
    const dataEntregaVal = document.getElementById('dataEntrega')?.value;
    if (dataEntregaVal) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const entrega = new Date(dataEntregaVal + 'T00:00:00');
      const diffTime = entrega - hoje;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const prazoEl = document.getElementById('print-prazo');
      if (prazoEl) {
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

        prazoEl.innerHTML = '<span style="' + prazoStyle + '">' + prazoTexto + '</span>';
      }
    }


    const printBody = document.getElementById('print-produtosTable');
    if (printBody) {
      printBody.innerHTML = '';
      document.querySelectorAll('#produtosTable tr').forEach(row => {
        const tamanho = row.querySelector('.tamanho')?.value;
        const quantidade = row.querySelector('.quantidade')?.value;
        const descricao = row.querySelector('.descricao')?.value;
        if (!tamanho || !quantidade) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${tamanho}</td>
          <td>${quantidade}</td>
          <td>${descricao || 'Não informado'}</td>
        `;
        printBody.appendChild(tr);
      });
    }

    setText('print-totalItens', document.getElementById('totalItens')?.textContent || '0', '0');

    const getSelectText = id => {
      const sel = document.getElementById(id);
      if (!sel || sel.selectedIndex < 0) return '';
      return sel.options[sel.selectedIndex].text;
    };

    setText('print-material', document.getElementById('material')?.value);
    setText('print-corMaterial', document.getElementById('corMaterial')?.value);
    setText('print-manga', getSelectText('manga'));
    setText('print-acabamentoManga', getSelectText('acabamentoManga'));

    const larguraManga = document.getElementById('larguraManga')?.value;
    const larguraMangaDiv = document.getElementById('print-larguraMangaDiv');
    if (larguraManga && larguraMangaDiv) {
      setText('print-larguraManga', larguraManga + ' cm');
      larguraMangaDiv.style.display = 'block';
    } else if (larguraMangaDiv) {
      larguraMangaDiv.style.display = 'none';
    }

    setText('print-gola', getSelectText('gola'));
    setText('print-acabamentoGola', getSelectText('acabamentoGola'));

    const corPeitilhoInterno = document.getElementById('corPeitilhoInterno')?.value;
    const corPeitilhoInternoDiv = document.getElementById('print-corPeitilhoInternoDiv');
    if (corPeitilhoInterno && corPeitilhoInternoDiv) {
      setText('print-corPeitilhoInterno', corPeitilhoInterno);
      corPeitilhoInternoDiv.style.display = 'block';
    } else if (corPeitilhoInternoDiv) {
      corPeitilhoInternoDiv.style.display = 'none';
    }

    const corPeitilhoExterno = document.getElementById('corPeitilhoExterno')?.value;
    const corPeitilhoExternoDiv = document.getElementById('print-corPeitilhoExternoDiv');
    if (corPeitilhoExterno && corPeitilhoExternoDiv) {
      setText('print-corPeitilhoExterno', corPeitilhoExterno);
      corPeitilhoExternoDiv.style.display = 'block';
    } else if (corPeitilhoExternoDiv) {
      corPeitilhoExternoDiv.style.display = 'none';
    }

    const aberturaLateral = document.getElementById('aberturaLateral')?.checked;
    const aberturaLateralDiv = document.getElementById('print-aberturaLateralDiv');
    if (aberturaLateral && aberturaLateralDiv) {
      setText('print-aberturaLateral', 'Sim');
      aberturaLateralDiv.style.display = 'block';
    } else if (aberturaLateralDiv) {
      aberturaLateralDiv.style.display = 'none';
    }

    const reforcoGola = document.getElementById('reforcoGola')?.checked;
    const reforcoGolaDiv = document.getElementById('print-reforcoGolaDiv');
    if (reforcoGola && reforcoGolaDiv) {
      setText('print-reforcoGola', 'Sim');
      reforcoGolaDiv.style.display = 'block';
    } else if (reforcoGolaDiv) {
      reforcoGolaDiv.style.display = 'none';
    }

    const corReforco = document.getElementById('corReforco')?.value;
    const corReforcoDiv = document.getElementById('print-corReforcoDiv');
    if (corReforco && reforcoGola && corReforcoDiv) {
      setText('print-corReforco', corReforco);
      corReforcoDiv.style.display = 'block';
    } else if (corReforcoDiv) {
      corReforcoDiv.style.display = 'none';
    }

    setText('print-bolso', getSelectText('bolso'));
    setText('print-filete', document.getElementById('filete')?.value === 'sim' ? 'Sim' : 'Não');
    setText('print-faixa', document.getElementById('faixa')?.value === 'sim' ? 'Sim' : 'Não');
    setText('print-arte', getSelectText('arte'));
    setText('print-composicao', document.getElementById('composicao')?.value);
    setText(
      'print-observacoes',
      document.getElementById('observacoes')?.value || 'Nenhuma',
      'Nenhuma'
    );

    // NOVO: Renderizar múltiplas imagens na impressão
    const printImagesContainer = document.getElementById('print-imagesContainer');
    const printImagesSection = document.getElementById('print-imagesSection');

    if (printImagesContainer) {
      printImagesContainer.innerHTML = '';

      const imgs = window.getImagens ? window.getImagens() : [];

      if (imgs.length === 0) {
        // Esconder seção se não há imagens
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