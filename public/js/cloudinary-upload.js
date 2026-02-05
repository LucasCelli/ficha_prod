/**
 * Cloudinary Upload Module
 * Gerencia upload de imagens para o Cloudinary
 */

(function() {
  'use strict';

  let cloudinaryConfig = null;

  async function initCloudinary() {
    try {
      const response = await fetch('/api/cloudinary/config');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      cloudinaryConfig = await response.json();

      if (!cloudinaryConfig.cloudName || cloudinaryConfig.cloudName === 'SEU_CLOUD_NAME') {
        return false;
      }

      if (!cloudinaryConfig.apiKey || cloudinaryConfig.apiKey === 'SUA_API_KEY') {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  async function uploadFile(file, options = {}) {
    if (!cloudinaryConfig) {
      const initResult = await initCloudinary();
      if (!initResult) {
        return { success: false, error: 'Cloudinary não configurado' };
      }
    }

    try {
      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!sigResponse.ok) {
        const errorText = await sigResponse.text();
        throw new Error('Erro ao obter assinatura: ' + errorText);
      }

      const sigData = await sigResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      if (sigData.transformation) {
        formData.append('transformation', sigData.transformation);
      }

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
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function uploadBase64(base64Data, options = {}) {
    if (!cloudinaryConfig) {
      const initResult = await initCloudinary();
      if (!initResult) {
        return { success: false, error: 'Cloudinary não configurado' };
      }
    }

    try {
      const sigResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!sigResponse.ok) {
        throw new Error('Erro ao obter assinatura');
      }

      const sigData = await sigResponse.json();

      const formData = new URLSearchParams();
      formData.append('file', base64Data);
      formData.append('timestamp', sigData.timestamp);
      formData.append('folder', sigData.folder);
      formData.append('signature', sigData.signature);
      formData.append('api_key', sigData.apiKey);

      if (sigData.transformation) {
        formData.append('transformation', sigData.transformation);
      }

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

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

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

  async function deleteImage(publicId) {
    try {
      const safePublicId = publicId.replace(/\//g, '_SLASH_');

      const response = await fetch(`/api/cloudinary/image/${safePublicId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar imagem');
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function getOptimizedUrl(publicIdOrUrl, options = {}) {
    if (!cloudinaryConfig) {
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

  function getThumbnailUrl(publicIdOrUrl, size = 150) {
    return getOptimizedUrl(publicIdOrUrl, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }

  function isCloudinaryUrl(url) {
    return url && (
      url.includes('cloudinary.com') || 
      url.includes('res.cloudinary.com')
    );
  }

  function isBase64(str) {
    return str && str.startsWith('data:');
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCloudinary);
  } else {
    initCloudinary();
  }

})();