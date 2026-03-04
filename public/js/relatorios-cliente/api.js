import { CLIENT_LIMIT, HISTORY_LIMIT } from './state.js';

function getBaseUrl() {
  if (window.db && window.db.baseURL) return window.db.baseURL;
  return '/api';
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchClients({ query = '', limit = CLIENT_LIMIT, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return fetchJson(`${getBaseUrl()}/relatorio-clientes?${params.toString()}`);
}

export async function fetchClientReport({
  clientId,
  dataInicio = '',
  dataFim = '',
  fichasLimit = HISTORY_LIMIT,
  fichasOffset = 0
}) {
  const params = new URLSearchParams();
  if (dataInicio && dataFim) {
    params.set('dataInicio', dataInicio);
    params.set('dataFim', dataFim);
  }
  params.set('fichasLimit', String(fichasLimit));
  params.set('fichasOffset', String(fichasOffset));
  return fetchJson(`${getBaseUrl()}/relatorio-clientes/${encodeURIComponent(String(clientId))}?${params.toString()}`);
}

