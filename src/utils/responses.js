export const ApiResponse = {
  success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data, timestamp: new Date().toISOString() });
  },
  created(res, data) { return this.success(res, data, 201); },
  error(res, message, statusCode = 500, details = null) {
    return res.status(statusCode).json({ success: false, error: { message, details }, timestamp: new Date().toISOString() });
  },
  notFound(res, message = 'Recurso não encontrado') { return this.error(res, message, 404); },
  badRequest(res, message = 'Requisição inválida', details = null) { return this.error(res, message, 400, details); },
  paginated(res, data, pagination) {
    return res.status(200).json({ success: true, data, pagination, timestamp: new Date().toISOString() });
  },
};
