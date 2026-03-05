import '../relatorios.js';
import { initRelatoriosActions } from './actions.js';
import { initRelatoriosRender } from './render.js';
import { relatoriosModuleState } from './state.js';

function bootstrapRelatoriosModule() {
  if (relatoriosModuleState.initialized) return;
  relatoriosModuleState.initialized = true;
  initRelatoriosRender();
  initRelatoriosActions();
}

try {
  bootstrapRelatoriosModule();
} catch (error) {
  console.error('Falha ao inicializar módulo relatorios:', error);
}
