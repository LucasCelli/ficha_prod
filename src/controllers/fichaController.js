import { FichaService } from '../services/fichaService.js';
import { ApiResponse } from '../utils/responses.js';

export const FichaController = {
  async create(req, res, next) {
    try {
      const result = await FichaService.create(req.validatedBody);
      return ApiResponse.created(res, result);
    } catch (error) { next(error); }
  },

  async getById(req, res, next) {
    try {
      const ficha = await FichaService.getById(req.params.id);
      if (!ficha) return ApiResponse.notFound(res, 'Ficha não encontrada');
      return ApiResponse.success(res, ficha);
    } catch (error) { next(error); }
  },

  async getAll(req, res, next) {
    try {
      const result = await FichaService.getAll(req.validatedQuery);
      return ApiResponse.paginated(res, result.data, result.pagination);
    } catch (error) { next(error); }
  },

  async update(req, res, next) {
    try {
      const updated = await FichaService.update(req.params.id, req.validatedBody);
      if (!updated) return ApiResponse.notFound(res, 'Ficha não encontrada');
      return ApiResponse.success(res, { message: 'Ficha atualizada com sucesso' });
    } catch (error) { next(error); }
  },

  async markAsDelivered(req, res, next) {
    try {
      const updated = await FichaService.markAsDelivered(req.params.id);
      if (!updated) return ApiResponse.notFound(res, 'Ficha não encontrada');
      return ApiResponse.success(res, { message: 'Ficha marcada como entregue' });
    } catch (error) { next(error); }
  },

  async delete(req, res, next) {
    try {
      const deleted = await FichaService.delete(req.params.id);
      if (!deleted) return ApiResponse.notFound(res, 'Ficha não encontrada');
      return ApiResponse.success(res, { message: 'Ficha deletada com sucesso' });
    } catch (error) { next(error); }
  },

  async getVendedores(req, res, next) {
    try {
      const vendedores = await FichaService.getVendedores();
      return ApiResponse.success(res, vendedores);
    } catch (error) { next(error); }
  },
};
