/**
 * Image Handler com Cloudinary - VERSÃO CORRIGIDA
 * Usa a estrutura HTML original do main.js
 */

(function() {
  'use strict';

  console.log('🔧 [IMAGE-HANDLER] Script carregado');

  // Array para armazenar as imagens
  let imagens = [];
  const MAX_IMAGENS = 4;

  // Elementos do DOM
  let container, uploadArea, fileInput, counterEl;

  // Drag handlers
  let draggedImageIndex = null;

  // Inicializar quando DOM estiver pronto
  document.addEventListener('DOMContentLoaded', initImageHandler);

  function initImageHandler() {
    console.log('🔧 [IMAGE-HANDLER] initImageHandler() chamado');

    container = document.getElementById('imagesContainer');
    uploadArea = document.getElementById('imageUpload');
    fileInput = document.getElementById('fileInput');
    counterEl = document.getElementById('imagesCounter');

    console.log('🔧 [IMAGE-HANDLER] Elementos encontrados:', {
      container: !!container,
      uploadArea: !!uploadArea,
      fileInput: !!fileInput,
      counterEl: !!counterEl
    });

    if (!container || !uploadArea || !fileInput) {
      console.warn('⚠️ [IMAGE-HANDLER] Elementos de imagem não encontrados');
      return;
    }

    // Event listeners
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop na área de upload
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) processFiles(files);
    });

    // Paste de imagens (Ctrl+V)
    document.addEventListener('paste', handlePaste);

    console.log('📸 [IMAGE-HANDLER] Inicializado');

    // Verificar CloudinaryUpload após pequeno delay
    setTimeout(() => {
      if (window.CloudinaryUpload) {
        console.log('✅ [IMAGE-HANDLER] CloudinaryUpload disponível');
      } else {
        console.warn('⚠️ [IMAGE-HANDLER] CloudinaryUpload NÃO disponível - usando base64');
      }
    }, 500);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  }

  function handlePaste(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
      processFiles(files);
    }
  }

  async function processFiles(files) {
    console.log('📤 [IMAGE-HANDLER] processFiles() -', files.length, 'arquivo(s)');

    if (imagens.length >= MAX_IMAGENS) {
      toast('Máximo de ' + MAX_IMAGENS + ' imagens atingido', 'warning');
      return;
    }

    const espacoDisponivel = MAX_IMAGENS - imagens.length;
    const filesToProcess = files.slice(0, espacoDisponivel);

    // Mostrar loading
    mostrarLoading(filesToProcess.length);

    for (const file of filesToProcess) {
      console.log('📤 [IMAGE-HANDLER] Processando:', file.name);

      try {
        if (window.CloudinaryUpload) {
          // Upload para Cloudinary
          console.log('📤 [IMAGE-HANDLER] Enviando para Cloudinary...');
          const result = await CloudinaryUpload.uploadFile(file);

          if (result.success) {
            imagens.push({
              src: result.url,
              publicId: result.publicId,
              descricao: ''
            });
            console.log('✅ [IMAGE-HANDLER] Upload Cloudinary OK:', result.publicId);
          } else {
            throw new Error(result.error || 'Erro no upload');
          }
        } else {
          // Fallback para base64
          console.warn('⚠️ [IMAGE-HANDLER] Usando fallback base64');
          const base64 = await fileToBase64(file);
          imagens.push({ src: base64, descricao: '' });
        }
      } catch (error) {
        console.error('❌ [IMAGE-HANDLER] Erro:', error);
        toast('Erro ao enviar imagem: ' + error.message, 'error');
      }
    }

    esconderLoading();
    renderizarImagens();
    atualizarContador();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ==================== RENDERIZAÇÃO - ESTRUTURA ORIGINAL ====================

  function renderizarImagens() {
    if (!container) return;

    console.log('🔧 [IMAGE-HANDLER] renderizarImagens() -', imagens.length, 'imagem(ns)');

    container.innerHTML = '';

    imagens.forEach((img, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.draggable = true;
      card.dataset.index = index;

      // Usar URL original - CSS controla o tamanho
      const thumbUrl = img.src;

      // Badge de nuvem se estiver no Cloudinary
      const cloudBadge = img.publicId 
        ? '<span class="cloud-badge" title="Armazenada na nuvem"><i class="fas fa-cloud"></i></span>' 
        : '';

      // ESTRUTURA HTML ORIGINAL DO MAIN.JS
      card.innerHTML = `
        <div class="image-wrapper">
          <span class="image-number">${index + 1}</span>
          <img src="${thumbUrl}" alt="Imagem ${index + 1}" draggable="false">
          <button type="button" class="image-delete-btn" title="Remover imagem">
            <i class="fas fa-times"></i>
          </button>
          <div class="image-drag-handle">
            <i class="fas fa-grip-horizontal"></i>
            Arrastar
          </div>
          ${cloudBadge}
        </div>
        <div class="image-description">
          <input type="text" placeholder="Descrição da imagem (opcional)" value="${img.descricao || ''}" data-index="${index}">
        </div>
      `;

      container.appendChild(card);

      // Event: Deletar
      card.querySelector('.image-delete-btn').addEventListener('click', async () => {
        await removerImagem(index);
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

    // Mostrar/esconder área de upload
    if (uploadArea) {
      uploadArea.style.display = imagens.length >= MAX_IMAGENS ? 'none' : '';
    }
  }

  // ==================== DRAG HANDLERS ORIGINAIS ====================

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
      // Reordenar
      const [movedImage] = imagens.splice(draggedImageIndex, 1);
      imagens.splice(targetIndex, 0, movedImage);
      renderizarImagens();
    }
  }

  // ==================== FUNÇÕES AUXILIARES ====================

  async function removerImagem(index) {
    const img = imagens[index];
    console.log('🗑️ [IMAGE-HANDLER] Removendo imagem', index);

    // Se tem publicId, deletar do Cloudinary
    if (img.publicId && window.CloudinaryUpload) {
      try {
        await CloudinaryUpload.deleteImage(img.publicId);
        console.log('✅ Removida do Cloudinary');
      } catch (error) {
        console.warn('⚠️ Erro ao deletar do Cloudinary:', error);
      }
    }

    imagens.splice(index, 1);
    renderizarImagens();
    atualizarContador();
  }

  function atualizarContador() {
    if (counterEl) {
      counterEl.textContent = `(${imagens.length}/${MAX_IMAGENS})`;
    }
  }

  function mostrarLoading(count) {
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-card loading-placeholder';
      placeholder.innerHTML = `
        <div class="image-wrapper" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6;">
          <div style="text-align: center; color: #6b7280;">
            <i class="fas fa-cloud-upload-alt fa-2x fa-spin"></i>
            <div style="margin-top: 8px; font-size: 12px;">Enviando...</div>
          </div>
        </div>
      `;
      container.appendChild(placeholder);
    }
  }

  function esconderLoading() {
    if (!container) return;
    container.querySelectorAll('.loading-placeholder').forEach(el => el.remove());
  }

  // Toast - usa o global (toast.js) se disponível
  function toast(mensagem, tipo = 'info') {
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast(mensagem, tipo);
    } else {
      // Fallback mínimo (não deveria acontecer se toast.js carregou)
      console.log(`[TOAST ${tipo.toUpperCase()}] ${mensagem}`);
    }
  }

  // ==================== API PÚBLICA ====================

  window.getImagens = function() {
    console.log('🔧 [IMAGE-HANDLER] getImagens() -', imagens.length, 'imagem(ns)');
    return imagens.map(img => ({
      src: img.src,
      publicId: img.publicId || null,
      descricao: img.descricao || ''
    }));
  };

  window.setImagens = function(novasImagens) {
    console.log('🔧 [IMAGE-HANDLER] setImagens() -', novasImagens?.length || 0, 'imagem(ns)');

    imagens = [];

    if (Array.isArray(novasImagens)) {
      novasImagens.forEach((img) => {
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
    console.log('✅ [IMAGE-HANDLER]', imagens.length, 'imagem(ns) carregada(s)');
  };

  window.limparImagens = function() {
    imagens = [];
    renderizarImagens();
    atualizarContador();
  };

  window.adicionarImagem = function(imgData) {
    if (imagens.length >= MAX_IMAGENS) {
      toast('Máximo de ' + MAX_IMAGENS + ' imagens atingido', 'warning');
      return false;
    }

    if (typeof imgData === 'string') {
      imagens.push({ src: imgData, descricao: '' });
    } else {
      imagens.push({
        src: imgData.src,
        publicId: imgData.publicId || null,
        descricao: imgData.descricao || ''
      });
    }

    renderizarImagens();
    atualizarContador();
    return true;
  };

  console.log('🔧 [IMAGE-HANDLER] APIs: getImagens, setImagens, limparImagens, adicionarImagem');

})();