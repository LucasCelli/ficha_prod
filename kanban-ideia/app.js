// ===== Quadro de Produção — app vanilla JS =====
// Sem React, sem dnd-kit. DnD = HTML5 nativo + transforms.
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'style') n.setAttribute('style', props[k]);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k in n) n[k] = props[k];
      else n.setAttribute(k, props[k]);
    }
    for (const c of kids) {
      if (c == null || c === false) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  };

  // --- Icons (inline SVG) ---
  const I = {
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    cal:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    refresh:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.16-6.84"/><path d="M21 3v6h-6"/></svg>',
    plus:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    card:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
    sun:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
    grip:   '<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="8" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="8" cy="12" r="1.2"/></svg>',
    star:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.94 6.84L22 9.27l-5.5 4.78L18.18 22 12 18.27 5.82 22l1.68-7.95L2 9.27l7.06-.43L12 2Z"/></svg>',
    caret:  '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
    arrL:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    arrR:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4"/></svg>',
    edit:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>',
    fabric: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4M12 11v10"/></svg>',
    qty:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h12"/></svg>',
  };

  // --- State ---
  const state = {
    data: window.BOARD_DATA,
    version: localStorage.getItem('kanban-version') || 'fiel',
    theme: localStorage.getItem('kanban-theme') || 'dark',
    density: localStorage.getItem('kanban-density') || 'normal',
    filter: 'Todos',
    search: '',
  };

  // --- App bootstrap ---
  function applyChrome() {
    document.documentElement.dataset.theme = state.theme;
    document.body.dataset.version = state.version;
    document.body.dataset.density = state.density;
  }

  function render() {
    applyChrome();
    const app = $('#app');
    app.innerHTML = '';
    app.appendChild(renderToolbar());
    app.appendChild(renderBoard());
  }

  // --- Toolbar ---
  function renderToolbar() {
    const totalOpen = state.data.columns.reduce((a, c) => a + c.cards.length, 0);

    const versionSeg = el('div', { class: 'seg', role: 'tablist' },
      ...['fiel', 'alt'].map(v =>
        el('button', {
          class: state.version === v ? 'active' : '',
          onclick: () => { state.version = v; localStorage.setItem('kanban-version', v); render(); },
        }, v === 'fiel' ? 'Fiel' : 'Alternativa')
      )
    );

    const densSeg = el('div', { class: 'seg' },
      ...[['compact', 'Compacto'], ['normal', 'Normal'], ['expanded', 'Expandido']].map(([k, label]) =>
        el('button', {
          class: state.density === k ? 'active' : '',
          onclick: () => { state.density = k; localStorage.setItem('kanban-density', k); applyChrome(); },
        }, label)
      )
    );

    const themeBtn = el('button', {
      class: 'btn ghost', title: 'Alternar tema',
      onclick: () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('kanban-theme', state.theme); applyChrome(); themeBtn.innerHTML = state.theme === 'dark' ? I.sun : I.moon; },
    });
    themeBtn.innerHTML = state.theme === 'dark' ? I.sun : I.moon;

    const searchInput = el('div', { class: 'search-input' });
    searchInput.innerHTML = I.search;
    const input = el('input', {
      type: 'text', placeholder: 'Cliente, venda, tecido, arte…',
      value: state.search,
      oninput: (e) => { state.search = e.target.value; filterCards(); },
    });
    searchInput.appendChild(input);

    const filtersRow = el('div', { class: 'filters' },
      ...state.data.filters.map(f =>
        el('button', {
          class: 'chip' + (state.filter === f ? ' active' : ''),
          onclick: () => { state.filter = f; render(); },
        }, f)
      )
    );

    const t = el('div', { class: 'toolbar' },
      el('div', { class: 'toolbar-row' },
        el('div', { class: 'toolbar-title' },
          el('h1', {}, 'Quadro de Produção'),
          el('span', { class: 'pill-count' }, `${totalOpen} em aberto`)
        ),
        el('div', { class: 'search-block' },
          el('label', { class: 'label' }, 'BUSCA'),
          searchInput
        ),
        el('div', { class: 'toolbar-actions' },
          mkBtn('btn', I.cal, 'Para essa semana'),
          mkBtn('btn ghost', null, 'Limpar filtros'),
          mkBtn('btn', I.refresh, 'Atualizar'),
          mkBtn('btn', I.card, 'Novo cartão'),
          mkBtn('btn primary', I.plus, 'Coluna'),
        )
      ),
      el('div', { class: 'toolbar-row', style: 'gap: 12px;' },
        filtersRow,
        el('div', { style: 'flex: 1;' }),
        el('div', { class: 'toolbar-actions', style: 'gap: 10px;' },
          labeled('Versão', versionSeg),
          labeled('Densidade', densSeg),
          themeBtn
        )
      )
    );
    return t;
  }
  function labeled(label, control) {
    return el('div', { style: 'display:flex; align-items:center; gap:8px;' },
      el('span', { style: 'font-size:10.5px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color: var(--color-muted);' }, label),
      control
    );
  }
  function mkBtn(cls, icon, label) {
    const b = el('button', { class: cls });
    if (icon) { const sp = el('span'); sp.innerHTML = icon; b.appendChild(sp); }
    b.appendChild(document.createTextNode(label));
    return b;
  }

  // --- Board ---
  function renderBoard() {
    const board = el('div', { class: 'board' });
    state.data.columns.forEach(col => board.appendChild(renderColumn(col)));
    return board;
  }

  function renderColumn(col) {
    const cards = el('div', { class: 'col-cards', 'data-col': col.id });
    col.cards.forEach(c => cards.appendChild(renderCard(c, col)));

    // DnD on column
    cards.addEventListener('dragover', onDragOverColumn);
    cards.addEventListener('dragleave', onDragLeaveColumn);
    cards.addEventListener('drop', onDropColumn);

    const colorVar = col.color;
    const column = el('div', {
      class: 'column',
      'data-col-id': col.id,
      style: `--col-color: ${colorVar};`,
    },
      el('div', { class: 'col-header' },
        el('div', { class: 'col-header-title' },
          (() => { const g = el('span', { class: 'col-grip' }); g.innerHTML = I.grip; return g; })(),
          el('span', {}, col.title)
        ),
        el('span', { class: 'col-count' }, String(col.cards.length))
      ),
      el('div', { class: 'col-toolbar' },
        icoBtn(I.arrL, 'Mover para esquerda'),
        icoBtn(I.arrR, 'Mover para direita'),
        icoBtn(I.archive, 'Arquivar'),
        icoBtn(I.edit, 'Editar'),
      ),
      cards
    );
    return column;
  }
  function icoBtn(icon, title) {
    const b = el('button', { title });
    b.innerHTML = icon;
    return b;
  }

  function renderCard(c, col) {
    const procColor = state.data.procColors[c.process] || '#1677ff';
    const card = el('div', {
      class: 'card',
      draggable: true,
      'data-card-id': String(c.id),
      'data-col-id': col.id,
      style: `--proc-color: ${procColor};`,
      onclick: () => openDrawer(c, col),
    });

    const title = el('div', { class: 'card-title' });
    const star = el('span', { class: 'star' });
    star.innerHTML = I.star;
    title.appendChild(star);
    title.appendChild(el('span', { class: 'name' }, c.client));

    const meta = el('div', { class: 'card-meta' },
      el('span', { class: 'tag' }, c.process),
      (() => {
        const s = el('span', { class: 'status' }, c.status);
        const cr = el('span', { class: 'caret' });
        cr.innerHTML = I.caret;
        s.appendChild(cr);
        return s;
      })()
    );

    const footer = el('div', { class: 'card-footer' });
    const cal = el('span', { class: 'cal' });
    cal.innerHTML = I.cal;
    footer.appendChild(cal);
    footer.appendChild(el('span', { class: 'dot ' + c.dot }));
    footer.appendChild(el('span', {}, 'Entrega ' + c.due));

    const extra = el('div', { class: 'extra' });
    const fabricSpan = el('span', {});
    fabricSpan.innerHTML = I.fabric;
    fabricSpan.appendChild(document.createTextNode(' ' + c.fabric));
    const qtySpan = el('span', {});
    qtySpan.innerHTML = I.qty;
    qtySpan.appendChild(document.createTextNode(' ' + c.qty + ' peças'));
    extra.appendChild(fabricSpan);
    extra.appendChild(qtySpan);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(extra);
    card.appendChild(footer);

    // DnD on card
    card.addEventListener('dragstart', onDragStartCard);
    card.addEventListener('dragend', onDragEndCard);

    return card;
  }

  // ===== Drag & drop (HTML5 nativo, super leve) =====
  let dragSrc = null;          // { id, fromCol, el }
  let placeholder = null;
  let lastOverCol = null;

  function onDragStartCard(e) {
    const card = e.currentTarget;
    dragSrc = {
      id: card.dataset.cardId,
      fromCol: card.dataset.colId,
      el: card,
    };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.cardId);
    // build placeholder
    placeholder = el('div', { class: 'card-ghost' });
    // hide source on next tick
    requestAnimationFrame(() => card.classList.add('dragging'));
  }

  function onDragEndCard(e) {
    if (dragSrc?.el) dragSrc.el.classList.remove('dragging');
    if (placeholder?.parentNode) placeholder.parentNode.removeChild(placeholder);
    $$('.col-cards.drag-over').forEach(n => n.classList.remove('drag-over'));
    dragSrc = null;
    placeholder = null;
    lastOverCol = null;
  }

  function onDragOverColumn(e) {
    if (!dragSrc) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cards = e.currentTarget;
    if (lastOverCol !== cards) {
      $$('.col-cards.drag-over').forEach(n => n.classList.remove('drag-over'));
      cards.classList.add('drag-over');
      lastOverCol = cards;
    }
    // Determine insertion index by Y of mouse
    const y = e.clientY;
    const items = Array.from(cards.querySelectorAll('.card:not(.dragging)'));
    let inserted = false;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        if (placeholder.nextSibling !== it) cards.insertBefore(placeholder, it);
        inserted = true;
        break;
      }
    }
    if (!inserted) cards.appendChild(placeholder);
  }

  function onDragLeaveColumn(e) {
    // Only clear if leaving the col entirely
    const cards = e.currentTarget;
    if (!cards.contains(e.relatedTarget)) {
      cards.classList.remove('drag-over');
    }
  }

  function onDropColumn(e) {
    if (!dragSrc) return;
    e.preventDefault();
    const cards = e.currentTarget;
    const toCol = cards.dataset.col;
    // Move data
    const fromColData = state.data.columns.find(c => c.id === dragSrc.fromCol);
    const toColData = state.data.columns.find(c => c.id === toCol);
    if (!fromColData || !toColData) { onDragEndCard(); return; }
    const idx = fromColData.cards.findIndex(c => String(c.id) === dragSrc.id);
    if (idx < 0) { onDragEndCard(); return; }
    const [moved] = fromColData.cards.splice(idx, 1);

    // Compute insertion index in toCol from placeholder position
    const ph = placeholder;
    let insertAt = toColData.cards.length;
    if (ph && ph.parentNode === cards) {
      const siblings = Array.from(cards.querySelectorAll('.card, .card-ghost'));
      insertAt = siblings.indexOf(ph);
      // Cards that were after placeholder shift up if same col already handled by splice above
    }
    toColData.cards.splice(insertAt, 0, moved);

    // Move DOM (no full re-render -> snappy)
    cards.insertBefore(dragSrc.el, ph);
    dragSrc.el.dataset.colId = toCol;
    ph.remove();
    cards.classList.remove('drag-over');

    // Update counts
    updateColumnCounts();
    onDragEndCard();
    updateTotalCount();
  }

  function updateColumnCounts() {
    state.data.columns.forEach(col => {
      const colEl = document.querySelector(`.column[data-col-id="${col.id}"]`);
      if (colEl) colEl.querySelector('.col-count').textContent = col.cards.length;
    });
  }
  function updateTotalCount() {
    const total = state.data.columns.reduce((a, c) => a + c.cards.length, 0);
    const pill = document.querySelector('.pill-count');
    if (pill) pill.textContent = `${total} em aberto`;
  }

  // --- Filter ---
  function filterCards() {
    const q = state.search.trim().toLowerCase();
    $$('.card').forEach(card => {
      const text = card.textContent.toLowerCase();
      const matchProc = state.filter === 'Todos' || text.includes(state.filter.toLowerCase());
      const matchQ = !q || text.includes(q);
      card.style.display = (matchProc && matchQ) ? '' : 'none';
    });
  }

  // --- Drawer ---
  function openDrawer(card, col) {
    const procColor = state.data.procColors[card.process] || '#1677ff';
    let scrim = $('#scrim');
    let drawer = $('#drawer');
    if (!scrim) {
      scrim = el('div', { class: 'scrim', id: 'scrim', onclick: closeDrawer });
      document.body.appendChild(scrim);
    }
    if (!drawer) {
      drawer = el('aside', { class: 'drawer', id: 'drawer' });
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = '';
    const head = el('div', { class: 'drawer-head' });
    const h = el('h2');
    const star = el('span', { class: 'star' });
    star.innerHTML = I.star;
    h.appendChild(star);
    h.appendChild(document.createTextNode(card.client));
    head.appendChild(h);
    head.appendChild(el('button', { class: 'drawer-close', onclick: closeDrawer }, '×'));

    const cols = state.data.columns;
    const curIdx = cols.findIndex(c => c.id === col.id);

    const body = el('div', { class: 'drawer-body' },
      el('div', { class: 'field-row' },
        field('Processo', el('span', { class: 'tag', style: `background: color-mix(in oklab, ${procColor} 18%, transparent); color: ${procColor};` }, card.process)),
        field('Status', el('span', { class: 'status' }, card.status))
      ),
      el('div', { class: 'field-row' },
        field('Tecido', card.fabric),
        field('Quantidade', card.qty + ' peças')
      ),
      el('div', { class: 'field-row' },
        field('Entrega', card.due),
        field('Coluna atual', col.title)
      ),
      el('div', { class: 'field' },
        el('span', { class: 'lbl' }, 'Pipeline'),
        el('div', { class: 'timeline' },
          ...cols.map((c, i) => {
            const cls = 'timeline-step' + (i < curIdx ? ' done' : i === curIdx ? ' active' : '');
            return el('div', { class: cls },
              el('span', { class: 'dot-big' }),
              el('span', { class: 'ts-label' }, c.title)
            );
          })
        )
      )
    );
    drawer.appendChild(head);
    drawer.appendChild(body);

    requestAnimationFrame(() => {
      scrim.classList.add('open');
      drawer.classList.add('open');
    });
  }
  function field(label, value) {
    return el('div', { class: 'field' },
      el('span', { class: 'lbl' }, label),
      typeof value === 'string' ? el('span', { class: 'val' }, value) : (() => { const w = el('div', { class: 'val' }); w.appendChild(value); return w; })()
    );
  }
  function closeDrawer() {
    $('#scrim')?.classList.remove('open');
    $('#drawer')?.classList.remove('open');
  }

  // --- Bootstrap ---
  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
})();
