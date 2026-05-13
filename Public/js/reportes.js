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

async function generarReporte(nivel = 'todos') {
  const { jsPDF }   = window.jspdf;
  const html2canvas = window.html2canvas;

  if (!jsPDF || !html2canvas) {
    toast('Faltan librerías (jsPDF o html2canvas)', 'warning');
    return;
  }

  // ── Filtrar solo estudiantes ATENDIDOS por nivel ──
  let estudiantes = store.estudiantes.filter(e =>
    store.atenciones.some(a => a.idestudiante === e.id)
  );

  if (nivel === 'primaria')
    estudiantes = estudiantes.filter(e => e.nivel?.toLowerCase() === 'primaria');
  if (nivel === 'secundaria')
    estudiantes = estudiantes.filter(e => e.nivel?.toLowerCase() === 'secundaria');

  if (estudiantes.length === 0) {
    toast(`Sin estudiantes atendidos de ${nivel} para reportar`, 'warning');
    return;
  }

  // ── Filtrar atenciones de esos estudiantes ──
  const idsEstudiantes = estudiantes.map(e => e.id);
  const atenciones = store.atenciones.filter(a =>
    idsEstudiantes.includes(a.idestudiante)
  );

  // ── Crear iframe oculto ──
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;';
  document.body.appendChild(iframe);

  iframe.src = 'reporte/index.html';
  iframe.onload = async () => {
    const fecha = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    iframe.contentWindow.llenarReporte({
      nivel:      nivel === 'todos' ? 'General' : nivel.charAt(0).toUpperCase() + nivel.slice(1),
      fecha,
      psicologo:  store.config?.psicologo || '',
      estudiantes,
      atenciones
    });

    setTimeout(async () => {
      const canvas = await html2canvas(iframe.contentDocument.body, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ unit: 'px', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      doc.addImage(imgData, 'PNG', 0, 0, w, h);
      doc.save(`reporte_${nivel}_${new Date().getFullYear()}.pdf`);
      document.body.removeChild(iframe);
      toast(`Reporte ${nivel} generado ✅`);
      store.reportes++;
      renderDashboard();
    }, 1000);
  };
}