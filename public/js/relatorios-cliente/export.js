import { formatDatePtBr } from './utils.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadFirstAvailable(sources) {
  for (const src of sources) {
    if (!src) continue;
    try {
      await loadScript(src);
      return true;
    } catch (_) {
      // tenta a proxima fonte
    }
  }
  return false;
}

export async function ensurePdfLibs() {
  if (!window.jspdf?.jsPDF) {
    const loaded = await loadFirstAvailable([
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      '/js/jspdf.umd.min.js'
    ]);
    if (!loaded || !window.jspdf?.jsPDF) {
      throw new Error('Biblioteca de PDF indisponivel para exportacao');
    }
  }

  if (!window.jspdf?.jsPDF?.API?.autoTable) {
    await loadFirstAvailable([
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
      '/js/vendor/jspdf-autotable-shim.js'
    ]);
  }
}

export async function ensureExcelLib() {
  if (typeof window.ExcelJS !== 'undefined') return true;
  const loaded = await loadFirstAvailable([
    'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js'
  ]);
  return loaded && typeof window.ExcelJS !== 'undefined';
}

function fallbackCsvExport(detail, periodoLabel) {
  const cliente = detail?.cliente?.nome || 'Cliente';
  const kpis = detail?.kpis || {};
  const totais = detail?.totais || {};
  const produtos = Array.isArray(detail?.topProdutos) ? detail.topProdutos : [];
  const historico = Array.isArray(detail?.historico?.items) ? detail.historico.items : [];

  const rows = [
    ['Relatorio de Cliente', cliente],
    ['Periodo', periodoLabel],
    [],
    ['Indicador', 'Valor'],
    ['Quantidade de pedidos', String(kpis.quantidadePedidos || 0)],
    ['Primeiro pedido', String(formatDatePtBr(kpis.primeiroPedido))],
    ['Ultimo pedido', String(formatDatePtBr(kpis.ultimoPedido))],
    ['Total de itens', String(totais.itens || 0)],
    ['Total de pedidos no periodo', String(totais.pedidos || 0)],
    [],
    ['Top produtos'],
    ['Produto', 'Itens', 'Pedidos'],
    ...produtos.map(p => [String(p.produto || ''), String(p.quantidade || 0), String(p.pedidos || 0)]),
    [],
    ['Historico'],
    ['Data', 'Referencia', 'Status', 'Resumo', 'Itens'],
    ...historico.map(h => [
      formatDatePtBr(h.dataInicio),
      h.numeroVenda || `#${h.id}`,
      h.status || '',
      h.resumo || '',
      String(h.itens || 0)
    ])
  ];

  const csv = rows
    .map(row =>
      row
        .map(col => `"${String(col ?? '').replaceAll('"', '""')}"`)
        .join(';')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const safeName = String(cliente).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cliente';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-cliente-${safeName}.csv`;
  link.click();
}

export async function exportPdf(detail, periodoLabel) {
  await ensurePdfLibs();
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const cliente = detail?.cliente?.nome || 'Cliente';
  const kpis = detail?.kpis || {};
  const totais = detail?.totais || {};
  const produtos = Array.isArray(detail?.topProdutos) ? detail.topProdutos : [];
  const historico = Array.isArray(detail?.historico?.items) ? detail.historico.items : [];

  doc.setFontSize(16);
  doc.text('Relatorio de Cliente', 14, 18);
  doc.setFontSize(11);
  doc.text(`Cliente: ${cliente}`, 14, 26);
  doc.text(`Periodo: ${periodoLabel}`, 14, 32);

  doc.autoTable({
    startY: 38,
    head: [['Indicador', 'Valor']],
    body: [
      ['Quantidade de pedidos', String(kpis.quantidadePedidos || 0)],
      ['Primeiro pedido', String(formatDatePtBr(kpis.primeiroPedido))],
      ['Ultimo pedido', String(formatDatePtBr(kpis.ultimoPedido))],
      ['Total de itens', String(totais.itens || 0)],
      ['Total de pedidos no periodo', String(totais.pedidos || 0)]
    ]
  });

  doc.autoTable({
    head: [['Produto', 'Itens', 'Pedidos']],
    body: produtos.slice(0, 20).map(p => [String(p.produto || ''), String(p.quantidade || 0), String(p.pedidos || 0)])
  });

  doc.autoTable({
    head: [['Data', 'Referencia', 'Status', 'Resumo']],
    body: historico.map(h => [
      formatDatePtBr(h.dataInicio),
      h.numeroVenda || `#${h.id}`,
      h.status || '',
      h.resumo || ''
    ])
  });

  const safeName = String(cliente).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cliente';
  doc.save(`relatorio-cliente-${safeName}.pdf`);
}

export async function exportExcel(detail, periodoLabel) {
  const excelReady = await ensureExcelLib();
  if (!excelReady) {
    fallbackCsvExport(detail, periodoLabel);
    return;
  }

  const workbook = new window.ExcelJS.Workbook();
  const cliente = detail?.cliente?.nome || 'Cliente';
  const kpis = detail?.kpis || {};
  const totais = detail?.totais || {};
  const produtos = Array.isArray(detail?.topProdutos) ? detail.topProdutos : [];
  const historico = Array.isArray(detail?.historico?.items) ? detail.historico.items : [];

  const wsResumo = workbook.addWorksheet('Resumo');
  wsResumo.addRow(['Cliente', cliente]);
  wsResumo.addRow(['Periodo', periodoLabel]);
  wsResumo.addRow(['Quantidade de pedidos', Number(kpis.quantidadePedidos || 0)]);
  wsResumo.addRow(['Primeiro pedido', formatDatePtBr(kpis.primeiroPedido)]);
  wsResumo.addRow(['Ultimo pedido', formatDatePtBr(kpis.ultimoPedido)]);
  wsResumo.addRow(['Total de itens', Number(totais.itens || 0)]);
  wsResumo.addRow(['Total pedidos periodo', Number(totais.pedidos || 0)]);
  wsResumo.columns = [{ width: 28 }, { width: 46 }];

  const wsProdutos = workbook.addWorksheet('Produtos');
  wsProdutos.addRow(['Produto', 'Itens', 'Pedidos']);
  produtos.forEach(p => wsProdutos.addRow([p.produto || '', Number(p.quantidade || 0), Number(p.pedidos || 0)]));
  wsProdutos.columns = [{ width: 40 }, { width: 14 }, { width: 14 }];

  const wsHistorico = workbook.addWorksheet('Fichas');
  wsHistorico.addRow(['Data', 'Referencia', 'Status', 'Resumo', 'Itens']);
  historico.forEach(h => wsHistorico.addRow([
    formatDatePtBr(h.dataInicio),
    h.numeroVenda || `#${h.id}`,
    h.status || '',
    h.resumo || '',
    Number(h.itens || 0)
  ]));
  wsHistorico.columns = [{ width: 14 }, { width: 18 }, { width: 14 }, { width: 30 }, { width: 10 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = String(cliente).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cliente';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-cliente-${safeName}.xlsx`;
  link.click();
}

export function buildPeriodoLabel(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 'Periodo geral';
  return `${formatDatePtBr(dataInicio)} a ${formatDatePtBr(dataFim)}`;
}

export function setExportBusy(busy) {
  const buttons = [document.getElementById('btnExportPdfCliente'), document.getElementById('btnExportExcelCliente')].filter(Boolean);
  buttons.forEach(btn => {
    if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<i class="fas fa-spinner fa-spin"></i><span>Gerando...</span>'
      : btn.dataset.defaultHtml;
  });
}
