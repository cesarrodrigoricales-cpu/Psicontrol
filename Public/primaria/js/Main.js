// ═══════════════════════════════════════════════
// MAIN.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');

  const ni = document.querySelector('.nav-item[data-page="' + id + '"]');
  if (ni) ni.classList.add('active');

  const titles = {
    dashboard:         'Inicio',
    historial:         'Historial de registros',
    citas:             'Atenciones',
    nuevo:             'Nueva atención',
    reportes:          'Reportes',
    calendario:        'Calendario',
    'historial-anios': 'Historial de años',
    config:            'Configuración'
  };
  const bc = document.getElementById('breadcrumb-text');
  if (bc) bc.textContent = titles[id] || id;

  if (id === 'historial')          renderHistorial();
  if (id === 'citas')              renderCitas('todas');
  if (id === 'reportes')           renderReportes();
  if (id === 'calendario')         renderCalendario();
  if (id === 'config')             renderConfig();
  if (id === 'historial-anios' && typeof seleccionarAnio === 'function')
                                   seleccionarAnio(new Date().getFullYear());
  if (id === 'nuevo') {
    const f = document.getElementById('na-fecha');
    if (f) f.value = hoy();
    resetPasos();
  }
}

// ── Sidebar móvil ─────────────────────────────────
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-backdrop')?.classList.toggle('show');
}

function cerrarSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('show');
}

// ── DOMContentLoaded ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Clicks del menú lateral via data-page
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      goPage(item.getAttribute('data-page'));
      cerrarSidebar();
    });
  });

  // Cerrar modales al clic en overlay
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  // Fechas por defecto en modales y formularios
  ['mc-fecha', 'na-fecha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoy();
  });

  // Búsqueda global
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => onGlobalSearch(e.target.value));
  }

  // Cargar datos y arrancar dashboard
  cargarDatos();
  console.log('✅ PsiControl Primaria inicializado — módulos cargados');
});