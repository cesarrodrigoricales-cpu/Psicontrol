// ═══════════════════════════════════════════════
// SCRIPT-PRIMARY.JS — PsiControl · Primaria
// Conectado al mismo backend MySQL que Secundaria
// ═══════════════════════════════════════════════

// ── API BASE ─────────────────────────────────────
const API = 'http://localhost:3000/api';

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  } catch (err) {
    toast('Error de conexión: ' + err.message);
    throw err;
  }
}

// ── STORE GLOBAL ──────────────────────────────────
window.store = {
  atenciones:  [],
  estudiantes: [],
  actividad: [
    { tipo: 'purple', icon: '📝', texto: 'Sistema iniciado correctamente', tiempo: 'Ahora' },
  ],
  reportes: 0,
};

// ── CARGAR DATOS DESDE API ────────────────────────
async function cargarDatos() {
  try {
    const [atenciones, estudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = atenciones  || [];
    store.estudiantes = estudiantes || [];
    initDashboard();
    populateEstSelect('ms-estudiante');
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }
}

// ═══════════════════════════════════
//   NAVIGATION
// ═══════════════════════════════════
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  const ni = document.querySelector(`.nav-item[onclick="goPage('${id}')"]`);
  if (ni) ni.classList.add('active');
  const titles = {
    dashboard:  'Panel de control',
    historial:  'Historial de estudiantes',
    atenciones: 'Atenciones',
    nuevo:      'Nueva atención',
    reportes:   'Reportes',
    calendario: 'Calendario',
    config:     'Configuración'
  };
  const bc = document.getElementById('bc-text');
  if (bc) bc.textContent = titles[id] || id;

  if (id === 'historial')   renderHistorial();
  if (id === 'atenciones')  renderCitas('todas');
  if (id === 'reportes')    renderReportes();
  if (id === 'calendario')  renderCalendario();
  if (id === 'config')      renderConfig();
  if (id === 'nuevo') {
    const f = document.getElementById('na-fecha');
    if (f) f.value = hoy();
    resetPasos();
  }
}

// ═══════════════════════════════════
//   UTILS
// ═══════════════════════════════════
function hoy() {
  return new Date().toISOString().split('T')[0];
}

function fmtFecha(str) {
  if (!str) return '—';
  const part = str.includes('T') ? str.split('T')[0] : str;
  const [y, m, d] = part.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function fmtHora(str) {
  if (!str) return '—';
  if (str.includes('T')) {
    const t = str.split('T')[1];
    return t ? t.substring(0, 5) : '—';
  }
  return str.substring(0, 5);
}

function nombreCompleto(e) {
  return (e.nombres || '') + ' ' + (e.apellidos || '');
}

function iniciales(e) {
  const n = e.nombres || '';
  const a = e.apellidos || '';
  return (n[0] + (a[0] || '')).toUpperCase();
}

function getEst(id) {
  return store.estudiantes.find(e => e.id == id);
}

function nivelBadge(n) {
  if (n === 'urgente' || n === 'grave')
    return '<span class="badge-status b-urgente">🔴 Urgente</span>';
  if (n === 'moderado')
    return '<span class="badge-status b-activo">🟡 Moderado</span>';
  return '<span class="badge-status b-cerrado">🟢 Leve</span>';
}

function estadoBadge(e) {
  if (e === 'pendiente') return '<span class="badge-status b-pendiente">⏳ Pendiente</span>';
  if (e === 'activo')    return '<span class="badge-status b-activo">✅ Activo</span>';
  return '<span class="badge-status b-cerrado">🔒 Cerrado</span>';
}

function toast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ═══════════════════════════════════
//   DASHBOARD
// ═══════════════════════════════════
function initDashboard() {
  const today = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const fechaEl = document.getElementById('fecha-hoy');
  if (fechaEl) fechaEl.textContent = `${dias[today.getDay()]}, ${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;

  const citasEl = document.getElementById('dash-fecha-citas');
  if (citasEl) citasEl.textContent = 'Sesiones registradas recientemente';

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente');
  const activas    = store.atenciones.filter(a => a.estado === 'activo');
  const urgentes   = store.atenciones.filter(a =>
    (a.nivelatencion === 'urgente' || a.nivelatencion === 'grave') && a.estado !== 'cerrado'
  );

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('s-estudiantes', store.estudiantes.length);
  set('s-pendientes',  pendientes.length);
  set('s-activas',     activas.length);
  set('s-urgentes',    urgentes.length);
  set('nb-hist',       store.estudiantes.length);
  set('nb-citas',      pendientes.length);

  // Atenciones recientes
  const apptEl = document.getElementById('dash-appt-list');
  if (apptEl) {
    const rec = [...store.atenciones]
      .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))
      .slice(0, 4);

    apptEl.innerHTML = rec.length ? rec.map(a => {
      const est = getEst(a.idestudiante);
      const nombre = est ? nombreCompleto(est) : (a.paciente || '—');
      const ini    = est ? iniciales(est) : '?';
      return `<div class="activity-item">
        <div style="width:36px;height:36px;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ini}</div>
        <div class="act-text"><strong>${nombre}</strong><br>${a.motivoconsulta || a.motivo || '—'}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <div class="act-time">${fmtFecha(a.fechahora)}</div>
          ${estadoBadge(a.estado)}
        </div>
      </div>`;
    }).join('')
    : '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div>';
  }

  // Activity feed — últimas 4 atenciones como actividad
  const actEl = document.getElementById('activity-feed');
  if (actEl) {
    const acts = store.actividad.slice(0, 5);
    actEl.innerHTML = acts.map(a => `
      <div class="activity-item">
        <div class="act-dot" style="background:var(--${a.tipo || 'accent'});"></div>
        <div class="act-text">${a.texto}</div>
        <div class="act-time">${a.tiempo}</div>
      </div>`).join('');
  }

  // Motivos (calculados desde datos reales)
  const motivos = calcularMotivos();
  const progEl = document.getElementById('prog-wrap');
  if (progEl) {
    progEl.innerHTML = motivos.map(m => `
      <div class="prog-item">
        <div class="prog-label-row">
          <span class="prog-label">${m.label}</span>
          <span class="prog-pct">${m.pct}%</span>
        </div>
        <div class="prog-track">
          <div class="prog-fill" style="width:${m.pct}%;background:${m.color};"></div>
        </div>
      </div>`).join('');
  }
}

function calcularMotivos() {
  const total = store.atenciones.length || 1;
  const conteo = {};
  store.atenciones.forEach(a => {
    const m = (a.motivoconsulta || a.motivo || 'Otro').split(' ').slice(0, 2).join(' ');
    conteo[m] = (conteo[m] || 0) + 1;
  });
  const colores = ['var(--rose)', 'var(--amber)', 'var(--accent)', 'var(--green)', 'var(--text3)'];
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, n], i) => ({
      label,
      pct: Math.round((n / total) * 100),
      color: colores[i] || 'var(--text3)'
    }));
}

// ═══════════════════════════════════
//   HISTORIAL
// ═══════════════════════════════════
async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text3);">Cargando...</td></tr>';

  try {
    const [todasAtenciones, todosEstudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = todasAtenciones  || [];
    store.estudiantes = todosEstudiantes || [];

    const idsConAtencion = [...new Set(store.atenciones.map(a => a.idestudiante))];
    let lista = store.estudiantes.filter(e => idsConAtencion.includes(e.id));

    if (filtro) {
      const f = filtro.toLowerCase();
      lista = lista.filter(e =>
        nombreCompleto(e).toLowerCase().includes(f) ||
        (e.dni || '').includes(f)                   ||
        (e.grado || '').toString().includes(f)      ||
        (e.seccion || '').toLowerCase().includes(f)
      );
    }

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📋</div><div class="es-text">Sin estudiantes</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(e => {
      const ults = store.atenciones
        .filter(a => a.idestudiante == e.id)
        .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))[0];

      const gradoMostrar = e.grado ? `${e.grado}` : '—';

      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${iniciales(e)}</div>
          <span style="font-weight:600;color:var(--text);">${nombreCompleto(e)}</span>
        </div></td>
        <td>${e.dni || '—'}</td>
        <td><span class="grado-badge">📚 ${gradoMostrar}</span></td>
        <td>${e.seccion || '—'}</td>
        <td>${e.telefono || '—'}</td>
        <td>${ults ? fmtFecha(ults.fechahora) : '—'}</td>
        <td><button class="action-btn" onclick="verEstudiante(${e.id})">Ver expediente</button></td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Error renderizando historial:', err);
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
  }
}

function filtrarHistorial(q) {
  renderHistorial(q);
}

// ═══════════════════════════════════
//   VER ESTUDIANTE
// ═══════════════════════════════════
function verEstudiante(id) {
  const e = getEst(id);
  if (!e) return;
  const sesiones = store.atenciones
    .filter(a => a.idestudiante == id)
    .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora));

  const tituloEl = document.getElementById('me-titulo');
  const bodyEl   = document.getElementById('me-body');
  if (tituloEl) tituloEl.textContent = 'Expediente — ' + nombreCompleto(e);
  if (bodyEl) bodyEl.innerHTML = `
    <div class="student-profile">
      <div class="sp-header">
        <div class="sp-avatar">${iniciales(e)}</div>
        <div>
          <div class="sp-name">${nombreCompleto(e)}</div>
          <div class="sp-grade">${e.grado || '—'} — Sección ${e.seccion || '—'}</div>
        </div>
      </div>
      <div class="sp-grid">
        <div class="sp-cell"><div class="sp-cell-label">DNI</div><div class="sp-cell-val">${e.dni || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Teléfono</div><div class="sp-cell-val">${e.telefono || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Género</div><div class="sp-cell-val">${e.genero || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Nacimiento</div><div class="sp-cell-val">${fmtFecha(e.fechanac)}</div></div>
      </div>
      <div class="sp-sessions">
        <div class="sp-sess-title">Historial de sesiones (${sesiones.length})</div>
        ${sesiones.length
          ? sesiones.map(s => `
            <div class="sp-sess-item">
              <div style="flex:1;">
                <div style="font-weight:600;color:var(--text);font-size:12.5px;">${s.motivoconsulta || s.motivo || '—'}</div>
                <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">${fmtFecha(s.fechahora)} · ${fmtHora(s.fechahora)}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                ${nivelBadge(s.nivelatencion)} ${estadoBadge(s.estado)}
              </div>
            </div>`).join('')
          : '<div style="color:var(--text3);font-size:13px;">Sin sesiones registradas.</div>'
        }
      </div>
    </div>`;
  openModal('modal-estudiante');
}

// ═══════════════════════════════════
//   ATENCIONES
// ═══════════════════════════════════
let citaFiltro = 'todas';

async function renderCitas(filtro) {
  citaFiltro = filtro;

  try {
    const data = await apiFetch(`${API}/atenciones`);
    store.atenciones = data || [];
  } catch (_) {}

  let lista;
  if (filtro === 'todas')   lista = store.atenciones.filter(a => a.estado !== 'cerrado');
  else if (filtro === 'cerrado') lista = store.atenciones.filter(a => a.estado === 'cerrado');
  else                      lista = store.atenciones.filter(a => a.estado === filtro);

  const tbody = document.getElementById('citas-tbody');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div></td></tr>';
    return;
  }

  const sorted = [...lista].sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora));

  tbody.innerHTML = sorted.map(a => {
    const est    = getEst(a.idestudiante);
    const nombre = est ? nombreCompleto(est) : (a.paciente || '—');
    const ini    = est ? iniciales(est) : '?';
    const grado  = est?.grado || a.grado || '—';

    return `<tr>
      <td>${fmtFecha(a.fechahora)}</td>
      <td>${fmtHora(a.fechahora)}</td>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${ini}</div>
        ${nombre}
      </div></td>
      <td><span class="grado-badge">${grado}</span></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.motivoconsulta || a.motivo || '—'}</td>
      <td>${nivelBadge(a.nivelatencion)}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          ${est ? `<button class="action-btn" onclick="verEstudiante(${est.id})">Ver</button>` : ''}
          <button class="action-btn danger" onclick="eliminarAtencion(${a.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filtrarCitas(f) { renderCitas(f); }

async function eliminarAtencion(id) {
  if (!confirm('¿Eliminar esta atención?')) return;
  try {
    await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });
    store.atenciones = store.atenciones.filter(a => a.id !== id);
    renderCitas(citaFiltro);
    initDashboard();
    toast('🗑 Atención eliminada');
  } catch (err) {
    console.error('Error eliminando:', err);
  }
}

// ── Modal sesión rápida ───────────────────────────
function populateEstSelect(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    store.estudiantes.map(e =>
      `<option value="${e.id}">${nombreCompleto(e)} — ${e.grado || ''}</option>`
    ).join('');
}

async function guardarSesion() {
  const estId  = parseInt(document.getElementById('ms-estudiante')?.value);
  const motivo = document.getElementById('ms-motivo')?.value?.trim();
  const fecha  = document.getElementById('ms-fecha')?.value;
  const hora   = document.getElementById('ms-hora')?.value;

  if (!estId || !motivo || !fecha || !hora) {
    toast('⚠️ Completa todos los campos obligatorios');
    return;
  }

  const est = getEst(estId);
  try {
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante:  estId,
        fechahora:     `${fecha}T${hora}:00`,
        estado:        document.getElementById('ms-estado')?.value || 'pendiente',
        nivelatencion: document.getElementById('ms-nivel')?.value  || 'moderado',
        idmotivo:      1,
        grado:         est?.grado   || '',
        seccion:       est?.seccion || '',
      })
    });
    closeModal('modal-sesion');
    toast('✅ Sesión registrada correctamente');
    await cargarDatos();
    renderCitas(citaFiltro);
  } catch (err) {
    console.error('Error guardando sesión:', err);
  }
}

// ═══════════════════════════════════
//   NUEVO — PASOS
// ═══════════════════════════════════
function resetPasos() {
  document.getElementById('paso1-card').style.display = '';
  document.getElementById('paso2-card').style.display = 'none';
  document.getElementById('paso-ind-1').className = 'paso-step active';
  document.getElementById('paso-ind-2').className = 'paso-step';
}

function irPaso2() {
  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const grado     = document.getElementById('na-grado')?.value;
  if (!nombres || !apellidos || !grado) {
    toast('⚠️ Completa nombre, apellidos y grado');
    return;
  }
  const sub = document.getElementById('paso2-sub');
  if (sub) sub.textContent = `Primera sesión para ${nombres} ${apellidos}`;
  document.getElementById('paso1-card').style.display = 'none';
  document.getElementById('paso2-card').style.display = '';
  document.getElementById('paso-ind-1').className = 'paso-step done';
  document.getElementById('paso-ind-2').className = 'paso-step active';
}

function volverPaso1() {
  document.getElementById('paso1-card').style.display = '';
  document.getElementById('paso2-card').style.display = 'none';
  document.getElementById('paso-ind-1').className = 'paso-step active';
  document.getElementById('paso-ind-2').className = 'paso-step';
}

async function guardarAtencion() {
  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const motivo    = document.getElementById('na-motivo')?.value?.trim();
  const fecha     = document.getElementById('na-fecha')?.value;
  const hora      = document.getElementById('na-hora')?.value;

  if (!motivo || !fecha || !hora) {
    toast('⚠️ Completa motivo, fecha y hora');
    return;
  }

  try {
    // 1️⃣ Crear estudiante
    const nuevoEst = await apiFetch(`${API}/estudiantes`, {
      method: 'POST',
      body: JSON.stringify({
        nombres,
        apellidos,
        dni:      document.getElementById('na-dni')?.value || '',
        telefono: document.getElementById('na-telefono')?.value || '',
        grado:    document.getElementById('na-grado')?.value || '',
        seccion:  document.getElementById('na-seccion')?.value || '',
        genero:   document.getElementById('na-genero')?.value || '',
        fechanac: document.getElementById('na-fechanac')?.value || null,
        condicion: 'activo',
      })
    });

    // 2️⃣ Crear atención
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante:  nuevoEst.id || nuevoEst.idestudiante,
        fechahora:     `${fecha}T${hora}:00`,
        estado:        'pendiente',
        nivelatencion: document.getElementById('na-nivel')?.value || 'moderado',
        idmotivo:      1,
        grado:         document.getElementById('na-grado')?.value  || '',
        seccion:       document.getElementById('na-seccion')?.value || '',
      })
    });

    toast(`✅ ${nombres} ${apellidos} registrado correctamente`);

    // Limpiar campos
    ['na-nombres','na-apellidos','na-dni','na-telefono','na-fechanac','na-motivo','na-obs']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['na-genero','na-grado','na-seccion','na-nivel']
      .forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });

    await cargarDatos();
    goPage('dashboard');

  } catch (err) {
    console.error('Error guardando atención:', err);
    toast('❌ Error al guardar. Intenta de nuevo.');
  }
}

// ═══════════════════════════════════
//   REPORTES
// ═══════════════════════════════════
function renderReportes() {
  // Atenciones por mes (año actual)
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
            <div class="bar" style="height:${Math.max((v/max)*110, v > 0 ? 4 : 2)}px;background:${v > 0 ? '#3B5BDB' : 'var(--border)'};"></div>
          </div>`).join('')}
      </div>
      <div class="bar-label-row">${labels.map(l => `<div class="bar-lbl">${l}</div>`).join('')}</div>`;
  }

  // Por grado
  const porGrado = {};
  store.atenciones.forEach(a => {
    const est = getEst(a.idestudiante);
    const g   = est?.grado || a.grado || 'Sin grado';
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
            <span class="prog-pct">${Math.round((n/totalG)*100)}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${Math.round((n/totalG)*100)}%;background:${colores[i]};"></div>
          </div>
        </div>`).join('');
  }

  // Indicadores
  const indEl = document.getElementById('rep-ind-grid');
  if (indEl) {
    indEl.innerHTML = [
      { v: store.atenciones.length,                                                   l: 'Total atenciones' },
      { v: store.estudiantes.length,                                                  l: 'Estudiantes atendidos' },
      { v: store.atenciones.filter(a => a.estado === 'activo').length,               l: 'Casos activos' },
      { v: store.atenciones.filter(a => a.nivelatencion === 'urgente' || a.nivelatencion === 'grave').length, l: 'Casos urgentes' },
    ].map(i => `<div class="rep-ind"><div class="rep-ind-val">${i.v}</div><div class="rep-ind-lbl">${i.l}</div></div>`).join('');
  }

  // Motivos
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
            <span class="prog-pct">${Math.round((n/totalM)*100)}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${Math.round((n/totalM)*100)}%;background:${colores[i]};"></div>
          </div>
        </div>`).join('');
  }
}

// ═══════════════════════════════════
//   CALENDARIO (simple, sin FullCalendar)
// ═══════════════════════════════════
let calMes = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth()
};

function renderCalendario() {
  const { year, month } = calMes;
  const meses    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const tituloEl = document.getElementById('cal-mes-titulo');
  if (tituloEl) tituloEl.textContent = `${meses[month]} ${year}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();
  const today       = new Date();

  const eventDays = new Set(
    store.atenciones
      .filter(a => {
        const d = new Date(a.fechahora);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(a => new Date(a.fechahora).getDate())
  );

  let html = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    .map(d => `<div class="cal-day-name">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other-month">${prevDays - firstDay + i + 1}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasEv   = eventDays.has(d);
    html += `<div class="cal-day${isToday ? ' today' : ''}${hasEv ? ' has-event' : ''}"
      title="${hasEv ? 'Hay sesiones este día' : ''}">${d}</div>`;
  }

  const gridEl = document.getElementById('cal-grid');
  if (gridEl) gridEl.innerHTML = html;
}

function cambiarMes(dir) {
  calMes.month += dir;
  if (calMes.month > 11) { calMes.month = 0; calMes.year++; }
  if (calMes.month < 0)  { calMes.month = 11; calMes.year--; }
  renderCalendario();
}

// ═══════════════════════════════════
//   CONFIG
// ═══════════════════════════════════
function renderConfig() {
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  const horarios = [
    { desde:'08:00', hasta:'12:00', activo:true  },
    { desde:'08:00', hasta:'12:00', activo:true  },
    { desde:'08:00', hasta:'12:00', activo:true  },
    { desde:'08:00', hasta:'12:00', activo:true  },
    { desde:'08:00', hasta:'12:00', activo:false },
  ];
  const schEl = document.getElementById('schedule-rows');
  if (schEl) {
    schEl.innerHTML = dias.map((d, i) => `
      <div class="sch-row">
        <div class="sch-day">${d}</div>
        <input type="time" value="${horarios[i].desde}" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
        <input type="time" value="${horarios[i].hasta}" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
        <button class="sch-toggle ${horarios[i].activo ? 'on' : 'off'}" onclick="toggleSch(this)"></button>
      </div>`).join('');
  }
}

function toggleSch(btn) {
  btn.classList.toggle('on');
  btn.classList.toggle('off');
}

// ═══════════════════════════════════
//   BÚSQUEDA GLOBAL
// ═══════════════════════════════════
function onGlobalSearch(q) {
  if (!q.trim()) return;
  const f     = q.toLowerCase();
  const found = store.estudiantes.filter(e =>
    nombreCompleto(e).toLowerCase().includes(f) || (e.dni || '').includes(f)
  );
  if (found.length) {
    goPage('historial');
    const searchEl = document.getElementById('hist-search');
    if (searchEl) searchEl.value = q;
    renderHistorial(q);
  } else {
    toast('No se encontraron resultados para: ' + q);
  }
}

// ═══════════════════════════════════
//   INIT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Cerrar modales al hacer clic en el overlay
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  // Fecha inicial en modales
  const msFecha = document.getElementById('ms-fecha');
  if (msFecha) msFecha.value = hoy();
  const naFecha = document.getElementById('na-fecha');
  if (naFecha) naFecha.value = hoy();

  // Botón retornar a secundaria
  const btnRetornar = document.getElementById('btn-retornar');
  if (btnRetornar) {
    btnRetornar.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.add('saliendo');
      setTimeout(() => { window.location.href = '/index.html'; }, 450);
    });
  }

  // Cargar datos y arrancar
  cargarDatos();
  console.log('✅ PsiControl Primaria inicializado correctamente');
});