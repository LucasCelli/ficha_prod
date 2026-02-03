/**
 * Cliente da API REST
 * Compatível com o servidor sql.js
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin + '/api';
  }

  async init() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      if (!response.ok) throw new Error('API indisponível');
      const data = await response.json();
      console.log('✅ API conectada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar com API:', error);
      throw error;
    }
  }

  async salvarFicha(ficha) {
    try {
      const url = ficha.id 
        ? `${this.baseURL}/fichas/${ficha.id}`
        : `${this.baseURL}/fichas`;

      const method = ficha.id ? 'PUT' : 'POST';

      console.log(`📤 ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ficha)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar ficha');
      }

      const result = await response.json().catch(() => ({}));
      console.log('✅ Ficha salva com sucesso', result);

      return result.id || ficha.id;
    } catch (error) {
      console.error('❌ Erro ao salvar ficha:', error);
      throw error;
    }
  }

  async buscarFicha(id) {
    try {
      const response = await fetch(`${this.baseURL}/fichas/${id}`);

      if (!response.ok) {
        throw new Error('Ficha não encontrada');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar ficha:', error);
      throw error;
    }
  }

  async listarFichas(filtros = {}) {
    try {
      const params = new URLSearchParams();

      if (filtros.status) params.append('status', filtros.status);
      if (filtros.cliente) params.append('cliente', filtros.cliente);
      if (filtros.vendedor) params.append('vendedor', filtros.vendedor);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);

      const url = `${this.baseURL}/fichas${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erro ao listar fichas');
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('❌ Erro ao listar fichas:', error);
      throw error;
    }
  }

  async deletarFicha(id) {
    try {
      const response = await fetch(`${this.baseURL}/fichas/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao deletar ficha');
      }

      console.log('✅ Ficha deletada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar ficha:', error);
      throw error;
    }
  }

  async marcarComoEntregue(id) {
    try {
      const response = await fetch(`${this.baseURL}/fichas/${id}/entregar`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao marcar como entregue');
      }

      console.log('✅ Ficha marcada como entregue');
      return true;
    } catch (error) {
      console.error('❌ Erro ao marcar como entregue:', error);
      throw error;
    }
  }

  // *** NOVA FUNÇÃO *** Desmarcar como entregue (voltar para pendente)
  async marcarComoPendente(id) {
    try {
      const response = await fetch(`${this.baseURL}/fichas/${id}/pendente`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao marcar como pendente');
      }

      console.log('✅ Ficha marcada como pendente');
      return true;
    } catch (error) {
      console.error('❌ Erro ao marcar como pendente:', error);
      throw error;
    }
  }

  async pesquisarFichas(termo) {
    try {
      return await this.listarFichas({ cliente: termo });
    } catch (error) {
      console.error('❌ Erro ao pesquisar fichas:', error);
      throw error;
    }
  }

  async filtrarPorData(dataInicio, dataFim) {
    try {
      return await this.listarFichas({ dataInicio, dataFim });
    } catch (error) {
      console.error('❌ Erro ao filtrar por data:', error);
      throw error;
    }
  }

  async buscarClientes(termo = '') {
    try {
      const params = termo ? `?termo=${encodeURIComponent(termo)}` : '';
      const response = await fetch(`${this.baseURL}/clientes${params}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar clientes');
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      return [];
    }
  }

  async buscarEstatisticas() {
    try {
      const response = await fetch(`${this.baseURL}/estatisticas`);

      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  async buscarRelatorio(periodo, dataInicio = null, dataFim = null) {
    try {
      const params = new URLSearchParams({ periodo });

      if (periodo === 'customizado' && dataInicio && dataFim) {
        params.append('dataInicio', dataInicio);
        params.append('dataFim', dataFim);
      }

      const response = await fetch(`${this.baseURL}/relatorio?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar relatório');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar relatório:', error);
      throw error;
    }
  }

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