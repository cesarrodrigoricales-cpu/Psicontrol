// ═══════════════════════════════════════════════
// UTILS.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

// ── STORE GLOBAL ──────────────────────────────────
window.store = {
  atenciones:  [],
  estudiantes: [],
  actividad: [
    { tipo: 'purple', icon: '📝', texto: 'Sistema iniciado correctamente', tiempo: 'Ahora' },
  ],
  reportes: 0,
};

// ── CARGA INICIAL ─────────────────────────────────
async function cargarDatos() {
  try {
    const [atenciones, estudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes/primaria`)   // endpoint exclusivo primaria
    ]);
    store.atenciones  = atenciones  || [];
    store.estudiantes = estudiantes || [];
    initDashboard();
    populateEstSelect('ms-estudiante');
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }
}

// ── FORMATEO ──────────────────────────────────────
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
  const n = e.nombres  || '';
  const a = e.apellidos || '';
  return (n[0] + (a[0] || '')).toUpperCase();
}

function getEst(id) {
  return store.estudiantes.find(e => e.id == id);
}

// ── BADGES ────────────────────────────────────────
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

// ── TOAST ─────────────────────────────────────────
function toast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── MODALES ───────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── BÚSQUEDA GLOBAL ───────────────────────────────
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

// ── NORMALIZAR (para SIAGIE) ──────────────────────
function normalizar(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}