/**
 * Image Handler com Cloudinary
 * Substitui o sistema de imagens base64 por uploads no Cloudinary
 * 
 * COMO USAR:
 * 1. Inclua este arquivo APÓS cloudinary-upload.js e ANTES de main.js
 * 2. Ou substitua a seção de imagens no main.js pelo conteúdo deste arquivo
 */

(function() {
  'use strict';

  // Array para armazenar as imagens (agora com URLs do Cloudinary)
  let imagens = [];
  const MAX_IMAGENS = 4;

  // Elementos do DOM
  let imageUpload, imagesContainer, fileInput, imagesCounter;

  // Inicializar quando DOM estiver pronto
  document.addEventListener('DOMContentLoaded', initImageHandler);

  function initImageHandler() {
    imageUpload = document.getElementById('imageUpload');
    imagesContainer = document.getElementById('imagesContainer');
    fileInput = document.getElementById('fileInput');
    imagesCounter = document.getElementById('imagesCounter');

    if (!imageUpload || !imagesContainer || !fileInput) {
      console.warn('⚠️ Elementos de imagem não encontrados');
      return;
    }

    // Event listeners
    imageUpload.addEventListener('click', () => fileInput.click());
    imageUpload.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    imageUpload.addEventListener('dragover', handleDragOver);
    imageUpload.addEventListener('dragleave', handleDragLeave);
    imageUpload.addEventListener('drop', handleDrop);

    // Paste de imagens (Ctrl+V)
    document.addEventListener('paste', handlePaste);

    console.log('📸 Image Handler com Cloudinary inicializado');
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      processFiles(files);
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = ''; // Reset input
  }

  function handlePaste(e) {
    // Ignorar se estiver em campo de texto
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
      processFiles(files);
    }
  }

  async function processFiles(files) {
    if (imagens.length >= MAX_IMAGENS) {
      mostrarToast('Máximo de 4 imagens atingido', 'warning');
      return;
    }

    const espacoDisponivel = MAX_IMAGENS - imagens.length;
    const filesToProcess = files.slice(0, espacoDisponivel);

    // Mostrar loading
    mostrarLoadingImagens(filesToProcess.length);

    for (const file of filesToProcess) {
      try {
        // Verificar se Cloudinary está disponível
        if (window.CloudinaryUpload) {
          // Upload para Cloudinary
          const result = await CloudinaryUpload.uploadFile(file);

          if (result.success) {
            adicionarImagem({
              src: result.url,
              publicId: result.publicId,
              descricao: ''
            });
            console.log('☁️ Imagem enviada para Cloudinary:', result.publicId);
          } else {
            throw new Error(result.error || 'Erro no upload');
          }
        } else {
          // Fallback para base64 se Cloudinary não estiver disponível
          console.warn('⚠️ Cloudinary não disponível, usando base64');
          const base64 = await fileToBase64(file);
          adicionarImagem({ src: base64, descricao: '' });
        }
      } catch (error) {
        console.error('❌ Erro ao processar imagem:', error);
        mostrarToast('Erro ao fazer upload da imagem', 'error');
      }
    }

    esconderLoadingImagens();
    renderizarImagens();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function adicionarImagem(imgData) {
    if (imagens.length < MAX_IMAGENS) {
      imagens.push(imgData);
      atualizarContador();
    }
  }

  async function removerImagem(index) {
    const img = imagens[index];

    // Se tem publicId, deletar do Cloudinary
    if (img.publicId && window.CloudinaryUpload) {
      try {
        await CloudinaryUpload.deleteImage(img.publicId);
        console.log('🗑️ Imagem removida do Cloudinary');
      } catch (error) {
        console.warn('⚠️ Erro ao deletar do Cloudinary:', error);
      }
    }

    imagens.splice(index, 1);
    renderizarImagens();
    atualizarContador();
  }

  function renderizarImagens() {
    if (!imagesContainer) return;

    imagesContainer.innerHTML = imagens.map((img, index) => {
      // Usar thumbnail otimizado se for URL do Cloudinary
      const thumbUrl = window.CloudinaryUpload && CloudinaryUpload.isCloudinaryUrl(img.src)
        ? CloudinaryUpload.getThumbnailUrl(img.src, 200)
        : img.src;

      return `
        <div class="image-card" draggable="true" data-index="${index}">
          <div class="image-preview">
            <img src="${thumbUrl}" alt="Imagem ${index + 1}" loading="lazy">
          </div>
          <div class="image-actions">
            <button type="button" class="btn-view-image" data-index="${index}" title="Visualizar">
              <i class="fas fa-search-plus"></i>
            </button>
            <button type="button" class="btn-remove-image" data-index="${index}" title="Remover">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <input type="text" class="image-description" placeholder="Descrição (opcional)" 
                 value="${img.descricao || ''}" data-index="${index}">
          ${img.publicId ? '<span class="cloud-badge" title="Armazenada na nuvem"><i class="fas fa-cloud"></i></span>' : ''}
        </div>
      `;
    }).join('');

    // Event listeners
    imagesContainer.querySelectorAll('.btn-remove-image').forEach(btn => {
      btn.addEventListener('click', () => removerImagem(parseInt(btn.dataset.index)));
    });

    imagesContainer.querySelectorAll('.btn-view-image').forEach(btn => {
      btn.addEventListener('click', () => visualizarImagem(parseInt(btn.dataset.index)));
    });

    imagesContainer.querySelectorAll('.image-description').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        imagens[index].descricao = e.target.value;
      });
    });

    // Drag and drop para reordenar
    initDragReorder();

    // Mostrar/esconder área de upload
    if (imageUpload) {
      imageUpload.style.display = imagens.length >= MAX_IMAGENS ? 'none' : 'flex';
    }
  }

  function visualizarImagem(index) {
    const img = imagens[index];
    if (!img) return;

    // Usar URL em tamanho maior para visualização
    const fullUrl = window.CloudinaryUpload && CloudinaryUpload.isCloudinaryUrl(img.src)
      ? CloudinaryUpload.getOptimizedUrl(img.src, { width: 1200, height: 1200 })
      : img.src;

    // Criar modal de visualização
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-backdrop"></div>
      <div class="image-modal-content">
        <img src="${fullUrl}" alt="Visualização">
        <button class="image-modal-close"><i class="fas fa-times"></i></button>
      </div>
    `;

    modal.querySelector('.image-modal-backdrop').addEventListener('click', () => modal.remove());
    modal.querySelector('.image-modal-close').addEventListener('click', () => modal.remove());

    document.body.appendChild(modal);

    // Fechar com ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  function initDragReorder() {
    const cards = imagesContainer.querySelectorAll('.image-card');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.index);
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = imagesContainer.querySelector('.dragging');
        if (dragging && dragging !== card) {
          card.classList.add('drag-target');
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-target');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');

        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = parseInt(card.dataset.index);

        if (fromIndex !== toIndex) {
          // Reordenar array
          const [moved] = imagens.splice(fromIndex, 1);
          imagens.splice(toIndex, 0, moved);
          renderizarImagens();
        }
      });
    });
  }

  function atualizarContador() {
    if (imagesCounter) {
      imagesCounter.textContent = `(${imagens.length}/${MAX_IMAGENS})`;
    }
  }

  function mostrarLoadingImagens(count) {
    if (!imagesContainer) return;

    for (let i = 0; i < count; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-card loading-placeholder';
      placeholder.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-cloud-upload-alt fa-spin"></i>
          <span>Enviando...</span>
        </div>
      `;
      imagesContainer.appendChild(placeholder);
    }
  }

  function esconderLoadingImagens() {
    if (!imagesContainer) return;
    imagesContainer.querySelectorAll('.loading-placeholder').forEach(el => el.remove());
  }

  function mostrarToast(mensagem, tipo = 'info') {
    // Usar toast do sistema se disponível
    if (window.mostrarToast) {
      window.mostrarToast(mensagem, tipo);
      return;
    }

    // Fallback simples
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
      background: ${tipo === 'error' ? '#ef4444' : tipo === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white; border-radius: 8px; z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ==================== API PÚBLICA ====================

  // Obter imagens (para salvar no banco)
  window.getImagens = function() {
    return imagens.map(img => ({
      src: img.src,
      publicId: img.publicId || null,
      descricao: img.descricao || ''
    }));
  };

  // Definir imagens (ao carregar ficha)
  window.setImagens = function(novasImagens) {
    imagens = [];

    if (Array.isArray(novasImagens)) {
      novasImagens.forEach(img => {
        if (typeof img === 'string') {
          imagens.push({ src: img, descricao: '' });
        } else if (img && img.src) {
          imagens.push({
            src: img.src,
            publicId: img.publicId || null,
            descricao: img.descricao || ''
          });
        }
      });
    }

    renderizarImagens();
    atualizarContador();
    console.log(`📸 ${imagens.length} imagem(ns) carregada(s)`);
  };

  // Limpar todas as imagens
  window.limparImagens = function() {
    imagens = [];
    renderizarImagens();
    atualizarContador();
  };

})();
