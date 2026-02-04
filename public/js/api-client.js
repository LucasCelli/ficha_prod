/**
 * API Client - Comunicação com o Backend
 */

class APIClient {
  constructor() {
    // Detectar URL base automaticamente
    this.baseURL = this.detectBaseURL();
    this.initialized = false;
  }

  detectBaseURL() {
    const hostname = window.location.hostname;

    // Produção (Render, Railway, etc)
    if (hostname.includes('render.com') || 
        hostname.includes('railway.app') ||
        hostname.includes('onrender.com')) {
      return window.location.origin + '/api';
    }

    // Desenvolvimento local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Tentar a porta do servidor primeiro
      return 'http://localhost:3000/api';
    }

    // Fallback: usar a mesma origem
    return window.location.origin + '/api';
  }

  async init() {
    if (this.initialized) return true;

    try {
      // Testar conexão com o servidor
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Conectado ao servidor:', this.baseURL);
        this.initialized = true;
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Servidor não disponível em:', this.baseURL);
    }

    // Tentar porta alternativa em desenvolvimento
    if (window.location.hostname === 'localhost') {
      const altURL = 'http://localhost:3000/api';
      try {
        const response = await fetch(`${altURL}/health`);
        if (response.ok) {
          this.baseURL = altURL;
          console.log('✅ Conectado ao servidor:', this.baseURL);
          this.initialized = true;
          return true;
        }
      } catch (e) {}
    }

    console.error('❌ Não foi possível conectar ao servidor');
    return false;
  }

  // ==================== FICHAS ====================

  async listarFichas() {
    const response = await fetch(`${this.baseURL}/fichas`);
    if (!response.ok) throw new Error('Erro ao listar fichas');
    return response.json();
  }

  async buscarFicha(id) {
    const response = await fetch(`${this.baseURL}/fichas/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Erro ao buscar ficha');
    }
    return response.json();
  }

  async salvarFicha(dados) {
    const url = dados.id 
      ? `${this.baseURL}/fichas/${dados.id}`
      : `${this.baseURL}/fichas`;

    const method = dados.id ? 'PUT' : 'POST';

    // Preparar dados para envio (garantir formato correto)
    const dadosEnvio = {
      cliente: dados.cliente || '',
      vendedor: dados.vendedor || '',
      dataInicio: dados.dataInicio || '',
      numeroVenda: dados.numeroVenda || '',
      dataEntrega: dados.dataEntrega || '',
      evento: dados.evento || 'nao',
      status: dados.status || 'pendente',
      produtos: dados.produtos || [],

      // Material
      material: dados.material || '',
      composicao: dados.composicao || '',
      corMaterial: dados.corMaterial || '',

      // Manga
      manga: dados.manga || '',
      acabamentoManga: dados.acabamentoManga || '',
      larguraManga: dados.larguraManga || '',
      corAcabamentoManga: dados.corAcabamentoManga || '',

      // Gola
      gola: dados.gola || '',
      corGola: dados.corGola || '',
      acabamentoGola: dados.acabamentoGola || '',
      larguraGola: dados.larguraGola || '',

      // Polo específico
      corPeitilhoInterno: dados.corPeitilhoInterno || '',
      corPeitilhoExterno: dados.corPeitilhoExterno || '',
      aberturaLateral: dados.aberturaLateral || 'nao',
      corAberturaLateral: dados.corAberturaLateral || '',

      // Reforço gola
      reforcoGola: dados.reforcoGola || 'nao',
      corReforco: dados.corReforco || '',

      // Bolso
      bolso: dados.bolso || '',

      // Filete
      filete: dados.filete || 'nao',
      fileteLocal: dados.fileteLocal || '',
      fileteCor: dados.fileteCor || '',

      // Faixa
      faixa: dados.faixa || 'nao',
      faixaLocal: dados.faixaLocal || '',
      faixaCor: dados.faixaCor || '',

      // Arte
      arte: dados.arte || '',
      corSublimacao: dados.corSublimacao || '',

      // Observações
      observacoes: dados.observacoes || '',

      // Imagens
      imagemData: dados.imagemData || '',
      imagensData: dados.imagensData || '[]'
    };

    console.log('📤 Enviando dados para o servidor:', Object.keys(dadosEnvio).length, 'campos');

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosEnvio)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erro ao salvar ficha');
    }

    const result = await response.json();
    return result.id;
  }

  async deletarFicha(id) {
    const response = await fetch(`${this.baseURL}/fichas/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Erro ao deletar ficha');
    return true;
  }

  async marcarComoEntregue(id) {
    const response = await fetch(`${this.baseURL}/fichas/${id}/entregar`, {
      method: 'PATCH'
    });

    if (!response.ok) throw new Error('Erro ao marcar como entregue');
    return true;
  }

  async marcarComoPendente(id) {
    const response = await fetch(`${this.baseURL}/fichas/${id}/pendente`, {
      method: 'PATCH'
    });

    if (!response.ok) throw new Error('Erro ao marcar como pendente');
    return true;
  }

  // ==================== CLIENTES ====================

  async buscarClientes(termo = '') {
    const url = termo 
      ? `${this.baseURL}/clientes?termo=${encodeURIComponent(termo)}`
      : `${this.baseURL}/clientes`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao buscar clientes');
    return response.json();
  }

  // ==================== ESTATÍSTICAS E RELATÓRIOS ====================

  async buscarEstatisticas() {
    const response = await fetch(`${this.baseURL}/estatisticas`);
    if (!response.ok) throw new Error('Erro ao buscar estatísticas');
    return response.json();
  }

  async buscarRelatorio(periodo = 'mes', dataInicio = null, dataFim = null) {
    let url = `${this.baseURL}/relatorios?periodo=${periodo}`;

    if (dataInicio) url += `&dataInicio=${dataInicio}`;
    if (dataFim) url += `&dataFim=${dataFim}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao buscar relatório');
    return response.json();
  }

  // ==================== BACKUP ====================

  async exportarBackup() {
    try {
      const fichas = await this.listarFichas();
      const clientes = await this.buscarClientes();

      return {
        fichas,
        clientes,
        dataExportacao: new Date().toISOString(),
        versao: 2.0
      };
    } catch (error) {
      console.error('❌ Erro ao exportar backup:', error);
      throw error;
    }
  }

  async importarBackup(dados) {
    try {
      if (!dados.fichas || !Array.isArray(dados.fichas)) {
        throw new Error('Formato de backup inválido');
      }

      for (const ficha of dados.fichas) {
        delete ficha.id;
        await this.salvarFicha(ficha);
      }

      console.log('✅ Backup importado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao importar backup:', error);
      throw error;
    }
  }
}

// Instância global
const db = new APIClient();
window.db = db;