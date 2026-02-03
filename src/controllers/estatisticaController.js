import { EstatisticaService } from '../services/estatisticaService.js';
import { ApiResponse } from '../utils/responses.js';

export const EstatisticaController = {
  async getEstatisticas(req, res, next) {
    try {
      const stats = EstatisticaService.getEstatisticasGerais();
      return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
  },

  async getRelatorio(req, res, next) {
    try {
      const { periodo = 'mes', dataInicio, dataFim } = req.query;
      const relatorio = EstatisticaService.getRelatorio(periodo, dataInicio, dataFim);
      return ApiResponse.success(res, relatorio);
    } catch (error) { next(error); }
  },
};
