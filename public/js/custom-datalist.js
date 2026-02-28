(function () {
  'use strict';

  const INPUT_SELECTOR = 'input[list], input[data-custom-datalist-source]';
  const stateByInput = new WeakMap();
  let sequence = 0;

  function normalizarTexto(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function obterOpcoes(input) {
    const sourceId = input.dataset.customDatalistSource;
    if (!sourceId) return [];

    const datalist = document.getElementById(sourceId);
    if (!datalist) return [];

    const vistos = new Set();
    return Array.from(datalist.querySelectorAll('option'))
      .map(option => String(option.value || '').trim())
      .filter(Boolean)
      .filter(valor => {
        const chave = normalizarTexto(valor);
        if (!chave || vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }

  function criarWrapper(input) {
    let wrapper = input.closest('.custom-datalist');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'custom-datalist';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }
    return wrapper;
  }

  function criarMenu(wrapper) {
    let menu = wrapper.querySelector('.custom-datalist__menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'custom-datalist__menu';
      menu.hidden = true;
      wrapper.appendChild(menu);
    }
    return menu;
  }

  function fecharMenu(state) {
    state.menu.hidden = true;
    state.menu.innerHTML = '';
    state.filtered = [];
    state.activeIndex = -1;
    state.input.setAttribute('aria-expanded', 'false');
    state.input.removeAttribute('aria-activedescendant');
  }

  function selecionarOpcao(state, valor) {
    state.input.value = valor;
    state.input.dispatchEvent(new Event('input', { bubbles: true }));
    state.input.dispatchEvent(new Event('change', { bubbles: true }));
    fecharMenu(state);
  }

  function renderizarMenu(state) {
    const termo = normalizarTexto(state.input.value);
    const opcoes = obterOpcoes(state.input);

    const filtradas = !termo
      ? opcoes.slice(0, 40)
      : opcoes.filter(opcao => normalizarTexto(opcao).includes(termo)).slice(0, 40);

    state.filtered = filtradas;
    state.activeIndex = filtradas.length ? 0 : -1;

    if (filtradas.length === 0) {
      state.menu.innerHTML = '<div class="custom-datalist__empty">Nenhuma sugestao</div>';
      state.menu.hidden = false;
      state.input.setAttribute('aria-expanded', 'true');
      state.input.removeAttribute('aria-activedescendant');
      return;
    }

    state.menu.innerHTML = filtradas
      .map((opcao, index) => {
        const optionId = `${state.input.id || 'custom-datalist'}-option-${sequence}-${index}`;
        const activeClass = index === state.activeIndex ? ' is-active' : '';
        return `<button type="button" class="custom-datalist__option${activeClass}" data-value="${escapeHtml(opcao)}" id="${optionId}" role="option" aria-selected="${index === state.activeIndex ? 'true' : 'false'}">${escapeHtml(opcao)}</button>`;
      })
      .join('');

    state.menu.hidden = false;
    state.input.setAttribute('aria-expanded', 'true');
    atualizarOpcaoAtiva(state);
  }

  function atualizarOpcaoAtiva(state) {
    const options = state.menu.querySelectorAll('.custom-datalist__option');
    options.forEach((option, index) => {
      const ativo = index === state.activeIndex;
      option.classList.toggle('is-active', ativo);
      option.setAttribute('aria-selected', ativo ? 'true' : 'false');
      if (ativo) {
        state.input.setAttribute('aria-activedescendant', option.id);
      }
    });
  }

  function moverSelecao(state, direction) {
    if (!state.filtered.length) return;
    if (state.menu.hidden) {
      renderizarMenu(state);
      return;
    }
    const max = state.filtered.length - 1;
    state.activeIndex = direction > 0
      ? (state.activeIndex >= max ? 0 : state.activeIndex + 1)
      : (state.activeIndex <= 0 ? max : state.activeIndex - 1);
    atualizarOpcaoAtiva(state);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindEvents(state) {
    const { input, menu, wrapper } = state;

    input.addEventListener('focus', () => {
      renderizarMenu(state);
    });

    input.addEventListener('input', () => {
      renderizarMenu(state);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moverSelecao(state, 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moverSelecao(state, -1);
        return;
      }
      if (event.key === 'Enter' && !menu.hidden && state.activeIndex >= 0) {
        event.preventDefault();
        selecionarOpcao(state, state.filtered[state.activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        fecharMenu(state);
      }
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => fecharMenu(state), 120);
    });

    wrapper.addEventListener('mousedown', event => {
      const option = event.target.closest('.custom-datalist__option');
      if (!option) return;
      event.preventDefault();
      selecionarOpcao(state, option.dataset.value || option.textContent || '');
    });
  }

  function enhanceInput(input) {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type === 'hidden') return;

    const sourceId = input.dataset.customDatalistSource || input.getAttribute('list');
    if (!sourceId) return;

    input.dataset.customDatalistSource = sourceId;
    if (input.hasAttribute('list')) {
      input.removeAttribute('list');
    }

    if (stateByInput.has(input)) {
      return;
    }

    sequence += 1;
    const wrapper = criarWrapper(input);
    const menu = criarMenu(wrapper);
    const menuId = `custom-datalist-menu-${sequence}`;
    menu.id = menuId;

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', menuId);

    const state = {
      input,
      wrapper,
      menu,
      filtered: [],
      activeIndex: -1
    };

    stateByInput.set(input, state);
    bindEvents(state);
  }

  function init(scope) {
    const root = scope || document;
    root.querySelectorAll(INPUT_SELECTOR).forEach(enhanceInput);
  }

  function observe() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLInputElement) {
          if (mutation.attributeName === 'list') {
            enhanceInput(mutation.target);
          }
          return;
        }

        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.(INPUT_SELECTOR)) {
            enhanceInput(node);
          }
          node.querySelectorAll?.(INPUT_SELECTOR).forEach(enhanceInput);
        });
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['list']
    });
  }

  window.CustomDatalist = {
    init,
    refresh: init
  };

  document.addEventListener('DOMContentLoaded', () => {
    init(document);
    observe();
  });
})();
