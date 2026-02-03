import { FichaRepository } from '../repositories/fichaRepository.js';
import { ClienteRepository } from '../repositories/clienteRepository.js';

export const FichaService = {
  async create(data) {
    const id = FichaRepository.create(data);
    if (data.cliente) {
      ClienteRepository.upsert(data.cliente, data.dataInicio);
    }
    return { id };
  },

  async getById(id) {
    return FichaRepository.findById(id);
  },

  async getAll(filtros) {
    return FichaRepository.findAll(filtros);
  },

  async update(id, data) {
    return FichaRepository.update(id, data);
  },

  async markAsDelivered(id) {
    return FichaRepository.markAsDelivered(id);
  },

  async delete(id) {
    return FichaRepository.delete(id);
  },

  async getVendedores() {
    return FichaRepository.getVendedores();
  },
};
