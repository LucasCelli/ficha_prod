(function () {
  'use strict';

  if (window.toast) {
    return;
  }

  const script = document.createElement('script');
  script.src = 'js/utils/toast.js';
  script.defer = true;
  document.head.appendChild(script);
})();
