// ═══════════════════════════════════════════════
// CONFIG.JS — Configuración, horario y reportes
// ═══════════════════════════════════════════════

// ── CONFIGURACIÓN DEL CONSULTORIO ──────────────

function cargarConfig() {
  const configFields = {
    'cfg-nombre':    'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel':       'tel',
    'cfg-email':     'email',
    'cfg-dir':       'dir'
  };
  Object.entries(configFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = store.config[key] || '';
  });
}

function guardarConfig() {
  const configFields = {
    'cfg-nombre':    'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel':       'tel',
    'cfg-email':     'email',
    'cfg-dir':       'dir'
  };
  store.config = {};
  Object.entries(configFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) store.config[key] = el.value;
  });
  toast('Configuración guardada');
}

// ── HORARIO DE ATENCIÓN ─────────────────────────

const days = [
  { key:'lun', label:'Lunes',     active:true,  from:'08:00', to:'17:00' },
  { key:'mar', label:'Martes',    active:true,  from:'08:00', to:'17:00' },
  { key:'mie', label:'Miércoles', active:true,  from:'08:00', to:'17:00' },
  { key:'jue', label:'Jueves',    active:true,  from:'08:00', to:'17:00' },
  { key:'vie', label:'Viernes',   active:true,  from:'08:00', to:'14:00' },
  { key:'sab', label:'Sábado',    active:false, from:'09:00', to:'12:00' },
  { key:'dom', label:'Domingo',   active:false, from:'09:00', to:'12:00' },
];

function buildSchedule() {
  const wrap = document.getElementById('schedule-rows');
  if (!wrap) return;

  wrap.innerHTML = days.map((d, i) => `
    <div class="schedule-row" style="background:${i%2===0?'var(--bg)':'transparent'};border-radius:8px;padding:4px 0;">
      <span class="day-label">${d.label}</span>
      <input type="time" value="${d.from}" id="from-${d.key}"
        onchange="updateScheduleTime('${d.key}', 'from', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <input type="time" value="${d.to}" id="to-${d.key}"
        onchange="updateScheduleTime('${d.key}', 'to', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <div class="toggle-switch ${d.active?'on':''}" id="tog-${d.key}" onclick="toggleDay('${d.key}', ${i})"></div>
    </div>
  `).join('');
}

function updateScheduleTime(key, type, value) {
  const day = days.find(d => d.key === key);
  if (day) day[type] = value;
}

function toggleDay(key, i) {
  if (i >= days.length) return;

  days[i].active = !days[i].active;
  const tog  = document.getElementById('tog-'+key);
  const from = document.getElementById('from-'+key);
  const to   = document.getElementById('to-'+key);

  if (tog) tog.classList.toggle('on', days[i].active);
  [from, to].forEach(el => {
    if (el) {
      el.style.opacity       = days[i].active ? '1' : '.35';
      el.style.pointerEvents = days[i].active ? '' : 'none';
    }
  });
}

// ── REPORTES ────────────────────────────────────

function renderReportes() {
  const total    = store.estudiantes.length;
  const activos  = store.atenciones.filter(a => a.estado === 'activo').length;
  const pend     = store.atenciones.filter(a => a.estado === 'pendiente').length;
  const cerrados = store.atenciones.filter(a => a.estado === 'cerrado').length;

  const statsEl = document.getElementById('rep-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon c-purple">👥</div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total estudiantes</div></div></div>
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
    { label:'Tasa de atención activa',  val: Math.round(activos / Math.max(store.atenciones.length, 1) * 100), color:'var(--teal)' },
    { label:'Cobertura de estudiantes', val: Math.min(Math.round(total / 20 * 100), 100), color:'var(--accent)' },
    { label:'Atenciones cerradas',      val: Math.round(cerrados / Math.max(store.atenciones.length, 1) * 100), color:'var(--amber)' },
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