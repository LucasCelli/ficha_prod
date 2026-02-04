/**
 * Relatórios e Estatísticas
 */

(function () {
  'use strict';

  let periodoAtual = 'mes';
  let relatorioAtual = null;

  document.addEventListener('DOMContentLoaded', async () => {
    await initRelatorios();
  });

  async function initRelatorios() {
    try {
      // Inicializar API
      await db.init();

      // Configurar event listeners
      initEventListeners();

      // Carregar relatório inicial
      await carregarRelatorio();

    } catch (error) {
      console.error('❌ Erro ao inicializar relatórios:', error);
      mostrarErro('Erro ao conectar com o servidor');
    }
  }

  function initEventListeners() {
    // Botões de período
    document.querySelectorAll('.btn-periodo').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const periodo = btn.dataset.periodo;
        periodoAtual = periodo;

        const customPeriod = document.getElementById('customPeriod');
        if (periodo === 'customizado') {
          customPeriod.style.display = 'block';
        } else {
          customPeriod.style.display = 'none';
          carregarRelatorio();
        }
      });
    });

    // Aplicar período customizado
    document.getElementById('btnAplicarPeriodo').addEventListener('click', () => {
      carregarRelatorio();
    });

    // Exportar
    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnImprimir').addEventListener('click', imprimirRelatorio);
  }

  async function carregarRelatorio() {
    try {
      let dataInicio = null;
      let dataFim = null;

      if (periodoAtual === 'customizado') {
        dataInicio = document.getElementById('relDataInicio').value;
        dataFim = document.getElementById('relDataFim').value;

        if (!dataInicio || !dataFim) {
          mostrarErro('Por favor, selecione as datas inicial e final');
          return;
        }
      }

      relatorioAtual = await db.buscarRelatorio(periodoAtual, dataInicio, dataFim);

      atualizarEstatisticas(relatorioAtual);
      atualizarVendedorDestaque(relatorioAtual);
      atualizarTaxaEntrega(relatorioAtual);

    } catch (error) {
      console.error('❌ Erro ao carregar relatório:', error);
      mostrarErro('Erro ao carregar relatório');
    }
  }

  function atualizarEstatisticas(dados) {
    document.getElementById('statPedidosEntregues').textContent = dados.fichasEntregues || 0;
    document.getElementById('statPedidosPendentes').textContent = dados.fichasPendentes || 0;
    document.getElementById('statItensConfeccionados').textContent = formatarNumero(dados.itensConfeccionados || 0);
    document.getElementById('statNovosClientes').textContent = dados.novosClientes || 0;
  }

  function atualizarVendedorDestaque(dados) {
    const nomeEl = document.getElementById('topVendedorNome');
    const statsEl = document.getElementById('topVendedorStats');

    if (dados.topVendedor) {
      nomeEl.textContent = dados.topVendedor;
      statsEl.textContent = `${dados.topVendedorTotal} ${dados.topVendedorTotal === 1 ? 'venda' : 'vendas'}`;
    } else {
      nomeEl.textContent = 'Nenhum vendedor';
      statsEl.textContent = '0 vendas';
    }
  }

  function atualizarTaxaEntrega(dados) {
    const entregues = dados.fichasEntregues || 0;
    const pendentes = dados.fichasPendentes || 0;
    const total = entregues + pendentes;

    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

    document.getElementById('taxaValue').textContent = `${taxa}%`;
    document.getElementById('taxaEntregues').textContent = entregues;
    document.getElementById('taxaTotal').textContent = total;

    const circle = document.getElementById('taxaProgress');
    const circumference = 283;
    const offset = circumference - (taxa / 100) * circumference;

    circle.style.strokeDashoffset = offset;

    if (taxa >= 80) {
      circle.style.stroke = '#10b981';
    } else if (taxa >= 50) {
      circle.style.stroke = '#f59e0b';
    } else {
      circle.style.stroke = '#ef4444';
    }
  }

  // ========== IMPRIMIR RELATÓRIO ==========
  function imprimirRelatorio() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    const periodo = getPeriodoNome();
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const entregues = relatorioAtual.fichasEntregues || 0;
    const pendentes = relatorioAtual.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

    // Criar janela de impressão com layout formatado
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Produção - ${periodo}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1f2937;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            color: #1e40af;
            margin-bottom: 8px;
        }
        .header .periodo {
            font-size: 18px;
            color: #6b7280;
        }
        .header .data-geracao {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 8px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .stat-card.green { border-left: 5px solid #10b981; }
        .stat-card.orange { border-left: 5px solid #f59e0b; }
        .stat-card.blue { border-left: 5px solid #3b82f6; }
        .stat-card.purple { border-left: 5px solid #8b5cf6; }
        .stat-card .label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .stat-card .value {
            font-size: 36px;
            font-weight: 700;
            color: #1f2937;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .two-columns {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        .info-box {
            background: #f9fafb;
            border-radius: 10px;
            padding: 20px;
        }
        .info-box .title {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .info-box .content {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
        }
        .info-box .subtitle {
            font-size: 14px;
            color: #9ca3af;
        }
        .taxa-box {
            text-align: center;
        }
        .taxa-valor {
            font-size: 48px;
            font-weight: 700;
            color: ${taxa >= 80 ? '#10b981' : taxa >= 50 ? '#f59e0b' : '#ef4444'};
        }
        .taxa-legenda {
            color: #6b7280;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body { padding: 20px; }
            .stat-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Relatório de Produção</h1>
        <div class="periodo">${periodo}</div>
        <div class="data-geracao">Gerado em: ${dataGeracao}</div>
    </div>

    <div class="stats-grid">
        <div class="stat-card green">
            <div class="label">Pedidos Entregues</div>
            <div class="value">${entregues}</div>
        </div>
        <div class="stat-card orange">
            <div class="label">Pedidos Pendentes</div>
            <div class="value">${pendentes}</div>
        </div>
        <div class="stat-card blue">
            <div class="label">Itens Confeccionados</div>
            <div class="value">${formatarNumero(relatorioAtual.itensConfeccionados || 0)}</div>
        </div>
        <div class="stat-card purple">
            <div class="label">Novos Clientes</div>
            <div class="value">${relatorioAtual.novosClientes || 0}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Detalhes</div>
        <div class="two-columns">
            <div class="info-box">
                <div class="title">🏆 Vendedor Destaque</div>
                <div class="content">${relatorioAtual.topVendedor || 'Nenhum'}</div>
                <div class="subtitle">${relatorioAtual.topVendedorTotal || 0} vendas no período</div>
            </div>
            <div class="info-box taxa-box">
                <div class="title">📈 Taxa de Entrega</div>
                <div class="taxa-valor">${taxa}%</div>
                <div class="taxa-legenda">${entregues} de ${total} pedidos entregues</div>
            </div>
        </div>
    </div>

    <div class="footer">
        Sistema de Fichas Técnicas • Relatório gerado automaticamente
    </div>

    <script>
        window.onload = function() {
            window.print();
            window.onafterprint = function() {
                window.close();
            };
        };
    </script>
</body>
</html>
    `);
    printWindow.document.close();
  }

  // ========== EXPORTAR PDF ==========
  async function exportarPDF() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    // Verificar se jsPDF está disponível
    if (typeof window.jspdf === 'undefined') {
      // Carregar jsPDF dinamicamente
      mostrarToast('Carregando biblioteca PDF...', 'info');

      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

      // Aguardar um pouco para a biblioteca inicializar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const periodo = getPeriodoNome();
      const dataGeracao = new Date().toLocaleString('pt-BR');
      const entregues = relatorioAtual.fichasEntregues || 0;
      const pendentes = relatorioAtual.fichasPendentes || 0;
      const total = entregues + pendentes;
      const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;

      // Configurar fonte
      doc.setFont('helvetica');

      // Cabeçalho
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Relatório de Produção', 105, 18, { align: 'center' });

      doc.setFontSize(12);
      doc.text(periodo, 105, 28, { align: 'center' });

      // Data de geração
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${dataGeracao}`, 105, 45, { align: 'center' });

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      // Estatísticas principais
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Resumo do Período', 20, 62);

      // Cards de estatísticas
      const cardY = 70;
      const cardWidth = 40;
      const cardHeight = 30;
      const cardGap = 5;

      // Card 1 - Entregues (verde)
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(20, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(8);
      doc.text('Entregues', 40, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(entregues), 40, cardY + 23, { align: 'center' });

      // Card 2 - Pendentes (laranja)
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(20 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(217, 119, 6);
      doc.setFontSize(8);
      doc.text('Pendentes', 40 + cardWidth + cardGap, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(pendentes), 40 + cardWidth + cardGap, cardY + 23, { align: 'center' });

      // Card 3 - Itens (azul)
      doc.setFillColor(219, 234, 254);
      doc.roundedRect(20 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(8);
      doc.text('Itens', 40 + (cardWidth + cardGap) * 2, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(relatorioAtual.itensConfeccionados || 0), 40 + (cardWidth + cardGap) * 2, cardY + 23, { align: 'center' });

      // Card 4 - Clientes (roxo)
      doc.setFillColor(237, 233, 254);
      doc.roundedRect(20 + (cardWidth + cardGap) * 3, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(8);
      doc.text('Novos Clientes', 40 + (cardWidth + cardGap) * 3, cardY + 10, { align: 'center' });
      doc.setFontSize(18);
      doc.text(String(relatorioAtual.novosClientes || 0), 40 + (cardWidth + cardGap) * 3, cardY + 23, { align: 'center' });

      // Vendedor Destaque
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Vendedor Destaque', 20, 120);

      doc.setFillColor(249, 250, 251);
      doc.roundedRect(20, 125, 80, 25, 3, 3, 'F');

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.text(relatorioAtual.topVendedor || 'Nenhum', 25, 137);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${relatorioAtual.topVendedorTotal || 0} vendas`, 25, 145);

      // Taxa de Entrega
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.text('Taxa de Entrega', 110, 120);

      doc.setFillColor(249, 250, 251);
      doc.roundedRect(110, 125, 80, 25, 3, 3, 'F');

      // Cor baseada na taxa
      if (taxa >= 80) {
        doc.setTextColor(16, 185, 129);
      } else if (taxa >= 50) {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(239, 68, 68);
      }

      doc.setFontSize(20);
      doc.text(`${taxa}%`, 150, 140, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${entregues} de ${total} pedidos`, 150, 148, { align: 'center' });

      // Rodapé
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, 190, 270);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text('Sistema de Fichas Técnicas - Relatório gerado automaticamente', 105, 280, { align: 'center' });

      // Salvar PDF
      const nomeArquivo = `relatorio-${periodo.replace(/[\s\/]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);

      mostrarToast('PDF exportado com sucesso!', 'success');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      mostrarErro('Erro ao gerar PDF. Tente novamente.');
    }
  }

  function carregarScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ========== EXPORTAR EXCEL ==========
  function exportarExcel() {
    if (!relatorioAtual) {
      mostrarErro('Nenhum relatório carregado');
      return;
    }

    const periodo = getPeriodoNome();
    const csv = [];

    csv.push(['RELATÓRIO DE PRODUÇÃO']);
    csv.push(['Período:', periodo]);
    csv.push(['Data de Geração:', new Date().toLocaleString('pt-BR')]);
    csv.push([]);
    csv.push(['RESUMO']);
    csv.push(['Pedidos Entregues:', relatorioAtual.fichasEntregues || 0]);
    csv.push(['Pedidos Pendentes:', relatorioAtual.fichasPendentes || 0]);
    csv.push(['Itens Confeccionados:', relatorioAtual.itensConfeccionados || 0]);
    csv.push(['Novos Clientes:', relatorioAtual.novosClientes || 0]);
    csv.push([]);
    csv.push(['VENDEDOR DESTAQUE']);
    csv.push(['Nome:', relatorioAtual.topVendedor || '-']);
    csv.push(['Vendas:', relatorioAtual.topVendedorTotal || 0]);
    csv.push([]);
    csv.push(['TAXA DE ENTREGA']);
    const entregues = relatorioAtual.fichasEntregues || 0;
    const pendentes = relatorioAtual.fichasPendentes || 0;
    const total = entregues + pendentes;
    const taxa = total > 0 ? Math.round((entregues / total) * 100) : 0;
    csv.push(['Taxa:', `${taxa}%`]);
    csv.push(['Entregues:', entregues]);
    csv.push(['Total:', total]);

    // Converter para CSV com separador de ponto e vírgula (melhor para Excel brasileiro)
    const csvContent = csv.map(row => row.join(';')).join('\n');

    // Adicionar BOM para UTF-8 (isso resolve o problema de encoding!)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${periodo.replace(/[\s\/]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    mostrarToast('Excel exportado com sucesso!', 'success');
  }

  function getPeriodoNome() {
    if (periodoAtual === 'mes') return 'Este Mês';
    if (periodoAtual === 'ano') return 'Este Ano';

    const inicio = document.getElementById('relDataInicio').value;
    const fim = document.getElementById('relDataFim').value;
    return `${formatarData(inicio)} a ${formatarData(fim)}`;
  }

  // ========== UTILITÁRIOS ==========

  function formatarNumero(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
  }

  function formatarData(dataStr) {
    if (!dataStr) return '-';

    try {
      const data = new Date(dataStr + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
    } catch {
      return dataStr;
    }
  }

  function mostrarSucesso(mensagem) {
    mostrarToast(mensagem, 'success');
  }

  function mostrarErro(mensagem) {
    mostrarToast(mensagem, 'error');
  }

})();