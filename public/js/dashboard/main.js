import '../dashboard.js';
import { initDashboardActions } from './actions.js';
import { initDashboardRender } from './render.js';
import { dashboardModuleState } from './state.js';

function bootstrapDashboardModule() {
  if (dashboardModuleState.initialized) return;
  dashboardModuleState.initialized = true;
  initDashboardRender();
  initDashboardActions();
}

try {
  bootstrapDashboardModule();
} catch (error) {
  console.error('Falha ao inicializar módulo dashboard:', error);
}
