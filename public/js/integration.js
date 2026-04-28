/**
 * Integração do formulário com o banco de dados
 */

(function () {
  'use strict';

  let fichaAtualId = null;
  let modoVisualizacao = false;
  let fichaVisualizacaoAtual = null;
  let fallbackOrigemLocalId = null;
  let salvamentoEmAndamento = false;
  let chaveIdempotenciaCriacao = null;
  const DUPLICACAO_DRAFT_STORAGE_KEY = 'ficha_duplicada_draft_v1';
  const FICHA_FALLBACK_STORAGE_KEY = 'fichas_nao_salvas_fallback_v1';
  const FICHA_FALLBACK_MAX_ITEMS = 20;
  const CAMPOS_OBRIGATORIOS = Object.freeze([
    { key: 'cliente', id: 'cliente', label: 'o nome do cliente' },
    { key: 'vendedor', id: 'vendedor', label: 'o vendedor' },
    { key: 'dataEntrega', id: 'dataEntrega', label: 'a data de entrega' },
    { key: 'material', id: 'material', label: 'o tecido/material' },
    { key: 'arte', id: 'arte', label: 'o tipo de personalização' }
  ]);

  const camposBancoParaForm = {
    'id': 'id',
    'cliente': 'cliente',
    'cliente_auxiliar': 'clienteAuxiliar',
    'cliente_exibicao': 'clienteExibicao',
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
    'cor_acabamento_manga': 'corAcabamentoManga',
    'gola': 'gola',
    'cor_gola': 'corGola',
    'acabamento_gola': 'acabamentoGola',
    'largura_gola': 'larguraGola',
    'cor_peitilho_interno': 'corPeitilhoInterno',
    'cor_peitilho_externo': 'corPeitilhoExterno',
    'cor_pe_de_gola_interno': 'corPeDeGolaInterno',
    'cor_pe_de_gola_externo': 'corPeDeGolaExterno',
    'abertura_lateral': 'aberturaLateral',
    'cor_abertura_lateral': 'corAberturaLateral',
    'reforco_gola': 'reforcoGola',
    'cor_reforco': 'corReforco',
    'cor_botao': 'corBotao',
    'bolso': 'bolso',
    'filete': 'filete',
    'filete_local': 'fileteLocal',
    'filete_cor': 'fileteCor',
    'faixa': 'faixa',
    'faixa_local': 'faixaLocal',
    'faixa_cor': 'faixaCor',
    'arte': 'arte',
    'com_nomes': 'comNomes',
    'observacoes': 'observacoes',
    'observacoes_html': 'observacoesHtml',
    'observacoes_plain_text': 'observacoesPlainText',
    'imagens_data': 'imagensData',
    'imagem_data': 'imagemData',
    'produtos': 'produtos'
  };

  const COM_NOMES_VALOR_NENHUM = '0';
  let menuAcoesFichaState = null;

  function obterChaveIdempotenciaCriacao() {
    if (chaveIdempotenciaCriacao) return chaveIdempotenciaCriacao;

    const randomPart = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);

    chaveIdempotenciaCriacao = `ficha-create-${Date.now()}-${randomPart}`;
    return chaveIdempotenciaCriacao;
  }

  function normalizarComNomesValor(valor) {
    if (valor === true) return '1';
    if (valor === false || valor === null || valor === undefined) return COM_NOMES_VALOR_NENHUM;

    const numero = Number.parseInt(String(valor).trim(), 10);
    if (Number.isInteger(numero) && numero >= 1 && numero <= 3) return String(numero);

    const texto = String(valor).trim();
    if (!texto) return COM_NOMES_VALOR_NENHUM;

    if (/somente n[úu]meros/i.test(texto)) return '3';
    if (/com nomes e n[úu]meros/i.test(texto)) return '2';
    if (/com nomes/i.test(texto) || /^true$/i.test(texto)) return '1';

    return COM_NOMES_VALOR_NENHUM;
  }

  function detectarComNomesPorTexto(texto) {
    const valorTexto = String(texto || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!valorTexto) return COM_NOMES_VALOR_NENHUM;

    if (/(?:^|\/\s*)SOMENTE N[ÚU]MEROS\s*$/i.test(valorTexto)) return '3';
    if (/(?:^|\/\s*)COM NOMES E N[ÚU]MEROS\s*$/i.test(valorTexto)) return '2';
    if (/(?:^|\/\s*)COM NOMES\s*$/i.test(valorTexto)) return '1';

    return COM_NOMES_VALOR_NENHUM;
  }

  function extrairClienteLegado(cliente, clienteAuxiliar) {
    const nomeOriginal = String(cliente || '').trim().replace(/\s+/g, ' ');
    const auxiliarOriginal = String(clienteAuxiliar || '').trim().replace(/\s+/g, ' ');
    if (auxiliarOriginal) return { cliente: nomeOriginal, clienteAuxiliar: auxiliarOriginal };

    const legacyMatch = nomeOriginal.match(/^(.*)\(([^()]+)\)\s*$/);
    if (!legacyMatch) return { cliente: nomeOriginal, clienteAuxiliar: "" };

    const nomeBase = String(legacyMatch[1] || '').trim().replace(/\s+/g, ' ');
    const nomeAux = String(legacyMatch[2] || '').trim().replace(/\s+/g, ' ');
    if (!nomeBase || !nomeAux) return { cliente: nomeOriginal, clienteAuxiliar: "" };

    return { cliente: nomeBase, clienteAuxiliar: nomeAux };
  }

  function converterBancoParaForm(fichaBanco) {
    const fichaForm = {};
    for (const [chaveBanco, valor] of Object.entries(fichaBanco)) {
      const chaveForm = camposBancoParaForm[chaveBanco] || chaveBanco;
      fichaForm[chaveForm] = valor;
    }

    const clienteLegado = extrairClienteLegado(fichaForm.cliente, fichaForm.clienteAuxiliar ?? fichaForm.cliente_auxiliar);
    fichaForm.cliente = clienteLegado.cliente;
    fichaForm.clienteAuxiliar = clienteLegado.clienteAuxiliar;
    return fichaForm;
  }

  function formatarNomeClienteExibicao(cliente, clienteAuxiliar) {
    if (window.appUtils && typeof window.appUtils.formatClientDisplayName === 'function') {
      return window.appUtils.formatClientDisplayName(cliente, clienteAuxiliar);
    }

    const nomeBase = String(cliente || '').trim().replace(/\s+/g, ' ');
    const nomeAuxiliar = String(clienteAuxiliar || '').trim().replace(/\s+/g, ' ');
    if (!nomeBase) return nomeAuxiliar;
    if (!nomeAuxiliar) return nomeBase;
    return `${nomeBase} (${nomeAuxiliar})`.replace(' )', ')');
  }

  function atualizarTituloEdicao(id, clienteNome, clienteAuxiliar) {
    const header = document.querySelector('header h1');
    if (!header) return;

    const nomeBase = formatarNomeClienteExibicao(clienteNome || document.getElementById('cliente')?.value || '', clienteAuxiliar || document.getElementById('clienteAuxiliar')?.value || '').trim();
    const nomeExibicao = nomeBase ? nomeBase.toUpperCase() : 'SEM_CLIENTE';

    header.innerHTML = '';

    const icon = document.createElement('i');
    icon.className = 'fas fa-edit';

    const texto = document.createTextNode(` Editando Ficha de ${nomeExibicao} `);

    const idSpan = document.createElement('span');
    idSpan.className = 'header-edit-id';
    idSpan.textContent = `[#${id}]`;

    header.appendChild(icon);
    header.appendChild(texto);
    header.appendChild(idSpan);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await initDatabaseIntegration();
  });

  async function initDatabaseIntegration() {
    try {
      await db.init();
      await initClienteAutocomplete();
      if (typeof window.ensureFichaAppInitialized === 'function') {
        await window.ensureFichaAppInitialized();
      }
      await verificarParametrosURL();
      if (!modoVisualizacao) {
        configurarBotoesAcao();
      }
    } catch (error) { }
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
    const containerTopo = document.getElementById('acoesContainerTopo');
    const containers = [containerTopo].filter(Boolean);
    if (containers.length === 0) return;

    containers.forEach(container => {
      container.innerHTML = '';
    });

    const acaoImprimir = () => {
      if (typeof gerarVersaoImpressao === 'function') {
        gerarVersaoImpressao();
      } else {
        window.print();
      }
    };

    const botoesEsquerda = [];
    const botoesCentro = [];
    const botoesDireita = [];

    const botaoHomeHub = {
      id: 'btnHomeHub',
      classe: 'btn-secondary',
      icone: 'fa-house',
      texto: 'Painel de Controle',
      onClick: () => {
        window.location.href = '/dashboard';
      }
    };

    if (modoVisualizacao) {
      botoesEsquerda.push({ id: 'btnImprimir', classe: 'btn-secondary', extraClasse: 'btn-action-print', icone: 'fa-print', texto: 'Imprimir', onClick: acaoImprimir });
      botoesCentro.push({ id: 'btnDuplicar', classe: 'btn-primary', icone: 'fa-copy', texto: 'Duplicar Ficha', onClick: duplicarFicha });
      botoesDireita.push({
        id: 'btnEditar',
        classe: 'btn-warning',
        icone: 'fa-edit',
        texto: 'Editar',
        onClick: () => {
          window.location.href = `/ficha?editar=${fichaAtualId}`;
        }
      });
      botoesDireita.push(botaoHomeHub);
    } else if (fichaAtualId) {
      botoesEsquerda.push({
        id: 'btnSalvarDB',
        classe: 'btn-success',
        extraClasse: 'btn-action-save',
        icone: 'fa-save',
        texto: `Atualizar Ficha #${fichaAtualId}`,
        onClick: salvarNoBanco
      });
      botoesEsquerda.push({ id: 'btnImprimir', classe: 'btn-secondary', extraClasse: 'btn-action-print', icone: 'fa-print', texto: 'Imprimir', onClick: acaoImprimir });
      botoesCentro.push({ id: 'btnMenuAcoesFicha', isMenuAcoes: true });
      botoesDireita.push({
        id: 'btnNovaFicha',
        classe: 'btn-primary',
        icone: 'fa-plus',
        texto: 'Nova Ficha',
        onClick: () => {
          window.location.href = '/ficha';
        }
      });
      botoesDireita.push(botaoHomeHub);
    } else {
      botoesEsquerda.push({ id: 'btnSalvarDB', classe: 'btn-success', extraClasse: 'btn-action-save', icone: 'fa-save', texto: 'Salvar Ficha', onClick: salvarNoBanco });
      botoesEsquerda.push({ id: 'btnImprimir', classe: 'btn-secondary', extraClasse: 'btn-action-print', icone: 'fa-print', texto: 'Imprimir', onClick: acaoImprimir });
      botoesCentro.push({ id: 'btnMenuAcoesFicha', isMenuAcoes: true });
      botoesDireita.push(botaoHomeHub);
    }

    containers.forEach(container => {
      const grupoEsquerda = document.createElement('div');
      grupoEsquerda.className = 'ficha-toolbar-group ficha-toolbar-group--left';
      const grupoCentro = document.createElement('div');
      grupoCentro.className = 'ficha-toolbar-group ficha-toolbar-group--center';
      const grupoDireita = document.createElement('div');
      grupoDireita.className = 'ficha-toolbar-group ficha-toolbar-group--right';

      function adicionarItens(grupo, itens) {
        itens.forEach(botaoDef => {
          if (botaoDef.isMenuAcoes) {
            grupo.appendChild(criarMenuAcoesFicha());
            return;
          }

          const btn = criarBotao(botaoDef.id, botaoDef.classe, botaoDef.icone, botaoDef.texto, botaoDef.onClick, botaoDef.extraClasse);
          if (botaoDef.id === 'btnSalvarDB') {
            btn.dataset.action = 'save-db';
            btn.dataset.defaultHtml = btn.innerHTML;
          }
          grupo.appendChild(btn);
        });
      }

      adicionarItens(grupoEsquerda, botoesEsquerda);
      adicionarItens(grupoCentro, botoesCentro);
      adicionarItens(grupoDireita, botoesDireita);

      [grupoEsquerda, grupoCentro, grupoDireita].forEach(grupo => {
        if (grupo.childElementCount > 0) {
          container.appendChild(grupo);
        }
      });
    });

    if (salvamentoEmAndamento) {
      atualizarEstadoBotoesSalvar(true);
    }
  }

  function atualizarEstadoBotoesSalvar(emSalvamento) {
    const botoesSalvar = document.querySelectorAll('button[data-action="save-db"]');
    botoesSalvar.forEach(botao => {
      if (!botao.dataset.defaultHtml) {
        botao.dataset.defaultHtml = botao.innerHTML;
      }
      botao.disabled = emSalvamento;
      botao.setAttribute('aria-busy', emSalvamento ? 'true' : 'false');
      if (emSalvamento) {
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando...</span>';
      } else {
        botao.innerHTML = botao.dataset.defaultHtml;
      }
    });
  }

  function criarBotao(id, classe, icone, texto, onClick, extraClasse = '') {
    const btn = document.createElement('button');
    if (id) btn.id = id;
    btn.type = 'button';
    btn.className = `btn ${classe}${extraClasse ? ` ${extraClasse}` : ''}`;
    btn.innerHTML = `<i class="fas ${icone}"></i><span>${texto}</span>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function fecharMenuAcoesFicha() {
    if (!menuAcoesFichaState) return;
    menuAcoesFichaState.tooltip.classList.remove('is-open');
    menuAcoesFichaState.button.setAttribute('aria-expanded', 'false');
  }

  function abrirMenuAcoesFicha() {
    if (!menuAcoesFichaState) return;
    menuAcoesFichaState.tooltip.classList.add('is-open');
    menuAcoesFichaState.button.setAttribute('aria-expanded', 'true');
  }

  function preencherConteudoMenuAcoes(menuContent) {
    if (!menuContent) return;

    menuContent.innerHTML = `
      <button type="button" class="menu-acoes-ficha-item" data-action="carregar-ficha">
        <i class="fas fa-upload" aria-hidden="true"></i>
        <span>Carregar ficha</span>
      </button>
      <button type="button" class="menu-acoes-ficha-item" data-action="baixar-ficha">
        <i class="fas fa-download" aria-hidden="true"></i>
        <span>Baixar ficha</span>
      </button>
    `;
  }

  function criarMenuAcoesFicha() {
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-acoes-ficha';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.id = 'btnMenuAcoesFicha';
    button.innerHTML = '<i class="fas fa-ellipsis-h"></i><span>Mais ações</span>';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'dialog');

    const tooltip = document.createElement('div');
    tooltip.className = 'menu-acoes-ficha-popover';
    tooltip.innerHTML = `
      <div class="menu-acoes-ficha-header">
        <strong>Ações da ficha</strong>
        <span>Escolha uma ação complementar</span>
      </div>
      <div class="menu-acoes-ficha-content"></div>
    `;

    wrapper.appendChild(button);
    wrapper.appendChild(tooltip);

    menuAcoesFichaState = {
      wrapper,
      button,
      tooltip
    };

    const content = tooltip.querySelector('.menu-acoes-ficha-content');
    preencherConteudoMenuAcoes(content);

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const aberto = tooltip.classList.contains('is-open');
      if (aberto) {
        fecharMenuAcoesFicha();
        return;
      }

      abrirMenuAcoesFicha();
    });

    tooltip.addEventListener('click', (event) => {
      const actionButton = event.target.closest('.menu-acoes-ficha-item');
      if (!actionButton) return;

      const action = actionButton.dataset.action || '';
      if (action === 'carregar-ficha') {
        fecharMenuAcoesFicha();
        if (typeof carregarFichaDeArquivo === 'function') carregarFichaDeArquivo();
        return;
      }

      if (action === 'baixar-ficha') {
        fecharMenuAcoesFicha();
        if (typeof salvarFicha === 'function') salvarFicha();
      }
    });

    if (!window.__menuAcoesFichaClickHandler) {
      window.__menuAcoesFichaClickHandler = true;

      document.addEventListener('click', (event) => {
        if (!menuAcoesFichaState) return;
        if (menuAcoesFichaState.wrapper.contains(event.target)) return;
        fecharMenuAcoesFicha();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') fecharMenuAcoesFicha();
      });
    }

    return wrapper;
  }

  function textoSemHtml(valor) {
    return String(valor || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function obterObservacoesPreferencial(dados) {
    if (!dados || typeof dados !== 'object') return '';

    const observacoesHtml = String(dados.observacoesHtml || dados.observacoes_html || '').trim();
    const observacoes = String(dados.observacoes || '').trim();
    const observacoesPlain = String(dados.observacoesPlainText || dados.observacoes_plain_text || '').trim();

    return observacoesHtml || observacoes || observacoesPlain;
  }

  function normalizarObservacoesDuplicacao(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    const observacoesOrigem = obterObservacoesPreferencial(payload);
    if (!observacoesOrigem) return payload;

    if (!String(payload.observacoes || '').trim()) {
      payload.observacoes = observacoesOrigem;
    }

    if (!String(payload.observacoesHtml || '').trim()) {
      payload.observacoesHtml = String(payload.observacoes || observacoesOrigem);
    }

    if (!String(payload.observacoesPlainText || '').trim()) {
      payload.observacoesPlainText = textoSemHtml(payload.observacoesHtml || payload.observacoes || observacoesOrigem);
    }

    return payload;
  }

  function prepararDadosParaDuplicacao(dados) {
    if (!dados || typeof dados !== 'object') return null;

    const hoje = new Date();
    const dataAtualIso = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, '0'),
      String(hoje.getDate()).padStart(2, '0')
    ].join('-');

    const payload = { ...dados };
    delete payload.id;
    delete payload.status;
    delete payload.dataCriacao;
    delete payload.dataAtualizacao;
    delete payload.data_criacao;
    delete payload.data_atualizacao;
    payload.dataInicio = dataAtualIso;
    payload.data_inicio = dataAtualIso;
    payload.dataEntrega = '';
    payload.data_entrega = '';

    return normalizarObservacoesDuplicacao(payload);
  }

  function salvarRascunhoDuplicacao(payload) {
    if (!payload || typeof payload !== 'object') return false;

    try {
      sessionStorage.setItem(DUPLICACAO_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function carregarRascunhoDuplicacao() {
    try {
      const raw = sessionStorage.getItem(DUPLICACAO_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return normalizarObservacoesDuplicacao(parsed);
    } catch {
      return null;
    }
  }

  function limparRascunhoDuplicacao() {
    try {
      sessionStorage.removeItem(DUPLICACAO_DRAFT_STORAGE_KEY);
    } catch { }
  }

  function normalizarNomeArquivo(valor, fallback = 'ficha') {
    const base = String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return base || fallback;
  }

  function baixarJsonFicha(dados, prefixo = 'ficha_fallback') {
    const payload = {
      ...dados,
      fallbackGeradoEm: new Date().toISOString()
    };

    const clienteSlug = normalizarNomeArquivo(dados?.cliente, 'sem_cliente');
    const vendaSlug = normalizarNomeArquivo(dados?.numeroVenda, '');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const partes = [prefixo, clienteSlug];
    if (vendaSlug) partes.push(vendaSlug);
    partes.push(stamp);

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${partes.join('_')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function lerFichasFallbackLocal() {
    try {
      const raw = localStorage.getItem(FICHA_FALLBACK_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && typeof item === 'object');
    } catch {
      return [];
    }
  }

  function salvarFichasFallbackLocal(lista) {
    localStorage.setItem(FICHA_FALLBACK_STORAGE_KEY, JSON.stringify(lista));
  }

  function gerarFallbackFingerprint(dados) {
    const id = Number.parseInt(String(dados?.id || ''), 10);
    if (Number.isInteger(id) && id > 0) return `id:${id}`;

    const cliente = String(dados?.cliente || '').trim().toLowerCase();
    const venda = String(dados?.numeroVenda || '').trim().toLowerCase();
    const entrega = String(dados?.dataEntrega || '').trim();
    return `novo:${cliente}|${venda}|${entrega}`;
  }

  function salvarFichaFallbackLocal(dados, error) {
    const listaAtual = lerFichasFallbackLocal();
    const agoraIso = new Date().toISOString();
    const fingerprint = gerarFallbackFingerprint(dados);
    const indiceExistente = listaAtual.findIndex(item => String(item?.fingerprint || '') === fingerprint);

    const item = {
      localId: indiceExistente >= 0 && listaAtual[indiceExistente]?.localId
        ? String(listaAtual[indiceExistente].localId)
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      fingerprint,
      cliente: String(dados?.cliente || '').trim(),
      numeroVenda: String(dados?.numeroVenda || '').trim(),
      dataEntrega: String(dados?.dataEntrega || '').trim(),
      dataFalha: agoraIso,
      erro: String(error?.message || 'Falha ao salvar no banco'),
      ficha: { ...dados }
    };

    if (indiceExistente >= 0) {
      listaAtual[indiceExistente] = item;
    } else {
      listaAtual.unshift(item);
    }

    const listaFinal = listaAtual
      .sort((a, b) => String(b?.dataFalha || '').localeCompare(String(a?.dataFalha || '')))
      .slice(0, FICHA_FALLBACK_MAX_ITEMS);

    salvarFichasFallbackLocal(listaFinal);
    return item.localId;
  }

  function removerFichaFallbackLocal(localId) {
    if (!localId) return;
    try {
      const lista = lerFichasFallbackLocal();
      const filtrada = lista.filter(item => String(item?.localId || '') !== String(localId));
      salvarFichasFallbackLocal(filtrada);
    } catch { }
  }

  function removerFichaFallbackPorDados(dados) {
    try {
      const fingerprint = gerarFallbackFingerprint(dados);
      const lista = lerFichasFallbackLocal();
      const filtrada = lista.filter(item => String(item?.fingerprint || '') !== String(fingerprint));
      salvarFichasFallbackLocal(filtrada);
    } catch { }
  }

  function carregarFichaFallbackLocal(localId) {
    const lista = lerFichasFallbackLocal();
    const item = lista.find(registro => String(registro?.localId || '') === String(localId));
    if (!item || !item.ficha || typeof item.ficha !== 'object') return null;
    return item;
  }

  function aplicarFallbackSalvar(dados, error) {
    const resultado = {
      downloadOk: false,
      localOk: false
    };

    try {
      baixarJsonFicha(dados, 'ficha_fallback_erro_db');
      resultado.downloadOk = true;
    } catch { }

    try {
      const localId = salvarFichaFallbackLocal(dados, error);
      if (localId) resultado.localOk = true;
    } catch { }

    return resultado;
  }

  function navegarParaDuplicacao(payload) {
    const dados = prepararDadosParaDuplicacao(payload);
    if (!dados) return false;

    const salvo = salvarRascunhoDuplicacao(dados);
    if (!salvo) return false;

    window.location.href = '/ficha?duplicar=1';
    return true;
  }

  async function duplicarFicha() {
    try {
      let dados = (modoVisualizacao && fichaVisualizacaoAtual)
        ? { ...fichaVisualizacaoAtual }
        : coletarDadosFormulario();

      const temObservacoes = !!obterObservacoesPreferencial(dados);
      if (modoVisualizacao && !temObservacoes) {
        const fichaId = Number.parseInt(String(fichaAtualId || ''), 10);
        if (Number.isInteger(fichaId) && fichaId > 0) {
          const fichaBanco = await db.buscarFicha(fichaId);
          const dadosBanco = fichaBanco ? converterBancoParaForm(fichaBanco) : null;

          if (!dados || typeof dados !== 'object') {
            dados = dadosBanco || dados;
          } else if (dadosBanco && obterObservacoesPreferencial(dadosBanco)) {
            if (!String(dados.observacoes || '').trim()) {
              dados.observacoes = dadosBanco.observacoes || dadosBanco.observacoesHtml || '';
            }
            if (!String(dados.observacoesHtml || '').trim()) {
              dados.observacoesHtml = dadosBanco.observacoesHtml || dadosBanco.observacoes || '';
            }
            if (!String(dados.observacoesPlainText || '').trim() && String(dadosBanco.observacoesPlainText || '').trim()) {
              dados.observacoesPlainText = dadosBanco.observacoesPlainText;
            }
          }
        }
      }

      const iniciouDuplicacao = navegarParaDuplicacao(dados);
      if (!iniciouDuplicacao) {
        throw new Error('Falha ao preparar duplicação');
      }

    } catch (error) {
      window.toast.show({ message: 'Erro ao duplicar ficha', type: 'error' });
    }
  }

  async function salvarNoBanco() {
    if (salvamentoEmAndamento) return;
    salvamentoEmAndamento = true;
    atualizarEstadoBotoesSalvar(true);

    let dados = null;
    try {
      if (typeof window.hasPendingImageUploads === 'function' && window.hasPendingImageUploads()) {
        window.toast.show({ message: 'Aguarde o envio das imagens terminar para salvar a ficha.', type: 'warning' });
        return;
      }

      dados = coletarDadosFormulario();

      if (!validarCamposObrigatorios(dados)) {
        return;
      }

      if (fichaAtualId) {
        dados.id = fichaAtualId;
      }

      const criandoNovaFicha = !fichaAtualId;
      if (criandoNovaFicha) {
        dados.__idempotencyKey = obterChaveIdempotenciaCriacao();
      }

      const id = await db.salvarFicha(dados);

      if (!fichaAtualId) {
        fichaAtualId = id;
        chaveIdempotenciaCriacao = null;

        const novaUrl = new URL(window.location.href);
        novaUrl.searchParams.set('editar', id);
        window.history.replaceState({}, '', novaUrl);

        atualizarTituloEdicao(fichaAtualId, dados.cliente, dados.clienteAuxiliar);

        configurarBotoesAcao();
      }

      const acao = dados.id && dados.id === fichaAtualId ? 'atualizada' : 'salva';
      window.toast.show({ message: `Ficha ${acao} com sucesso!`, type: 'success' });

      await initClienteAutocomplete();

      removerFichaFallbackPorDados(dados);

      if (fallbackOrigemLocalId) {
        removerFichaFallbackLocal(fallbackOrigemLocalId);
        fallbackOrigemLocalId = null;
      }

    } catch (error) {
      const mensagemErro = construirMensagemErroSalvar(error);
      const fallback = dados ? aplicarFallbackSalvar(dados, error) : { downloadOk: false, localOk: false };

      const detalhes = [];
      if (fallback.downloadOk) detalhes.push('JSON baixado automaticamente.');
      if (fallback.localOk) detalhes.push('Rascunho guardado localmente na Central.');
      const mensagemFinal = detalhes.length ? `${mensagemErro} ${detalhes.join(' ')}` : mensagemErro;
      window.toast.show({ message: mensagemFinal, type: 'warning' });
    } finally {
      salvamentoEmAndamento = false;
      atualizarEstadoBotoesSalvar(false);
    }
  }

  function construirMensagemErroSalvar(error) {
    const mensagemBase = String(error?.message || '').trim();
    const detalhes = Array.isArray(error?.details) ? error.details : [];

    if (detalhes.length > 0) {
      const resumo = detalhes
        .slice(0, 3)
        .map(item => {
          const campo = String(item?.path || 'campo').trim();
          const mensagem = String(item?.message || 'valor invalido').trim();
          return `${campo}: ${mensagem}`;
        })
        .join(' | ');
      return `Falha ao salvar ficha. ${resumo}`;
    }

    if (mensagemBase) {
      return `Falha ao salvar ficha. ${mensagemBase}`;
    }

    return 'Erro ao salvar ficha no banco de dados';
  }

  function validarCamposObrigatorios(dados) {
    for (const campo of CAMPOS_OBRIGATORIOS) {
      const valor = String(dados?.[campo.key] || '').trim();
      if (valor && !(campo.key === 'arte' && valor === '-')) continue;

      window.toast.show({ message: `Por favor, informe ${campo.label}`, type: 'error' });
      const input = document.getElementById(campo.id);
      if (input) input.focus();
      return false;
    }

    const invalidProductRow = window.fichaProductUtils?.findFirstInvalidProductRow?.();
    if (invalidProductRow) {
      window.toast.show({ message: `Informe o produto na linha ${invalidProductRow.index + 1}.`, type: 'error' });
      invalidProductRow.row.querySelector('.produto')?.focus();
      return false;
    }

    const produtosValidos = window.fichaProductUtils?.collectProductsFromTable?.() || [];
    if (produtosValidos.length === 0) {
      window.toast.show({ message: 'Adicione pelo menos um produto para salvar a ficha.', type: 'error' });
      document.querySelector('#produtosTable .produto')?.focus();
      return false;
    }
    return true;
  }

  function normalizarTextoObservacoes(valor) {
    return String(valor || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]+$/g, '')
      .replace(/(?:[\n\r\t ]|\u00a0)+$/g, '');
  }

  function limparVaziosFinaisHtmlObservacoes(html) {
    const bruto = String(html || '');
    if (!bruto.trim()) return '';

    const temp = document.createElement('div');
    temp.innerHTML = bruto;

    const elementosComConteudo = new Set(['img', 'svg', 'video', 'audio', 'iframe', 'canvas', 'object', 'embed']);

    const textoVisivel = valor => String(valor || '').replace(/\u00a0/g, ' ').trim();

    const noEhVazio = no => {
      if (!no) return true;

      if (no.nodeType === Node.TEXT_NODE) {
        return !textoVisivel(no.textContent);
      }

      if (no.nodeType !== Node.ELEMENT_NODE) return true;

      const tag = String(no.tagName || '').toLowerCase();
      if (elementosComConteudo.has(tag)) return false;
      if (tag === 'br') return true;
      if (textoVisivel(no.textContent)) return false;

      return Array.from(no.childNodes || []).every(filho => noEhVazio(filho));
    };

    while (temp.lastChild && noEhVazio(temp.lastChild)) {
      temp.removeChild(temp.lastChild);
    }

    return temp.innerHTML.trim();
  }

  function sanitizarObservacoesParaPersistencia(valor) {
    const bruto = String(valor || '');
    if (!bruto.trim()) return '';

    const pareceHtml = /<[^>]+>/.test(bruto);
    if (!pareceHtml) {
      return normalizarTextoObservacoes(bruto);
    }

    const htmlSemVaziosFinais = limparVaziosFinaisHtmlObservacoes(bruto);
    if (!htmlSemVaziosFinais) return '';

    return normalizarTextoObservacoes(htmlSemVaziosFinais);
  }

  function coletarObservacoesFormulario() {
    const observacoesTextarea = document.getElementById('observacoes');
    const valorTextarea = observacoesTextarea?.value || '';

    if (!window.richTextEditor || typeof window.richTextEditor.getContent !== 'function') {
      return sanitizarObservacoesParaPersistencia(valorTextarea);
    }

    const valorEditor = String(window.richTextEditor.getContent() || '');
    if (valorEditor.trim()) return sanitizarObservacoesParaPersistencia(valorEditor);
    return sanitizarObservacoesParaPersistencia(valorTextarea);
  }

  function coletarDadosFormulario() {
    let imagensData = [];
    if (typeof window.getImagens === 'function') {
      imagensData = window.getImagens();
    }

    const gola = document.getElementById('gola')?.value || '';
    const isPolo = gola === 'polo' || gola === 'v_polo';
    const isSocial = gola === 'social';
    const temGola = gola !== '';
    const isRegataAtivo = typeof window.isModoRegataAtivo === 'function' && window.isModoRegataAtivo();
    const viesVal = document.getElementById('vies')?.value || '';
    const acabamentoManga = isRegataAtivo
      ? (viesVal === 'sim' ? 'vies' : '')
      : (document.getElementById('acabamentoManga')?.value || '');
    const temAcabamentoMangaExtra = isRegataAtivo
      ? (viesVal === 'sim')
      : (acabamentoManga.startsWith('punho') || acabamentoManga.includes('vies'));
    const larguraManga = temAcabamentoMangaExtra ? (document.getElementById('larguraManga')?.value || '') : '';
    const corAcabamentoManga = temAcabamentoMangaExtra ? (document.getElementById('corAcabamentoManga')?.value || '') : '';
    const reforcoGola = (temGola && !isSocial) ? (document.getElementById('reforcoGola')?.value || 'nao') : 'nao';
    const aberturaLateral = isPolo ? (document.getElementById('aberturaLateral')?.value || 'nao') : 'nao';
    const observacoes = coletarObservacoesFormulario();

    const dados = {
      cliente: document.getElementById('cliente')?.value || '',
      clienteAuxiliar: document.getElementById('clienteAuxiliar')?.value || '',
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
      acabamentoManga,
      larguraManga,
      corAcabamentoManga,
      gola,
      corGola: (temGola && !isSocial) ? (document.getElementById('corGola')?.value || '') : '',
      acabamentoGola: (isPolo || isSocial) ? '' : (document.getElementById('acabamentoGola')?.value || ''),
      larguraGola: (isPolo || isSocial) ? '' : (document.getElementById('larguraGola')?.value || ''),
      corPeitilhoInterno: isPolo ? (document.getElementById('corPeitilhoInterno')?.value || '') : '',
      corPeitilhoExterno: isPolo ? (document.getElementById('corPeitilhoExterno')?.value || '') : '',
      corPeDeGolaInterno: isSocial ? (document.getElementById('corPeDeGolaInterno')?.value || '') : '',
      corPeDeGolaExterno: isSocial ? (document.getElementById('corPeDeGolaExterno')?.value || '') : '',
      corBotao: (isPolo || isSocial) ? (document.getElementById('corBotao')?.value || '') : '',
      aberturaLateral,
      corAberturaLateral: (isPolo && aberturaLateral === 'sim') ? (document.getElementById('corAberturaLateral')?.value || '') : '',
      reforcoGola,
      corReforco: reforcoGola === 'sim' ? (document.getElementById('corReforco')?.value || '') : '',
      bolso: document.getElementById('bolso')?.value || '',
      filete: document.getElementById('filete')?.value || '',
      fileteLocal: document.getElementById('fileteLocal')?.value || '',
      fileteCor: document.getElementById('fileteCor')?.value || '',
      faixa: document.getElementById('faixa')?.value || '',
      faixaLocal: document.getElementById('faixaLocal')?.value || '',
      faixaCor: document.getElementById('faixaCor')?.value || '',
      arte: document.getElementById('arte')?.value || '',
      comNomes: Number(normalizarComNomesValor(document.getElementById('comNomes')?.value || '0')),
      observacoes,
      imagensData: JSON.stringify(imagensData),
      imagemData: imagensData.length > 0 ? imagensData[0].src : ''
    };

    return dados;
  }

  function coletarProdutos() {
    if (window.fichaProductUtils?.collectProductsFromTable) {
      return window.fichaProductUtils.collectProductsFromTable();
    }

    return [];
  }

  async function verificarParametrosURL() {
    const params = new URLSearchParams(window.location.search);

    const editarId = params.get('editar');
    const visualizarId = params.get('visualizar');
    const duplicar = params.get('duplicar');
    const fallbackLocalId = params.get('fallbackLocal');

    if (editarId) {
      modoVisualizacao = false;
      fichaVisualizacaoAtual = null;
      if (typeof window.setFichaVisualizacaoData === 'function') {
        window.setFichaVisualizacaoData(null);
      }
      await carregarFichaParaEdicao(parseInt(editarId));
    } else if (visualizarId) {
      modoVisualizacao = true;
      await carregarFichaParaVisualizacao(parseInt(visualizarId));
    } else if (duplicar) {
      modoVisualizacao = false;
      fichaVisualizacaoAtual = null;
      if (typeof window.setFichaVisualizacaoData === 'function') {
        window.setFichaVisualizacaoData(null);
      }

      const rascunho = carregarRascunhoDuplicacao();
      limparRascunhoDuplicacao();

      if (rascunho) {
        setTimeout(() => {
          preencherFormulario(rascunho);
          configurarBotoesAcao();
          window.toast.show({ message: 'Cópia carregada. Clique em salvar para persistir a nova ficha.', type: 'success' });
        }, 100);
      } else {
        window.toast.show({ message: 'Não foi possível carregar os dados para duplicação.', type: 'error' });
      }

      const novaUrl = new URL(window.location.href);
      novaUrl.searchParams.delete('duplicar');
      window.history.replaceState({}, '', novaUrl.toString());
    } else if (fallbackLocalId) {
      modoVisualizacao = false;
      fichaVisualizacaoAtual = null;
      if (typeof window.setFichaVisualizacaoData === 'function') {
        window.setFichaVisualizacaoData(null);
      }

      const itemFallback = carregarFichaFallbackLocal(fallbackLocalId);
      if (itemFallback?.ficha) {
        fallbackOrigemLocalId = String(itemFallback.localId || fallbackLocalId);
        setTimeout(() => {
          preencherFormulario(itemFallback.ficha);
          configurarBotoesAcao();
          window.toast.show({ message: 'Rascunho local carregado. Clique em salvar para enviar ao banco.', type: 'warning' });
        }, 100);
      } else {
        window.toast.show({ message: 'Rascunho local não encontrado.', type: 'error' });
      }

      const novaUrl = new URL(window.location.href);
      novaUrl.searchParams.delete('fallbackLocal');
      window.history.replaceState({}, '', novaUrl.toString());
    } else {
      modoVisualizacao = false;
      fichaVisualizacaoAtual = null;
      if (typeof window.setFichaVisualizacaoData === 'function') {
        window.setFichaVisualizacaoData(null);
      }
    }
  }

  async function carregarFichaParaEdicao(id) {
    try {
      const fichaBanco = await db.buscarFicha(id);

      if (!fichaBanco) {
        window.toast.show({ message: 'Ficha não encontrada', type: 'error' });
        window.location.href = '/dashboard';
        return;
      }

      fichaAtualId = id;
      chaveIdempotenciaCriacao = null;

      const ficha = converterBancoParaForm(fichaBanco);

      setTimeout(() => {
        preencherFormulario(ficha);
        configurarBotoesAcao();
      }, 100);

      atualizarTituloEdicao(id, ficha.cliente, ficha.clienteAuxiliar ?? ficha.cliente_auxiliar);

    } catch (error) {
      window.toast.show({ message: 'Erro ao carregar ficha para edição', type: 'error' });
    }
  }

  async function carregarFichaParaVisualizacao(id) {
    try {
      const fichaBanco = await db.buscarFicha(id);

      if (!fichaBanco) {
        window.toast.show({ message: 'Ficha não encontrada', type: 'error' });
        window.location.href = '/dashboard';
        return;
      }

      fichaAtualId = id;
      chaveIdempotenciaCriacao = null;

      const ficha = converterBancoParaForm(fichaBanco);

      fichaVisualizacaoAtual = { ...ficha };

      if (typeof window.setFichaVisualizacaoData === 'function') {
        window.setFichaVisualizacaoData(fichaVisualizacaoAtual);
      }

      if (typeof window.gerarVersaoImpressao === 'function') {
        setTimeout(() => {
          window.gerarVersaoImpressao(true, fichaVisualizacaoAtual);
        }, 120);
      }

    } catch (error) {
      window.toast.show({ message: 'Erro ao carregar ficha para visualização', type: 'error' });
    }
  }

  // Parser de imagens

  function parsearImagensData(imagensData) {
    if (!imagensData) return [];

    if (Array.isArray(imagensData)) return imagensData;

    if (typeof imagensData === 'string') {
      if (imagensData.trim() === '' || imagensData.trim() === '[]') return [];

      try {
        const parsed = JSON.parse(imagensData);
        if (Array.isArray(parsed)) return parsed;
        return [];
      } catch (e) {
        return [];
      }
    }

    return [];
  }

  function preencherFormulario(ficha) {
    window.__preenchendoFicha = true;
    const observacoesSalvas = ficha.observacoesHtml || ficha.observacoes || '';
    const acabamentoMangaFicha = String(ficha.acabamentoManga ?? ficha.acabamento_manga ?? '').trim();

    const camposTexto = [
      'cliente', 'clienteAuxiliar', 'vendedor', 'dataInicio', 'numeroVenda',
      'dataEntrega', 'evento', 'material', 'composicao',
      'corMaterial', 'manga', 'acabamentoManga', 'larguraManga', 'corAcabamentoManga',
      'gola', 'corGola', 'acabamentoGola', 'larguraGola',
      'corPeitilhoInterno', 'corPeitilhoExterno', 'corBotao',
      'corPeDeGolaInterno', 'corPeDeGolaExterno',
      'aberturaLateral', 'corAberturaLateral',
      'reforcoGola', 'corReforco',
      'bolso', 'filete', 'fileteLocal', 'fileteCor',
      'faixa', 'faixaLocal', 'faixaCor', 'arte'
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

    // Produtos
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
                const inputProduto = ultimaLinha.querySelector('.produto') || ultimaLinha.querySelector('.descricao');
                const inputDetalhesProduto = ultimaLinha.querySelector('.detalhes-produto');
                const produtoPrincipal = produto.produto || produto.descricao || '';
                const detalhesProduto = produto.detalhesProduto || produto.detalhes || '';

                if (selectTamanho) selectTamanho.value = produto.tamanho || '';
                if (inputQuantidade) inputQuantidade.value = produto.quantidade || '';
                if (inputProduto) {
                  inputProduto.value = produtoPrincipal;
                  inputProduto.dispatchEvent(new Event('input', { bubbles: true }));
                  inputProduto.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (inputDetalhesProduto) {
                  inputDetalhesProduto.value = detalhesProduto;
                  inputDetalhesProduto.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }
          });

          if (typeof window.atualizarTotalItens === 'function') {
            window.atualizarTotalItens();
          }
        }
      }
    }

    // Imagens
    if (typeof window.setImagens === 'function') {
      let imagensCarregadas = [];

      const imagensDataRaw = ficha.imagensData || ficha.imagens_data;
      imagensCarregadas = parsearImagensData(imagensDataRaw);

      if (imagensCarregadas.length === 0) {
        const imagemData = ficha.imagemData || ficha.imagem_data;

        if (imagemData && typeof imagemData === 'string' && imagemData.length > 0) {
          if (imagemData.startsWith('data:image') || imagemData.startsWith('http')) {
            imagensCarregadas = [{ src: imagemData, descricao: '' }];
          }
        }
      }

      window.setImagens(imagensCarregadas);
    }

    // Preencher observacoes cedo para evitar corrida com o preview/impressao.
    const observacoesInput = document.getElementById('observacoes');
    if (observacoesInput) {
      observacoesInput.value = observacoesSalvas;
    }

    if (window.richTextEditor) {
      window.richTextEditor.setContent(observacoesSalvas);
    }

    if (observacoesSalvas) {
      setTimeout(() => {
        const observacoesAtualInput = (document.getElementById('observacoes')?.value || '').trim();
        const observacoesAtualEditor = (window.richTextEditor && typeof window.richTextEditor.getContent === 'function')
          ? String(window.richTextEditor.getContent() || '').trim()
          : '';

        if (!observacoesAtualInput && !observacoesAtualEditor) {
          const input = document.getElementById('observacoes');
          if (input) input.value = observacoesSalvas;
          if (window.richTextEditor) window.richTextEditor.setContent(observacoesSalvas);
        }
      }, 380);
    }

    const selectComNomes = document.getElementById('comNomes');
    if (selectComNomes) {
      const valorSalvo = normalizarComNomesValor(ficha.comNomes ?? ficha.com_nomes);
      const valorPorTexto = detectarComNomesPorTexto(observacoesSalvas);
      selectComNomes.value = valorSalvo !== COM_NOMES_VALOR_NENHUM ? valorSalvo : valorPorTexto;
    }

    const viesSelect = document.getElementById('vies');
    if (viesSelect) {
      viesSelect.value = acabamentoMangaFicha.toLowerCase().includes('vies') ? 'sim' : '';
    }

    // Mostrar campos condicionais
    setTimeout(() => {
      if (typeof window.atualizarControlesMangaPorProduto === 'function') {
        window.atualizarControlesMangaPorProduto();
      }

      const acabamentoMangaVal = acabamentoMangaFicha.toLowerCase();
      const temAcabamentoMangaExtra = acabamentoMangaVal.startsWith('punho') || acabamentoMangaVal.includes('vies');
      if (temAcabamentoMangaExtra) {
        const larguraMangaContainer = document.getElementById('larguraMangaContainer');
        const corAcabamentoMangaContainer = document.getElementById('corAcabamentoMangaContainer');
        if (larguraMangaContainer) larguraMangaContainer.style.display = 'block';
        if (corAcabamentoMangaContainer) corAcabamentoMangaContainer.style.display = 'block';
      }

      const golaVal = ficha.gola;
      const isPolo = golaVal === 'polo' || golaVal === 'v_polo';
      const isSocial = golaVal === 'social';
      const temGola = golaVal && golaVal !== '';

      if (temGola && !isSocial) {
        const corGolaContainer = document.getElementById('corGolaContainer');
        if (corGolaContainer) corGolaContainer.style.display = 'block';
      }

      if (temGola && !isPolo && !isSocial) {
        const acabamentoGolaContainer = document.getElementById('acabamentoGolaContainer');
        if (acabamentoGolaContainer) acabamentoGolaContainer.style.display = 'block';

        if (ficha.acabamentoGola) {
          const larguraGolaContainer = document.getElementById('larguraGolaContainer');
          if (larguraGolaContainer) larguraGolaContainer.style.display = 'block';
        }
      }

      if (temGola && !isSocial) {
        const reforcoGolaContainer = document.getElementById('reforcoGolaContainer');
        if (reforcoGolaContainer) reforcoGolaContainer.style.display = 'block';

        if (ficha.reforcoGola === 'sim') {
          const corReforcoContainer = document.getElementById('corReforcoContainer');
          if (corReforcoContainer) corReforcoContainer.style.display = 'block';
        }
      }

      if (isPolo) {
        const corPeitilhoInternoContainer = document.getElementById('corPeitilhoInternoContainer');
        const corPeitilhoExternoContainer = document.getElementById('corPeitilhoExternoContainer');
        const corBotaoContainer = document.getElementById('corBotaoContainer');
        const aberturaLateralContainer = document.getElementById('aberturaLateralContainer');

        if (corPeitilhoInternoContainer) corPeitilhoInternoContainer.style.display = 'block';
        if (corPeitilhoExternoContainer) corPeitilhoExternoContainer.style.display = 'block';
        if (corBotaoContainer) corBotaoContainer.style.display = 'block';
        if (aberturaLateralContainer) aberturaLateralContainer.style.display = 'block';

        if (ficha.aberturaLateral === 'sim') {
          const corAberturaLateralContainer = document.getElementById('corAberturaLateralContainer');
          if (corAberturaLateralContainer) corAberturaLateralContainer.style.display = 'block';
        }
      }

      if (isSocial) {
        const corPeDeGolaInternoContainer = document.getElementById('corPeDeGolaInternoContainer');
        const corPeDeGolaExternoContainer = document.getElementById('corPeDeGolaExternoContainer');
        const corBotaoContainer = document.getElementById('corBotaoContainer');
        if (corPeDeGolaInternoContainer) corPeDeGolaInternoContainer.style.display = 'block';
        if (corPeDeGolaExternoContainer) corPeDeGolaExternoContainer.style.display = 'block';
        if (corBotaoContainer) corBotaoContainer.style.display = 'block';
      }

      if (ficha.filete === 'sim') {
        const fileteLocalContainer = document.getElementById('fileteLocalContainer');
        const fileteCorContainer = document.getElementById('fileteCorContainer');
        if (fileteLocalContainer) fileteLocalContainer.style.display = 'block';
        if (fileteCorContainer) fileteCorContainer.style.display = 'block';
      }

      if (ficha.faixa === 'sim') {
        const faixaLocalContainer = document.getElementById('faixaLocalContainer');
        const faixaCorContainer = document.getElementById('faixaCorContainer');
        if (faixaLocalContainer) faixaLocalContainer.style.display = 'block';
        if (faixaCorContainer) faixaCorContainer.style.display = 'block';
      }

      window.__preenchendoFicha = false;
    }, 150);
  }

  window.dbIntegration = {
    salvarNoBanco,
    coletarDadosFormulario,
    converterBancoParaForm,
    getFichaAtualId: () => fichaAtualId,
    isModoVisualizacao: () => modoVisualizacao
  };

})();




