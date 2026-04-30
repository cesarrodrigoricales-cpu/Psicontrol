// ═══════════════════════════════════════════════
// HISTORIAL-ANIOS.JS — PsiControl
// ═══════════════════════════════════════════════

let anioSeleccionado = new Date().getFullYear();

async function renderHistorialAnios() {
  // Botones: resaltar el activo
  [2025,2024,2023,2022,2021,2020].forEach(a => {
    const btn = document.getElementById(`anio-btn-${a}`);
    if (!btn) return;
    const activo = a === anioSeleccionado;
    btn.style.background     = activo ? '#EEEDFE' : '';
    btn.style.color          = activo ? '#534AB7' : '';
    btn.style.borderColor    = activo ? '#CECBF6' : '';
    btn.style.fontWeight     = activo ? '700'     : '';
  });

  // Títulos
  const tChart = document.getElementById('anio-chart-title');
  const tTabla = document.getElementById('anio-tabla-title');
  if (tChart) tChart.textContent = `Atenciones por mes — ${anioSeleccionado}`;
  if (tTabla) tTabla.textContent = `Casos registrados — ${anioSeleccionado}`;

  renderStatsAnio();
  renderChartAnio();
  renderTablaAnio();
}

// ── Stats (tarjetas resumen) ─────────────────────────────────
function renderStatsAnio() {
  const contenedor = document.getElementById('anio-stats');
  if (!contenedor) return;

  const atenciones = store.atenciones.filter(a =>
    new Date(a.fechahora).getFullYear() === anioSeleccionado
  );

  const estudiantes = [...new Set(atenciones.map(a => a.idestudiante))];
  const graves      = atenciones.filter(a => a.nivelatencion === 'grave').length;
  const cerrados    = atenciones.filter(a => a.estado === 'cerrado').length;

  const cards = [
    { icon: '📋', valor: atenciones.length,    label: 'Atenciones totales' },
    { icon: '👥', valor: estudiantes.length,   label: 'Estudiantes atendidos' },
    { icon: '🔴', valor: graves,               label: 'Casos graves' },
    { icon: '✅', valor: cerrados,             label: 'Casos cerrados' },
  ];

  contenedor.innerHTML = cards.map(c => `
    <div class="card" style="padding:18px 20px;display:flex;align-items:center;gap:14px;">
      <div style="font-size:28px;">${c.icon}</div>
      <div>
        <div style="font-size:24px;font-weight:700;color:var(--text-primary);line-height:1;">${c.valor}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${c.label}</div>
      </div>
    </div>
  `).join('');
}

// ── Gráfico de barras por mes ────────────────────────────────
function renderChartAnio() {
  const contenedor = document.getElementById('anio-chart');
  if (!contenedor) return;

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
  const conteo = Array(12).fill(0);

  store.atenciones
    .filter(a => new Date(a.fechahora).getFullYear() === anioSeleccionado)
    .forEach(a => { conteo[new Date(a.fechahora).getMonth()]++; });

  const total = conteo.reduce((s, n) => s + n, 0);

  if (total === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
        📭 Sin atenciones registradas en ${anioSeleccionado}
      </div>`;
    return;
  }

  const max = Math.max(...conteo, 1);

  contenedor.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:6px;height:120px;">
      ${conteo.map((n, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:default;"
             title="${meses[i]}: ${n} atención(es)">
          <div style="font-size:10px;font-weight:600;color:${n>0?'var(--text-primary)':'transparent'};">${n||''}</div>
          <div style="
            width:100%;
            border-radius:5px 5px 0 0;
            background:${n>0 ? 'linear-gradient(180deg,#7B74E0,#534AB7)' : 'var(--color-border-secondary)'};
            height:${Math.max((n/max)*80, n>0?6:2)}px;
            transition:height .4s ease;
            box-shadow:${n>0?'0 2px 6px rgba(83,74,183,.25)':'none'};
          "></div>
          <div style="font-size:10px;color:var(--text-muted);">${meses[i]}</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:10px;font-size:12px;color:var(--text-muted);text-align:right;">
      Total del año: <b style="color:var(--text-primary);">${total} atenciones</b>
    </div>`;
}

// ── Tabla de casos ────────────────────────────────────────────
function renderTablaAnio(filtro = '') {
  const tbody = document.getElementById('anio-tbody');
  if (!tbody) return;

  let atenciones = store.atenciones.filter(a =>
    new Date(a.fechahora).getFullYear() === anioSeleccionado
  );

  if (filtro) {
    const f = filtro.toLowerCase();
    atenciones = atenciones.filter(a => {
      const est    = store.estudiantes.find(e => e.id == a.idestudiante);
      const nombre = est ? `${est.nombres} ${est.apellidos}`.toLowerCase() : '';
      const motivo = (a.motivoconsulta || a.motivo || '').toLowerCase();
      return nombre.includes(f) || motivo.includes(f);
    });
  }

  if (atenciones.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="es-icon">📭</div>
          <div class="es-text">Sin casos en ${anioSeleccionado}</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = atenciones
    .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))
    .map(a => {
      const est    = store.estudiantes.find(e => e.id == a.idestudiante);
      const nombre = est ? `${est.apellidos}, ${est.nombres}` : '—';
      const dni    = est?.dni  || '—';
      const grado  = (a.grado  || est?.grado)
                   ? (a.grado  || est?.grado) + '°' : '—';
      const motivo = a.motivoconsulta || a.motivo || '—';

      return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="td-avatar ${colorAvatar((est?.nombres||'') + (est?.apellidos||''))}">
              ${est ? initials(est.nombres + ' ' + est.apellidos) : '?'}
            </div>
            <b>${nombre}</b>
          </div>
        </td>
        <td>${dni}</td>
        <td>${grado}</td>
        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${motivo}">${motivo}</td>
        <td>${nivelBadge(a.nivelatencion)}</td>
        <td>${fmtFecha(a.fechahora)}</td>
        <td>${estadoBadge(a.estado)}</td>
      </tr>`;
    }).join('');
}

// ── Buscador ─────────────────────────────────────────────────
function filtrarAnio(q) {
  renderTablaAnio(q);
}

// ── Cambiar año ───────────────────────────────────────────────
function seleccionarAnio(anio) {
  anioSeleccionado = parseInt(anio);
  renderHistorialAnios();
}

// ── Exportar a Excel ─────────────────────────────────────────
function exportarAnio() {
  const atenciones = store.atenciones.filter(a =>
    new Date(a.fechahora).getFullYear() === anioSeleccionado
  );

  if (atenciones.length === 0) {
    toast(`⚠ Sin datos para exportar en ${anioSeleccionado}`, 'warning');
    return;
  }

  const filas = atenciones
    .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))
    .map(a => {
      const est = store.estudiantes.find(e => e.id == a.idestudiante);
      return {
        'Estudiante' : est ? `${est.apellidos}, ${est.nombres}` : '—',
        'DNI'        : est?.dni || '—',
        'Grado'      : (a.grado || est?.grado) ? (a.grado || est?.grado) + '°' : '—',
        'Sección'    : a.seccion || est?.seccion || '—',
        'Motivo'     : a.motivoconsulta || a.motivo || '—',
        'Nivel'      : a.nivelatencion  || '—',
        'Fecha'      : fmtFecha(a.fechahora),
        'Estado'     : a.estado || '—'
      };
    });

  const ws = XLSX.utils.json_to_sheet(filas);

  // Ancho de columnas
  ws['!cols'] = [
    {wch:30},{wch:12},{wch:8},{wch:8},{wch:28},{wch:10},{wch:14},{wch:12}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Atenciones ${anioSeleccionado}`);
  XLSX.writeFile(wb, `PsiControl_${anioSeleccionado}.xlsx`);
  toast(`✅ Exportado: PsiControl_${anioSeleccionado}.xlsx`);
}