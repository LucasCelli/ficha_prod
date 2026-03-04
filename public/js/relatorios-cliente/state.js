export const CLIENT_LIMIT = 30;
export const HISTORY_LIMIT = 10;

export const state = {
  clients: [],
  clientsOffset: 0,
  clientsHasMore: false,
  clientsLoading: false,
  clientQuery: '',
  selectedClientId: null,
  selectedQuickRange: '30d',
  dataInicio: '',
  dataFim: '',
  detailLoading: false,
  detailError: '',
  detail: null,
  historyOffset: 0,
  cache: new Map()
};

export function buildCacheKey(clientId, dataInicio, dataFim, historyOffset, historyLimit) {
  return [clientId, dataInicio || '', dataFim || '', historyOffset || 0, historyLimit || 0].join('|');
}

