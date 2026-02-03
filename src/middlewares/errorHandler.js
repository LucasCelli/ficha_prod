import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/responses.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path, method: req.method }, 'Erro');
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    return ApiResponse.badRequest(res, 'Dados inválidos', details);
  }
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return ApiResponse.badRequest(res, 'Registro duplicado');
  const message = process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message;
  return ApiResponse.error(res, message, 500);
}

export function notFoundHandler(req, res) {
  return ApiResponse.notFound(res, `Rota ${req.method} ${req.path} não encontrada`);
}
