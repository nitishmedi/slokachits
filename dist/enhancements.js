(() => {
  const pdfLibrary = () => new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf);
    const existing = document.querySelector('script[data-sloka-pdf]');
    if (existing) return existing.addEventListener('load', () => resolve(window.jspdf), { once: true });
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.dataset.slokaPdf = 'true';
    script.onload = () => resolve(window.jspdf);
    script.onerror = () => reject(new Error('PDF library unavailable'));
    document.head.append(script);
  });

  const safePlanSlug = p => `sri-sloka-chitfund-${p.v === 100 ? '1-cr' : `${p.v}-lakhs`}-${p.d}-months${p.fixed ? '-fixed-amount' : ''}`;
  const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
  const downloadCsv = p => {
    const headings = p.payable ? ['Lifted month', 'Payable', 'Dividend', 'Auction discount', 'Amount receivable'] : ['Lifted month', 'Amount receivable'];
    const rows = Array.from({ length: p.d }, (_, i) => p.payable
      ? [i + 1, `Rs. ${inr(p.payable[i])}`, `Rs. ${inr(p.dividend[i])}`, `Rs. ${inr(p.auction[i])}`, `Rs. ${inr(p.r[i])}`]
      : [i + 1, `Rs. ${inr(p.r[i])}`]);
    const csv = [headings, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${safePlanSlug(p)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const downloadPdf = async p => {
    const button = document.querySelector('#downloadPlan');
    const previous = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Preparing PDF...'; }
    try {
      const { jsPDF } = await pdfLibrary();
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const standard = Boolean(p.payable);
      const headers = standard ? ['Lifted month', 'Payable', 'Dividend', 'Auction discount', 'Amount receivable'] : ['Lifted month', 'Amount receivable'];
      const widths = standard ? [28, 60, 51, 58, 73] : [55, 215];
      const rows = Array.from({ length: p.d }, (_, i) => standard
        ? [`${i + 1}`, `Rs. ${inr(p.payable[i])}`, `Rs. ${inr(p.dividend[i])}`, `Rs. ${inr(p.auction[i])}`, `Rs. ${inr(p.r[i])}`]
        : [`${i + 1}`, `Rs. ${inr(p.r[i])}`]);
      const perPage = standard ? 17 : 22;
      const header = page => {
        pdf.setFillColor(8, 46, 52); pdf.rect(0, 0, 297, 34, 'F');
        pdf.setTextColor(246, 241, 232); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.text('SRI SLOKA CHITFUND PRIVATE LIMITED', 14, 15);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text('Hyderabad - Est. 2016 | CIN: U67190TG2016PTC103617', 14, 22);
        pdf.setTextColor(8, 46, 52); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.text(`${planName(p)} - ${p.d} Month Plan`, 14, 45);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(85, 105, 100);
        pdf.text(p.fixed ? `Fixed amount plan - Before lifting: Rs. ${inr(p.p[0])}/month | After lifting: Rs. ${inr(p.p[1])}/month` : 'Lifted-month schedule', 14, 51);
        let x = 14; pdf.setFillColor(16, 73, 80); pdf.rect(14, 57, 270, 8, 'F'); pdf.setTextColor(246, 241, 232); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
        headers.forEach((label, i) => { pdf.text(label, x + 3, 62.1); x += widths[i]; });
      };
      const footer = page => {
        pdf.setDrawColor(201, 212, 208); pdf.line(14, 198, 284, 198); pdf.setTextColor(85, 105, 100); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
        pdf.text('Sri Sloka Chitfund Private Limited | admin@slokachits.com | +91 98488 92526', 14, 203);
        pdf.text(`Page ${page}`, 278, 203, { align: 'right' });
      };
      for (let page = 0; page < Math.ceil(rows.length / perPage); page++) {
        if (page) pdf.addPage();
        header(page + 1);
        rows.slice(page * perPage, (page + 1) * perPage).forEach((row, rowIndex) => {
          const y = 65 + rowIndex * 7.4; pdf.setFillColor(rowIndex % 2 ? 247 : 255, rowIndex % 2 ? 250 : 253, rowIndex % 2 ? 247 : 249); pdf.rect(14, y, 270, 7.4, 'F');
          let x = 14; pdf.setTextColor(8, 46, 52); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.2);
          row.forEach((value, i) => { pdf.text(value, x + (i ? widths[i] - 3 : 3), y + 4.8, { align: i ? 'right' : 'left' }); x += widths[i]; });
        });
        footer(page + 1);
      }
      pdf.save(`${safePlanSlug(p)}.pdf`);
    } catch (error) {
      alert('PDF could not be prepared. Please check your connection and try again.');
    } finally {
      if (button) { button.disabled = false; button.textContent = previous; }
    }
  };

  const originalShare = typeof shareSchedule === 'function' ? shareSchedule : null;
  window.openSchedule = p => {
    const standard = Boolean(p.payable);
    const rows = Array.from({ length: p.d }, (_, i) => standard
      ? `<tr><td>${i + 1}</td><td>Rs. ${inr(p.payable[i])}</td><td>Rs. ${inr(p.dividend[i])}</td><td>Rs. ${inr(p.auction[i])}</td><td>Rs. ${inr(p.r[i])}</td></tr>`
      : `<tr><td>${i + 1}</td><td>Rs. ${inr(p.r[i])}</td></tr>`).join('');
    const heads = standard ? '<thead><tr><th>Lifted month</th><th>Payable</th><th>Dividend</th><th>Auction discount</th><th>Amount receivable</th></tr></thead>' : '<thead><tr><th>Lifted month</th><th>Amount receivable</th></tr></thead>';
    dialogContent.innerHTML = `<p class="eyebrow">${planName(p).toUpperCase()} - ${p.d} MONTHS</p><h2>Lifted-month schedule</h2><p class="modal-copy">Share this plan, download a print-ready PDF, or scroll the complete schedule below.</p><div class="schedule-tools"><button id="sharePlan" type="button">Share plan</button><button id="downloadPlan" type="button">Download PDF</button><button id="csvPlan" type="button">CSV data</button><button id="fullPlan" type="button">Full screen</button></div><div class="table-wrap"><table>${heads}<tbody>${rows}</tbody></table></div><a class="button gold" href="${wa(p)}" target="_blank" rel="noopener">Ask about this group</a>`;
    document.querySelector('#sharePlan').onclick = () => originalShare?.(p);
    document.querySelector('#downloadPlan').onclick = () => downloadPdf(p);
    document.querySelector('#csvPlan').onclick = () => downloadCsv(p);
    document.querySelector('#fullPlan').onclick = () => dialogContent.requestFullscreen?.();
    scheduleDialog.showModal();
  };
  if (typeof render === 'function') render(document.querySelector('.filters .active')?.dataset.filter || 'all');
})();
