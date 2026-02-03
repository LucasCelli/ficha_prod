import { ClienteRepository } from '../repositories/clienteRepository.js';
import { ApiResponse } from '../utils/responses.js';

export const ClienteController = {
  async getAll(req, res, next) {
    try {
      const { termo } = req.query;
      const clientes = ClienteRepository.findAll(termo);
      return ApiResponse.success(res, clientes);
    } catch (error) { next(error); }
  },
};
