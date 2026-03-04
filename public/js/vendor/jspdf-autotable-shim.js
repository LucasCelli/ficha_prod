(function () {
  if (!window.jspdf || !window.jspdf.jsPDF) return;
  const API = window.jspdf.jsPDF.API || (window.jspdf.jsPDF.API = {});
  if (typeof API.autoTable === 'function') return;

  API.autoTable = function autoTableShim(options) {
    const cfg = options || {};
    const head = Array.isArray(cfg.head) && Array.isArray(cfg.head[0]) ? cfg.head[0] : [];
    const body = Array.isArray(cfg.body) ? cfg.body : [];

    const doc = this;
    let y = Number(cfg.startY) || 20;
    const rowHeight = 6;
    const colGap = 60;
    const left = 14;

    const drawRow = (row, isHeader) => {
      row.forEach((cell, index) => {
        const text = String(cell ?? '');
        doc.setFont(undefined, isHeader ? 'bold' : 'normal');
        doc.text(text, left + (index * colGap), y);
      });
      y += rowHeight;
    };

    if (head.length) drawRow(head, true);
    body.forEach(row => drawRow(Array.isArray(row) ? row : [row], false));
    return doc;
  };
})();
