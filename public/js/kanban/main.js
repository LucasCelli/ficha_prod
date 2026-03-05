import '../kanban.js';
import { initKanbanActions } from './actions.js';
import { initKanbanDragDrop } from './dragdrop.js';
import { initKanbanModal } from './modal.js';
import { initKanbanRender } from './render.js';
import { kanbanModuleState } from './state.js';

function bootstrapKanbanModule() {
  if (kanbanModuleState.initialized) return;
  kanbanModuleState.initialized = true;
  initKanbanRender();
  initKanbanActions();
  initKanbanDragDrop();
  initKanbanModal();
}

try {
  bootstrapKanbanModule();
} catch (error) {
  console.error('Falha ao inicializar módulo kanban:', error);
}
