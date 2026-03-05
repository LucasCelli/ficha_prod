import '../home.js';
import { initHomeActions } from './actions.js';
import { initHomeRender } from './render.js';
import { homeModuleState } from './state.js';

function bootstrapHomeModule() {
  if (homeModuleState.initialized) return;
  homeModuleState.initialized = true;
  initHomeRender();
  initHomeActions();
}

try {
  bootstrapHomeModule();
} catch (error) {
  console.error('Falha ao inicializar módulo home:', error);
}
