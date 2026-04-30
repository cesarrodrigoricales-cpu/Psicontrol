// ═══════════════════════════════════════════════
// REPORTES.JS — Estadísticas y generación de PDF
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

function renderReportes() {
  const total    = store.estudiantes.filter(e =>
    store.atenciones.some(a => a.idestudiante === e.id)
  ).length;
  const activos  = store.atenciones.filter(a => a.estado === 'activo').length;
  const pend     = store.atenciones.filter(a => a.estado === 'pendiente').length;
  const cerrados = store.atenciones.filter(a => a.estado === 'cerrado').length;

  const statsEl = document.getElementById('rep-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon c-purple">👥</div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total estudiantes atendidos</div></div></div>
      <div class="stat-card"><div class="stat-icon c-teal">✅</div><div class="stat-body"><div class="stat-value">${activos}</div><div class="stat-label">Atenciones activas</div></div></div>
      <div class="stat-card"><div class="stat-icon c-amber">⏳</div><div class="stat-body"><div class="stat-value">${pend}</div><div class="stat-label">Pendientes</div></div></div>
      <div class="stat-card"><div class="stat-icon c-rose">📊</div><div class="stat-body"><div class="stat-value">${cerrados}</div><div class="stat-label">Cerradas</div></div></div>`;
  }

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const vals  = new Array(12).fill(0);
  store.atenciones.forEach(a => {
    if (a.fechahora) {
      const mes = new Date(a.fechahora).getMonth();
      vals[mes]++;
    }
  });

  const max     = Math.max(...vals, 1);
  const chartEl = document.getElementById('chart-area');
  if (chartEl) {
    chartEl.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:12px;height:120px;">
        ${meses.map((m, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${vals[i]}</div>
            <div style="width:100%;background:${vals[i] > 0 ? 'var(--accent)' : 'var(--accent-soft)'};border-radius:6px 6px 0 0;height:${Math.round((vals[i]/max)*90)+10}px;transition:height .5s ease;"></div>
            <div style="font-size:11px;color:var(--text-muted);">${m}</div>
          </div>`).join('')}
      </div>`;
  }

  renderProgBars('rep-prog', [
    { label:'Tasa de atención activa',     val: Math.round(activos  / Math.max(store.atenciones.length, 1) * 100), color:'var(--teal)'   },
    { label:'Cobertura de estudiantes',    val: Math.min(Math.round(total / Math.max(store.estudiantes.length, 1) * 100), 100),            color:'var(--accent)' },
    { label:'Atenciones cerradas',         val: Math.round(cerrados / Math.max(store.atenciones.length, 1) * 100), color:'var(--amber)'  },
  ]);
}

async function generarReporte() {
  if (typeof window.jspdf === 'undefined') {
    toast('jsPDF no está cargado. Verifica la librería.', 'warning');
    return;
  }

  const { jsPDF } = window.jspdf;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const conteoMeses = new Array(12).fill(0);

  store.atenciones.forEach(a => {
    if (a.fechahora) conteoMeses[new Date(a.fechahora).getMonth()]++;
  });

  const canvas = document.getElementById('graficoPDF');
  if (!canvas) {
    toast('Canvas no encontrado para generar gráfico', 'warning');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (window.miGrafico) window.miGrafico.destroy();

  window.miGrafico = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Atenciones por mes',
        data: conteoMeses,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });

  setTimeout(() => {
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF();

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Reporte Mensual - PsiControl', 20, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Atenciones por mes', 20, 45);
    doc.addImage(imgData, 'PNG', 15, 55, 180, 100);

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Sistema PsiControl - Análisis mensual', 20, 285);

    doc.save('reporte_mensual.pdf');

    store.reportes++;
    agregarActividad('amber', '📊', 'Reporte mensual generado', 'Ahora');
    renderDashboard();
    toast('Reporte generado correctamente 📈');
    navigateTo('reportes');
  }, 500);
}