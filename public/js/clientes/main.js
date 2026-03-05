import '../clientes.js';
import { initClientesActions } from './actions.js';
import { initClientesRender } from './render.js';
import { clientesModuleState } from './state.js';

function bootstrapClientesModule() {
  if (clientesModuleState.initialized) return;
  clientesModuleState.initialized = true;
  initClientesRender();
  initClientesActions();
}

try {
  bootstrapClientesModule();
} catch (error) {
  console.error('Falha ao inicializar módulo clientes:', error);
}
