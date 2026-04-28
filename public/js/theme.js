/**
 * Tema global (light/dark) + barra de saudacao no header.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'site_theme_preference';
  const GREETING_MESSAGE_ROTATION_INTERVAL_MS = 15 * 1000;
  const DEFAULT_GREETING_STATUS_MESSAGES = [
    'Foco no que importa.'
  ];
  const DEFAULT_GREETING_STATUS_MESSAGES_BY_PERIOD = Object.freeze({
    morning: [
      'Foco no que importa.',
      'Bora tomar um café e tentar acordar!',
      'Que hoje nosso dia seja abeçoado.'
    ],
    afternoon: [
      'Foco no que importa.',
      'Pelo menos já tá de tarde.',
      'Segue firme que ja andou bastante.'
    ],
    night: [
      'Foco no que importa.',
      'Tá trabalhando ainda? Vá descansar!',
      'Boa noite, espero que essa horas extras valham a pena!'
    ]
  });

  function normalizeTheme(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function getSavedTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return 'light';
    }
  }

  function getGreeting(now) {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia!';
    if (hour >= 12 && hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  }

  function formatGreetingDate(now) {
    const formatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `Hoje \u00E9 ${formatted}.`;
  }

  function normalizeString(value, fallback = '') {
    const text = String(value == null ? '' : value).trim();
    return text || fallback;
  }

  function buildDefaultSnapshot() {
    return {
      fetchedAt: Date.now(),
      lastFichaCreatedAt: Date.now(),
      weather: {},
      systems: {}
    };
  }

  function getGreetingPeriod(now) {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
  }

  function getConfiguredGreetingMessages(period) {
    const selectedPeriod = period || getGreetingPeriod(new Date());
    const externalGlobalMessages = Array.isArray(window.SITE_GREETING_STATUS_MESSAGES)
      ? window.SITE_GREETING_STATUS_MESSAGES
      : [];

    const externalByPeriodRaw = window.SITE_GREETING_STATUS_MESSAGES_BY_PERIOD;
    const externalByPeriod = externalByPeriodRaw && typeof externalByPeriodRaw === 'object'
      ? externalByPeriodRaw
      : {};
    const externalPeriodMessages = Array.isArray(externalByPeriod[selectedPeriod])
      ? externalByPeriod[selectedPeriod]
      : [];

    const baseGlobal = externalGlobalMessages.length > 0
      ? externalGlobalMessages
      : DEFAULT_GREETING_STATUS_MESSAGES;
    const basePeriod = Array.isArray(DEFAULT_GREETING_STATUS_MESSAGES_BY_PERIOD[selectedPeriod])
      ? DEFAULT_GREETING_STATUS_MESSAGES_BY_PERIOD[selectedPeriod]
      : [];

    const merged = [
      ...baseGlobal,
      ...basePeriod,
      ...externalPeriodMessages
    ];

    const normalizedUnique = Array.from(new Set(
      merged
        .map(item => normalizeString(item, ''))
        .filter(Boolean)
    ));

    return normalizedUnique.length > 0
      ? normalizedUnique
      : ['Foco no que importa.'];
  }

  let greetingStatusMessages = getConfiguredGreetingMessages(getGreetingPeriod(new Date()));
  let currentGreetingStatusTemplate = '';

  function pickRandomGreetingStatusTemplate(now, avoidCurrent) {
    const period = getGreetingPeriod(now || new Date());
    greetingStatusMessages = getConfiguredGreetingMessages(period);

    if (!Array.isArray(greetingStatusMessages) || greetingStatusMessages.length === 0) {
      greetingStatusMessages = ['Foco no que importa.'];
    }

    if (greetingStatusMessages.length === 1) {
      currentGreetingStatusTemplate = greetingStatusMessages[0];
      return currentGreetingStatusTemplate;
    }

    const candidates = avoidCurrent
      ? greetingStatusMessages.filter(item => item !== currentGreetingStatusTemplate)
      : greetingStatusMessages;

    const pool = candidates.length > 0 ? candidates : greetingStatusMessages;
    const index = Math.floor(Math.random() * pool.length);
    currentGreetingStatusTemplate = pool[index];
    return currentGreetingStatusTemplate;
  }

  function getCurrentGreetingStatusTemplate(now) {
    const currentPeriod = getGreetingPeriod(now || new Date());
    const periodMessages = getConfiguredGreetingMessages(currentPeriod);

    greetingStatusMessages = periodMessages;

    if (!currentGreetingStatusTemplate || !periodMessages.includes(currentGreetingStatusTemplate)) {
      return pickRandomGreetingStatusTemplate(now || new Date(), false);
    }

    return currentGreetingStatusTemplate;
  }

  function formatGreetingLine(snapshot) {
    const now = new Date();
    const statusMessage = formatGreetingStatusMessage(
      getCurrentGreetingStatusTemplate(now),
      {}
    );

    return `${getGreeting(now)} ${formatGreetingDate(now)} | ${statusMessage}`;
  }

  function formatGreetingStatusMessage(template, context) {
    return normalizeString(template, 'Foco no que importa.');
  }

  function rotateGreetingStatusMessage() {
    pickRandomGreetingStatusTemplate(new Date(), true);
  }

  function renderGreeting(toolbar, snapshot) {
    const line = toolbar.querySelector('.site-theme-greeting-line');
    if (!line) return;

    const text = formatGreetingLine(snapshot);
    line.textContent = text;
  }

  function setSwitchLabel(input, theme) {
    const wrapper = input.closest('.site-theme-switch');
    if (!wrapper) return;

    const label = wrapper.querySelector('.site-theme-switch-label');
    if (!label) return;

    label.textContent = theme === 'dark' ? 'Dark' : 'Light';
  }

  function applyTheme(theme, persist) {
    const normalized = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', normalized);

    if (document.body) {
      document.body.classList.toggle('theme-dark', normalized === 'dark');
      document.body.classList.toggle('theme-light', normalized === 'light');
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, normalized);
      } catch (_) {
        // ignore
      }
    }

    document.querySelectorAll('.site-theme-switch input[type="checkbox"]').forEach(input => {
      input.checked = normalized === 'dark';
      setSwitchLabel(input, normalized);
    });
  }

  function hydrateToolbarData(toolbar) {
    const snapshot = buildDefaultSnapshot();

    renderGreeting(toolbar, snapshot);
    window.setInterval(() => {
      rotateGreetingStatusMessage();
      renderGreeting(toolbar, snapshot);
    }, GREETING_MESSAGE_ROTATION_INTERVAL_MS);
  }

  function createThemeToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'site-theme-toolbar';
    toolbar.innerHTML = `
      <div class="site-theme-greeting">
        <span class="site-theme-greeting-line" aria-live="polite">Carregando...</span>
      </div>
      <div class="site-theme-toolbar-actions">
        <label class="site-theme-switch" title="Alternar tema">
          <span class="site-theme-switch-label">Light</span>
          <input type="checkbox" role="switch" aria-label="Ativar modo dark">
          <span class="site-theme-switch-track" aria-hidden="true">
            <span class="site-theme-switch-thumb"></span>
          </span>
        </label>
      </div>
    `;

    const input = toolbar.querySelector('input[type="checkbox"]');
    if (input) {
      input.addEventListener('change', () => {
        applyTheme(input.checked ? 'dark' : 'light', true);
      });
    }

    hydrateToolbarData(toolbar);

    return toolbar;
  }

  function injectToolbarIntoHeaders() {
    document.querySelectorAll('header > .header-content').forEach(headerContent => {
      const header = headerContent.parentElement;
      if (!header) return;
      if (header.querySelector(':scope > .site-theme-toolbar')) return;
      header.insertBefore(createThemeToolbar(), headerContent);
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // sem bloqueio de UI se o registro falhar
      });
    });
  }

  const initialTheme = normalizeTheme(
    document.documentElement.getAttribute('data-theme') || getSavedTheme()
  );
  applyTheme(initialTheme, false);

  document.addEventListener('DOMContentLoaded', () => {
    injectToolbarIntoHeaders();
    applyTheme(getSavedTheme(), false);
    registerServiceWorker();
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    applyTheme(getSavedTheme(), false);
  });
})();

