const FICHA_PUBLIC_API_KEYS = Object.freeze([
  'coletarFicha',
  'preencherFicha',
  'gerarVersaoImpressao',
  'adicionarProduto',
  'salvarFicha'
]);

export function getFichaPublicApiSnapshot() {
  const snapshot = {};
  FICHA_PUBLIC_API_KEYS.forEach(key => {
    snapshot[key] = typeof window[key] === 'function';
  });
  return snapshot;
}

export function assertFichaPublicApi() {
  const snapshot = getFichaPublicApiSnapshot();
  const missing = Object.keys(snapshot).filter(key => snapshot[key] !== true);
  if (missing.length > 0) {
    console.warn('API pública temporária da ficha incompleta:', missing.join(', '));
  }
}
