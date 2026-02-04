/**
 * Cloudinary Upload Module - DEBUG VERSION
 * Gerencia upload de imagens para o Cloudinary
 */

(function() {
  'use strict';

  let cloudinaryConfig = null;

  console.log('🔧 [CLOUDINARY] Script carregado');

  // Inicializar - buscar configuração do servidor
  async function initCloudinary() {
    console.log('🔧 [CLOUDINARY] Iniciando initCloudinary()...');

    try {
      console.log('🔧 [CLOUDINARY] Fazendo fetch para /api/cloudinary/config...');
      const response = await fetch('/api/cloudinary/config');

      console.log('🔧 [CLOUDINARY] Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      cloudinaryConfig = await response.json();

      console.log('☁️ [CLOUDINARY] Config recebida:', {
        cloudName: cloudinaryConfig.cloudName,
        apiKey: cloudinaryConfig.apiKey ? cloudinaryConfig.apiKey.substring(0, 5) + '...' : 'VAZIO',
        uploadPreset: cloudinaryConfig.uploadPreset
      });

      // Verificar se cloudName está configurado
      if (!cloudinaryConfig.cloudName || cloudinaryConfig.cloudName === 'SEU_CLOUD_NAME') {
        console.error('❌ [CLOUDINARY] cloudName não configurado! Verifique o .env');
        return false;
      }

      if (!cloudinaryConfig.apiKey || cloudinaryConfig.apiKey === 'SUA_API_KEY') {
        console.error('❌ [CLOUDINARY] apiKey não configurado! Verifique o .env');
        return false;
      }

      console.log('✅ [CLOUDINARY] Configurado com sucesso:', cloudinaryConfig.cloudName);
      return true;

    } catch (error) {
      console.error('❌ [CLOUDINARY] Erro ao inicializar:', error);
      return false;
    }
  }

  // Upload de arquivo (File object)
  async function uploadFile(file, options = {}) {
    console.log('📤 [CLOUDINARY] uploadFile() chamado');
    console.log('📤 [CLOUDINARY] Arquivo:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: Math.round(file.size / 1024) + 'KB'
    });

    if (!cloudinaryConfig) {
      console.log('📤 [CLOUDINARY] Config não existe, chamando initCloudinary()...');
      const initResult = await initCloudinary();
      if (!initResult) {
        console.error('❌ [CLOUDINARY] Falha ao inicializar, abortando upload');
        return { success: false, error: 'Cloudinary não configurado' };
      }
    }

    try {
      // Obter assinatura do servidor
      console.log('📤 [CLOUDINARY] Obtendo assinatura do servidor...');

      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      console.log('📤 [CLOUDINARY] Resposta assinatura:', sigResponse.status);

      if (!sigResponse.ok) {
        const errorText = await sigResponse.text();
        console.error('❌ [CLOUDINARY] Erro ao obter assinatura:', errorText);
        throw new Error('Erro ao obter assinatura: ' + errorText);
      }

      const sigData = await sigResponse.json();
      console.log('📤 [CLOUDINARY] Assinatura recebida:', {
        timestamp: sigData.timestamp,
        folder: sigData.folder,
        transformation: sigData.transformation,
        signature: sigData.signature ? sigData.signature.substring(0, 10) + '...' : 'VAZIO'
      });

      // Criar FormData para upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      if (sigData.transformation) {
        formData.append('transformation', sigData.transformation);
      }

      // Upload para Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
      console.log('📤 [CLOUDINARY] Enviando para:', uploadUrl);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      console.log('📤 [CLOUDINARY] Resposta upload:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ [CLOUDINARY] Erro no upload:', errorText);
        throw new Error(`Upload falhou: ${errorText}`);
      }

      const result = await uploadResponse.json();

      console.log('✅ [CLOUDINARY] Upload concluído!', {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };

    } catch (error) {
      console.error('❌ [CLOUDINARY] Erro no upload:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload de base64
  async function uploadBase64(base64Data, options = {}) {
    console.log('📤 [CLOUDINARY] uploadBase64() chamado');
    console.log('📤 [CLOUDINARY] Base64 tamanho:', Math.round(base64Data.length / 1024) + 'KB');

    if (!cloudinaryConfig) {
      console.log('📤 [CLOUDINARY] Config não existe, chamando initCloudinary()...');
      const initResult = await initCloudinary();
      if (!initResult) {
        console.error('❌ [CLOUDINARY] Falha ao inicializar, abortando upload');
        return { success: false, error: 'Cloudinary não configurado' };
      }
    }

    try {
      // Obter assinatura do servidor
      console.log('📤 [CLOUDINARY] Obtendo assinatura...');

      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!sigResponse.ok) {
        throw new Error('Erro ao obter assinatura');
      }

      const sigData = await sigResponse.json();
      console.log('📤 [CLOUDINARY] Assinatura OK');

      // Criar FormData para upload
      const formData = new URLSearchParams();
      formData.append('file', base64Data);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      if (sigData.transformation) {
        formData.append('transformation', sigData.transformation);
      }

      // Upload para Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
      console.log('📤 [CLOUDINARY] Enviando base64 para:', uploadUrl);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ [CLOUDINARY] Erro:', errorText);
        throw new Error(`Upload falhou: ${errorText}`);
      }

      const result = await uploadResponse.json();

      console.log('✅ [CLOUDINARY] Upload base64 concluído:', result.public_id);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      console.error('❌ [CLOUDINARY] Erro no upload base64:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload múltiplo com progresso
  async function uploadMultiple(files, onProgress = null) {
    console.log('📤 [CLOUDINARY] uploadMultiple() - ' + files.length + ' arquivos');

    const results = [];
    let completed = 0;

    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);
      completed++;

      if (onProgress) {
        onProgress({
          completed,
          total: files.length,
          percent: Math.round((completed / files.length) * 100),
          current: result
        });
      }
    }

    return results;
  }

  // Deletar imagem do Cloudinary
  async function deleteImage(publicId) {
    console.log('🗑️ [CLOUDINARY] deleteImage():', publicId);

    try {
      const safePublicId = publicId.replace(/\//g, '_SLASH_');

      const response = await fetch(`/api/cloudinary/image/${safePublicId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar imagem');
      }

      const result = await response.json();
      console.log('✅ [CLOUDINARY] Imagem deletada:', publicId);
      return { success: true };

    } catch (error) {
      console.error('❌ [CLOUDINARY] Erro ao deletar:', error);
      return { success: false, error: error.message };
    }
  }

  // Gerar URL otimizada
  function getOptimizedUrl(publicIdOrUrl, options = {}) {
    if (!cloudinaryConfig) {
      console.warn('⚠️ [CLOUDINARY] Não inicializado para getOptimizedUrl');
      return publicIdOrUrl;
    }

    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.includes('cloudinary.com')) {
      const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
      if (match) {
        publicId = match[1];
      } else {
        return publicIdOrUrl;
      }
    }

    const {
      width = 800,
      height = 800,
      crop = 'limit',
      quality = 'auto',
      format = 'auto'
    } = options;

    const transformations = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;

    return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${transformations}/${publicId}`;
  }

  // Gerar thumbnail
  function getThumbnailUrl(publicIdOrUrl, size = 150) {
    return getOptimizedUrl(publicIdOrUrl, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }

  // Verificar se é URL do Cloudinary
  function isCloudinaryUrl(url) {
    return url && (
      url.includes('cloudinary.com') || 
      url.includes('res.cloudinary.com')
    );
  }

  // Verificar se é base64
  function isBase64(str) {
    return str && str.startsWith('data:');
  }

  // Exportar para uso global
  window.CloudinaryUpload = {
    init: initCloudinary,
    uploadFile,
    uploadBase64,
    uploadMultiple,
    deleteImage,
    getOptimizedUrl,
    getThumbnailUrl,
    isCloudinaryUrl,
    isBase64,
    getConfig: () => cloudinaryConfig
  };

  console.log('🔧 [CLOUDINARY] window.CloudinaryUpload disponível');

  // Auto-inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔧 [CLOUDINARY] DOM ready, auto-inicializando...');
      initCloudinary();
    });
  } else {
    console.log('🔧 [CLOUDINARY] DOM já pronto, auto-inicializando...');
    initCloudinary();
  }

})();