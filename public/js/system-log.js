(function () {
  'use strict';

  const KEYWORD = 'log';
  const KEYWORD_TIMEOUT_MS = 1200;
  const API_URL = '/api/system-log';
  const MAX_ITEMS = 250;
  let typedBuffer = '';
  let lastTypedAt = 0;
  let modalElements = null;
  let loading = false;

  function ensureStyle() {
    if (document.getElementById('system-log-style')) return;

    const style = document.createElement('style');
    style.id = 'system-log-style';
    style.textContent = `
      .system-log-modal{
        position:fixed;inset:0;z-index:9999;display:none;
        --sl-bg:var(--color-bg);
        --sl-surface:var(--color-surface-soft);
        --sl-card:var(--color-surface);
        --sl-border:var(--color-border);
        --sl-text:var(--color-text);
        --sl-muted:var(--color-muted);
        --sl-btn-bg:var(--sl-card);
        --sl-btn-hover:var(--sl-surface);
      }
      .system-log-modal.open{display:block}
      .system-log-backdrop{position:absolute;inset:0;background:color-mix(in srgb, var(--color-neutral-900) 60%, transparent)}
      .system-log-card{position:relative;max-width:920px;margin:4vh auto;background:var(--sl-card);border:1px solid var(--sl-border);border-radius:14px;box-shadow:var(--shadow-xl);height:92vh;display:flex;flex-direction:column}
      .system-log-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--sl-border);background:var(--sl-surface)}
      .system-log-title{font-weight:700;color:var(--sl-text);font-size:14px}
      .system-log-actions{display:flex;gap:8px}
      .system-log-btn{border:1px solid var(--sl-border);background:var(--sl-btn-bg);color:var(--sl-text);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}
      .system-log-btn:hover{background:var(--sl-btn-hover)}
      .system-log-body{padding:8px 10px;overflow:auto;flex:1;background:var(--sl-bg)}
      .system-log-list{display:flex;flex-direction:column;gap:6px}
      .system-log-item{background:var(--sl-card);border:1px solid var(--sl-border);border-radius:10px;padding:7px 9px}
      .system-log-main{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
      .system-log-action{font-weight:600;color:var(--sl-text);font-size:13px;line-height:1.25}
      .system-log-time{font-size:11px;color:var(--sl-muted);white-space:nowrap}
      .system-log-meta{margin-top:3px;font-size:11px;color:var(--sl-muted);display:flex;gap:8px;flex-wrap:wrap}
      .system-log-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--sl-border);background:var(--sl-surface);border-radius:999px;padding:2px 7px;line-height:1.2}
      .system-log-empty{padding:16px;background:var(--sl-card);border:1px dashed var(--sl-border);border-radius:10px;text-align:center;color:var(--sl-muted)}
      .system-log-loading{padding:16px;text-align:center;color:var(--sl-muted)}
      .system-log-details{margin-top:4px;font-size:11px;color:var(--sl-muted);white-space:normal;line-height:1.35}
      @media (max-width: 768px){.system-log-card{height:96vh;margin:2vh 8px}}
    `;

    document.head.appendChild(style);
  }

  function createModal() {
    if (modalElements) return modalElements;
    ensureStyle();

    const wrapper = document.createElement('div');
    wrapper.className = 'system-log-modal';
    wrapper.innerHTML = `
      <div class="system-log-backdrop"></div>
      <section class="system-log-card" role="dialog" aria-modal="true" aria-label="Log do sistema">
        <header class="system-log-header">
          <div class="system-log-title">Log do Sistema</div>
          <div class="system-log-actions">
            <button type="button" class="system-log-btn" data-action="refresh">Atualizar</button>
            <button type="button" class="system-log-btn" data-action="close">Fechar</button>
          </div>
        </header>
        <div class="system-log-body">
          <div class="system-log-loading">Carregando...</div>
          <div class="system-log-list" style="display:none"></div>
        </div>
      </section>
    `;

    document.body.appendChild(wrapper);

    const list = wrapper.querySelector('.system-log-list');
    const loadingEl = wrapper.querySelector('.system-log-loading');

    wrapper.querySelector('[data-action="close"]')?.addEventListener('click', closeModal);
    wrapper.querySelector('.system-log-backdrop')?.addEventListener('click', closeModal);
    wrapper.querySelector('[data-action="refresh"]')?.addEventListener('click', () => loadLogs());

    modalElements = { wrapper, list, loadingEl };
    return modalElements;
  }

  function formatDateTime(value) {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleString('pt-BR');
  }

  function stringifyDetails(details) {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details !== 'object') return '';

    const chunks = [];
    if (details.de || details.para) {
      chunks.push(`de: ${details.de || '-'} -> para: ${details.para || '-'}`);
    }
    if (details.quantidade !== undefined) {
      chunks.push(`qtd: ${details.quantidade}`);
    }
    if (details.estado) {
      chunks.push(`estado: ${details.estado}`);
    }
    if (details.origem) {
      chunks.push(`origem: ${details.origem}`);
    }

    if (chunks.length > 0) return chunks.join(' | ');

    try {
      return JSON.stringify(details);
    } catch (_) {
      return '';
    }
  }

  function escapeHtml(value) {
    if (window.appUtils && typeof window.appUtils.escapeHtml === 'function') {
      return window.appUtils.escapeHtml(value);
    }
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderLogs(items) {
    const modal = createModal();
    if (!modal?.list || !modal.loadingEl) return;

    modal.loadingEl.style.display = 'none';
    modal.list.style.display = 'flex';

    const rows = Array.isArray(items) ? items : [];
    if (rows.length === 0) {
      modal.list.innerHTML = '<div class="system-log-empty">Nenhum evento registrado.</div>';
      return;
    }

    modal.list.innerHTML = rows.map(item => {
      const action = escapeHtml(item.action || item.eventType || 'Evento');
      const when = escapeHtml(formatDateTime(item.createdAt));
      const fichaId = Number(item.fichaId);
      const cliente = String(item.cliente || '').trim();
      const details = stringifyDetails(item.details);
      const detailsHtml = details ? `<div class="system-log-details">${escapeHtml(details)}</div>` : '';
      const chips = [];
      if (cliente) chips.push(`<span class="system-log-chip">Cliente: ${escapeHtml(cliente)}</span>`);
      if (Number.isInteger(fichaId) && fichaId > 0) chips.push(`<span class="system-log-chip">Ficha #${fichaId}</span>`);
      if (item.eventType) chips.push(`<span class="system-log-chip">${escapeHtml(String(item.eventType))}</span>`);
      if (chips.length === 0) chips.push('<span class="system-log-chip">Sistema</span>');
      return `
        <article class="system-log-item">
          <div class="system-log-main">
            <div class="system-log-action">${action}</div>
            <div class="system-log-time">${when}</div>
          </div>
          <div class="system-log-meta">${chips.join('')}</div>
          ${detailsHtml}
        </article>
      `;
    }).join('');
  }

  async function loadLogs() {
    if (loading) return;
    loading = true;

    const modal = createModal();
    if (modal?.loadingEl) modal.loadingEl.style.display = 'block';
    if (modal?.list) modal.list.style.display = 'none';

    try {
      const response = await fetch(`${API_URL}?limit=${MAX_ITEMS}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      renderLogs(data);
    } catch (error) {
      renderLogs([]);
      if (modal?.list) {
        modal.list.innerHTML = `<div class="system-log-empty">Falha ao carregar log (${escapeHtml(error.message)}).</div>`;
      }
    } finally {
      loading = false;
    }
  }

  function openModal() {
    const modal = createModal();
    if (!modal?.wrapper) return;
    modal.wrapper.classList.add('open');
    loadLogs();
  }

  function closeModal() {
    const modal = createModal();
    if (!modal?.wrapper) return;
    modal.wrapper.classList.remove('open');
  }

  function trackKeySequence(event) {
    if (!event || event.ctrlKey || event.altKey || event.metaKey) return;
    if (typeof event.key !== 'string' || event.key.length !== 1) return;

    const now = Date.now();
    if ((now - lastTypedAt) > KEYWORD_TIMEOUT_MS) {
      typedBuffer = '';
    }
    lastTypedAt = now;

    typedBuffer = `${typedBuffer}${event.key.toLowerCase()}`.slice(-KEYWORD.length);
    if (typedBuffer === KEYWORD) {
      typedBuffer = '';
      openModal();
    }
  }

  async function track(eventType, action, fichaId = null, details = null) {
    if (!eventType || !action) return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, action, fichaId, details })
      });
    } catch (_) {
      // Ignora falhas de telemetria
    }
  }

  function init() {
    document.addEventListener('keydown', trackKeySequence);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  window.SystemLog = {
    open: openModal,
    track
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
