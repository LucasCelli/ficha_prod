(function () {
  'use strict';

  const DEFAULT_DURATION = 3000;
  const ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const BACKGROUNDS = {
    success: 'var(--toast-bg-success)',
    error: 'var(--toast-bg-error)',
    warning: 'var(--toast-bg-warning)',
    info: 'var(--toast-bg-info)'
  };

  function injectStyles() {
    if (document.getElementById('toast-global-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-global-styles';
    style.textContent = `
      .toast-global {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100%);
        padding: 14px 28px;
        border-radius: var(--radius-xl);
        color: var(--toast-text-color);
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 99999;
        box-shadow: var(--shadow-xl);
        opacity: 0;
        pointer-events: none;
        max-width: 90vw;
        text-align: center;
      }

      .toast-global.show {
        animation: toastSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: auto;
      }

      .toast-global.hide {
        animation: toastSlideDown 0.3s cubic-bezier(0.5, 0, 0.75, 0) forwards;
      }

      .toast-global i {
        font-size: 18px;
        flex-shrink: 0;
      }

      .toast-global span {
        line-height: 1.4;
      }

      @keyframes toastSlideUp {
        from {
          transform: translateX(-50%) translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      @keyframes toastSlideDown {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        to {
          transform: translateX(-50%) translateY(100%);
          opacity: 0;
        }
      }

      @media (max-width: 480px) {
        .toast-global {
          left: 16px;
          right: 16px;
          transform: translateX(0) translateY(100%);
          max-width: none;
        }

        .toast-global.show {
          animation: toastSlideUpMobile 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .toast-global.hide {
          animation: toastSlideDownMobile 0.3s cubic-bezier(0.5, 0, 0.75, 0) forwards;
        }

        @keyframes toastSlideUpMobile {
          from {
            transform: translateX(0) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }

        @keyframes toastSlideDownMobile {
          from {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          to {
            transform: translateX(0) translateY(100%);
            opacity: 0;
          }
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeExistingToast(id) {
    if (id) {
      const sameId = document.querySelector(`.toast-global[data-toast-id="${id}"]`);
      if (sameId) sameId.remove();
      return;
    }

    const active = document.querySelector('.toast-global');
    if (active) active.remove();
  }

  function show(options = {}) {
    const message = String(options.message || '').trim();
    if (!message) return null;

    const type = String(options.type || 'info').toLowerCase();
    const duration = Number.isFinite(Number(options.duration)) ? Number(options.duration) : DEFAULT_DURATION;
    const sticky = options.sticky === true;
    const id = options.id ? String(options.id) : '';

    injectStyles();
    removeExistingToast(id);

    const toast = document.createElement('div');
    toast.className = 'toast-global';
    if (id) toast.dataset.toastId = id;
    toast.style.background = BACKGROUNDS[type] || BACKGROUNDS.info;

    const icon = document.createElement('i');
    icon.className = `fas ${ICONS[type] || ICONS.info}`;
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    if (!sticky) {
      setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 300);
      }, duration);
    }

    return toast;
  }

  function success(message, options = {}) {
    return show({ ...options, message, type: 'success' });
  }

  function error(message, options = {}) {
    return show({ ...options, message, type: 'error' });
  }

  function warning(message, options = {}) {
    return show({ ...options, message, type: 'warning' });
  }

  function info(message, options = {}) {
    return show({ ...options, message, type: 'info' });
  }

  const toastApi = Object.freeze({
    show,
    success,
    error,
    warning,
    info
  });

  window.toast = toastApi;
  window.mostrarToast = (message, type = 'info') => show({ message, type });
  window.mostrarSucesso = (message) => success(message);
  window.mostrarErro = (message) => error(message);
  window.mostrarAviso = (message) => warning(message);
  window.mostrarInfo = (message) => info(message);
})();
