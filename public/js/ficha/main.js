import '../main.js';
import '../integration.js';
import '../rich-text-editor.js';
import { initFichaActions } from './actions.js';
import { assertFichaPublicApi } from './public-api.js';
import { initFichaRender } from './render.js';
import { fichaModuleState } from './state.js';

function bootstrapFichaModule() {
  if (fichaModuleState.initialized) return;
  fichaModuleState.initialized = true;
  initFichaRender();
  initFichaActions();
  assertFichaPublicApi();
}

try {
  bootstrapFichaModule();
} catch (error) {
  console.error('Falha ao inicializar módulo ficha:', error);
}
