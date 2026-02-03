/**
 * Cloudinary Upload Module
 * Gerencia upload de imagens para o Cloudinary
 */

(function() {
  'use strict';

  let cloudinaryConfig = null;

  // Inicializar - buscar configuração do servidor
  async function initCloudinary() {
    try {
      const response = await fetch('/api/cloudinary/config');
      if (!response.ok) throw new Error('Erro ao buscar config');

      cloudinaryConfig = await response.json();
      console.log('☁️ Cloudinary configurado:', cloudinaryConfig.cloudName);
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Cloudinary:', error);
      return false;
    }
  }

  // Upload de arquivo (File object)
  async function uploadFile(file, options = {}) {
    if (!cloudinaryConfig) {
      await initCloudinary();
    }

    try {
      // Obter assinatura do servidor
      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eager: options.eager || 'c_limit,w_1200,h_1200,q_auto'
        })
      });

      if (!sigResponse.ok) throw new Error('Erro ao obter assinatura');
      const sigData = await sigResponse.json();

      // Criar FormData para upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      // Otimização automática
      formData.append('eager', 'c_limit,w_1200,h_1200,q_auto');

      // Upload para Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload falhou: ${errorText}`);
      }

      const result = await uploadResponse.json();

      console.log('✅ Upload concluído:', result.public_id);

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
      console.error('❌ Erro no upload:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload de base64
  async function uploadBase64(base64Data, options = {}) {
    if (!cloudinaryConfig) {
      await initCloudinary();
    }

    try {
      // Obter assinatura do servidor
      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!sigResponse.ok) throw new Error('Erro ao obter assinatura');
      const sigData = await sigResponse.json();

      // Criar FormData para upload
      const formData = new URLSearchParams();
      formData.append('file', base64Data);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      // Upload para Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload falhou: ${errorText}`);
      }

      const result = await uploadResponse.json();

      console.log('✅ Upload base64 concluído:', result.public_id);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      console.error('❌ Erro no upload base64:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload múltiplo com progresso
  async function uploadMultiple(files, onProgress = null) {
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
    try {
      // Substituir / por _SLASH_ para passar na URL
      const safePublicId = publicId.replace(/\//g, '_SLASH_');

      const response = await fetch(`/api/cloudinary/image/${safePublicId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar imagem');
      }

      const result = await response.json();
      console.log('🗑️ Imagem deletada:', publicId);
      return { success: true };

    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      return { success: false, error: error.message };
    }
  }

  // Gerar URL otimizada (transformações do Cloudinary)
  function getOptimizedUrl(publicIdOrUrl, options = {}) {
    if (!cloudinaryConfig) {
      console.warn('Cloudinary não inicializado');
      return publicIdOrUrl;
    }

    // Se já é uma URL completa do Cloudinary, extrair o public_id
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.includes('cloudinary.com')) {
      // Extrair public_id da URL
      const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
      if (match) {
        publicId = match[1];
      } else {
        return publicIdOrUrl; // Retornar URL original se não conseguir parsear
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

  // Executar migração de imagens existentes
  async function migrarImagensExistentes(onProgress = null) {
    try {
      if (onProgress) onProgress({ status: 'iniciando', message: 'Iniciando migração...' });

      const response = await fetch('/api/cloudinary/migrar', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erro na migração');
      }

      const resultado = await response.json();

      console.log('🎉 Migração concluída:', resultado);

      if (onProgress) {
        onProgress({ 
          status: 'concluido', 
          message: `Migração concluída: ${resultado.migradas}/${resultado.total} fichas`,
          resultado 
        });
      }

      return resultado;

    } catch (error) {
      console.error('❌ Erro na migração:', error);
      if (onProgress) {
        onProgress({ status: 'erro', message: error.message });
      }
      throw error;
    }
  }

  // Verificar se uma URL é do Cloudinary
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
    migrarImagensExistentes,
    isCloudinaryUrl,
    isBase64,
    getConfig: () => cloudinaryConfig
  };

  // Auto-inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCloudinary);
  } else {
    initCloudinary();
  }

})();
