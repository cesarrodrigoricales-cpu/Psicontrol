// ═══════════════════════════════════════════════
// REPORTES.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

function renderReportes() {
  // ── Atenciones por mes (año actual) ──────────
  const anioActual = new Date().getFullYear();
  const conteoMes  = Array(12).fill(0);
  store.atenciones
    .filter(a => new Date(a.fechahora).getFullYear() === anioActual)
    .forEach(a => { conteoMes[new Date(a.fechahora).getMonth()]++; });

  const max    = Math.max(...conteoMes, 1);
  const labels = ['E','F','M','A','M','J','J','A','S','O','N','D'];

  const barEl = document.getElementById('bar-chart-wrap');
  if (barEl) {
    barEl.innerHTML = `
      <div class="bar-row">
        ${conteoMes.map((v, i) => `
          <div class="bar-col">
            <div class="bar-val">${v || ''}</div>
            <div class="bar" style="height:${Math.max((v / max) * 110, v > 0 ? 4 : 2)}px;
                  background:${v > 0 ? '#3B5BDB' : 'var(--border)'};"></div>
          </div>`).join('')}
      </div>
      <div class="bar-label-row">${labels.map(l => `<div class="bar-lbl">${l}</div>`).join('')}</div>`;
  }

  // ── Por grado (1° a 6°) ───────────────────────
  const porGrado = {};
  store.atenciones.forEach(a => {
    const est = getEst(a.idestudiante);
    const g   = est?.grado ? est.grado + '°' : (a.grado ? a.grado + '°' : 'Sin grado');
    porGrado[g] = (porGrado[g] || 0) + 1;
  });
  const totalG  = store.atenciones.length || 1;
  const colores = ['var(--accent)','var(--amber)','var(--rose)','var(--green)','#7D93F5','var(--text3)'];

  const gradeEl = document.getElementById('grade-prog-wrap');
  if (gradeEl) {
    gradeEl.innerHTML = Object.entries(porGrado)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([g, n], i) => `
        <div class="prog-item">
          <div class="prog-label-row">
            <span class="prog-label">${g}</span>
            <span class="prog-pct">${Math.round((n / totalG) * 100)}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${Math.round((n / totalG) * 100)}%;background:${colores[i]};"></div>
          </div>
        </div>`).join('');
  }

  // ── Indicadores clave ─────────────────────────
  const indEl = document.getElementById('rep-ind-grid');
  if (indEl) {
    indEl.innerHTML = [
      { v: store.atenciones.length,                                                                    l: 'Total atenciones' },
      { v: store.estudiantes.length,                                                                   l: 'Estudiantes atendidos' },
      { v: store.atenciones.filter(a => a.estado === 'activo').length,                                l: 'Casos activos' },
      { v: store.atenciones.filter(a => a.nivelatencion === 'urgente' || a.nivelatencion === 'grave').length, l: 'Casos urgentes' },
    ].map(i => `
      <div class="rep-ind">
        <div class="rep-ind-val">${i.v}</div>
        <div class="rep-ind-lbl">${i.l}</div>
      </div>`).join('');
  }

  // ── Motivos de consulta ───────────────────────
  const motivosEl = document.getElementById('motivos-prog');
  if (motivosEl) {
    const mc = {};
    store.atenciones.forEach(a => {
      const m = (a.motivoconsulta || a.motivo || 'Otro').split(' ').slice(0, 2).join(' ');
      mc[m] = (mc[m] || 0) + 1;
    });
    const totalM = store.atenciones.length || 1;
    motivosEl.innerHTML = Object.entries(mc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, n], i) => `
        <div class="prog-item">
          <div class="prog-label-row">
            <span class="prog-label">${label}</span>
            <span class="prog-pct">${Math.round((n / totalM) * 100)}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${Math.round((n / totalM) * 100)}%;background:${colores[i]};"></div>
          </div>
        </div>`).join('');
  }
}