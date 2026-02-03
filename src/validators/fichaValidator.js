import { z } from 'zod';

const produtoSchema = z.object({
  tipo: z.string().optional(),
  modelo: z.string().optional(),
  quantidade: z.coerce.number().int().min(0).default(0),
  tamanhos: z.record(z.coerce.number().int().min(0)).optional(),
});

export const fichaSchema = z.object({
  cliente: z.string().min(1, 'Nome do cliente é obrigatório').max(200),
  vendedor: z.string().max(100).optional().nullable(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().nullable(),
  numeroVenda: z.string().max(50).optional().nullable(),
  dataEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().nullable(),
  evento: z.enum(['sim', 'nao']).default('nao'),
  status: z.enum(['pendente', 'entregue', 'cancelado']).default('pendente'),
  material: z.string().max(100).optional().nullable(),
  composicao: z.string().max(200).optional().nullable(),
  corMaterial: z.string().max(50).optional().nullable(),
  manga: z.string().max(50).optional().nullable(),
  acabamentoManga: z.string().max(100).optional().nullable(),
  larguraManga: z.string().max(50).optional().nullable(),
  gola: z.string().max(50).optional().nullable(),
  acabamentoGola: z.string().max(100).optional().nullable(),
  corPeitilhoInterno: z.string().max(50).optional().nullable(),
  corPeitilhoExterno: z.string().max(50).optional().nullable(),
  aberturaLateral: z.string().max(50).optional().nullable(),
  reforcoGola: z.string().max(50).optional().nullable(),
  corReforco: z.string().max(50).optional().nullable(),
  bolso: z.string().max(100).optional().nullable(),
  filete: z.string().max(100).optional().nullable(),
  faixa: z.string().max(100).optional().nullable(),
  arte: z.string().max(200).optional().nullable(),
  corSublimacao: z.string().max(20).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  imagemData: z.string().optional().nullable(),
  produtos: z.array(produtoSchema).default([]),
});

export const fichaFiltrosSchema = z.object({
  status: z.enum(['pendente', 'entregue', 'cancelado']).optional(),
  cliente: z.string().optional(),
  vendedor: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
