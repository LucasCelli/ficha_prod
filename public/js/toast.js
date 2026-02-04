/**
 * Toast Global - Sistema de notificações unificado
 * Inclua este arquivo ANTES dos outros scripts
 */

(function() {
  'use strict';

  // Configurações
  const CONFIG = {
    duracao: 3000,        // Tempo em ms que o toast fica visível
    posicao: 'bottom',    // 'bottom' = centro inferior
    animacao: 'slide-up'  // 'slide-up' = sobe de baixo
  };

  // Ícones por tipo
  const ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  // Cores por tipo
  const CORES = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  };

  // Injetar estilos CSS uma única vez
  function injetarEstilos() {
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
        border-radius: 12px;
        color: white;
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 99999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        opacity: 0;
        pointer-events: none;
        transition: none;
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

      /* Responsivo - em telas pequenas ocupa mais espaço */
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

  // Função principal do toast
  function mostrarToast(mensagem, tipo = 'success') {
    // Garantir que os estilos existem
    injetarEstilos();

    // Remover toast existente
    const existente = document.querySelector('.toast-global');
    if (existente) {
      existente.remove();
    }

    // Criar novo toast
    const toast = document.createElement('div');
    toast.className = 'toast-global';
    toast.style.background = CORES[tipo] || CORES.info;
    toast.innerHTML = `
      <i class="fas ${ICONS[tipo] || ICONS.info}"></i>
      <span>${mensagem}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation (pequeno delay para o DOM processar)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    // Remover após duração
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');

      // Remover do DOM após animação
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, CONFIG.duracao);

    return toast;
  }

  // Atalhos para tipos específicos
  function mostrarSucesso(mensagem) {
    return mostrarToast(mensagem, 'success');
  }

  function mostrarErro(mensagem) {
    return mostrarToast(mensagem, 'error');
  }

  function mostrarAviso(mensagem) {
    return mostrarToast(mensagem, 'warning');
  }

  function mostrarInfo(mensagem) {
    return mostrarToast(mensagem, 'info');
  }

  // Exportar globalmente
  window.mostrarToast = mostrarToast;
  window.mostrarSucesso = mostrarSucesso;
  window.mostrarErro = mostrarErro;
  window.mostrarAviso = mostrarAviso;
  window.mostrarInfo = mostrarInfo;

  // Log de inicialização
  console.log('🔔 Toast Global inicializado');

})();
