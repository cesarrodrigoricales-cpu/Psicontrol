// ═══════════════════════════════════════════════
// MAIN.JS — Punto de entrada y orquestador
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

// ── STORE GLOBAL ────────────────────────────────
// Compartido con todos los módulos vía window.store
window.store = {
  atenciones: [],
  estudiantes: [],
  actividad: [
    { tipo: 'purple', icon: '📝', texto: 'Sistema iniciado correctamente', tiempo: 'Ahora' },
  ],
  reportes: 0,
  config: {
    nombre:    'Consultorio PsiControl',
    psicologo: 'Dra. Ana López',
    tel:       '',
    email:     '',
    dir:       ''
  }
};

// ── NAVEGACIÓN ──────────────────────────────────
const pageLabels = {
  dashboard:  'Dashboard',
  historial:  'Historial de registros',
  citas:      'Atenciones',
  nuevo:      'Nueva atención',
  reportes:   'Reportes',
  calendario: 'Calendario',
  config:     'Configuración',
  '404':      'Página no encontrada'
};

function navigateTo(page) {
  const paginasValidas = Object.keys(pageLabels).filter(k => k !== '404');
  const target = paginasValidas.includes(page) ? page : '404';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + target);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector('[data-page="' + target + '"]');
  if (navEl) navEl.classList.add('active');

  const breadcrumb = document.getElementById('breadcrumb-text');
  if (breadcrumb) breadcrumb.textContent = pageLabels[target] || target;

  if (target !== '404') {
    switch (target) {
      case 'historial':  renderHistorial();       break;
      case 'citas':      cargarYRenderCitas();    break;
      case 'reportes':   renderReportes();        break;
      case 'nuevo':      resetNuevaAtencion();    break;
      case 'config':     cargarConfig();          break;
      case 'calendario': renderCalendario();      break;
    }
  }

  // Limpiar búsqueda global al cambiar de página
  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  if (searchInput)   searchInput.value = '';
  if (searchResults) searchResults.style.display = 'none';
}

// ── BÚSQUEDA GLOBAL ─────────────────────────────
let searchTimeout;

function performGlobalSearch(q, searchResultsEl) {
  const query = q?.trim().toLowerCase() || '';
  if (!query) {
    if (searchResultsEl) searchResultsEl.style.display = 'none';
    return;
  }

  const res = store.estudiantes.filter(p => {
    const nombre = `${p.nombres} ${p.apellidos}`.toLowerCase();
    return nombre.includes(query)               ||
      p.codigomatricula?.toLowerCase().includes(query) ||
      p.telefono?.includes(query)               ||
      p.dni?.includes(query);
  }).slice(0, 5);

  if (res.length === 0 || !searchResultsEl) {
    searchResultsEl.style.display = 'none';
    return;
  }

  searchResultsEl.innerHTML = res.map(p =>
    `<div class="search-result-item" onclick="verEstudiante(${p.id})">
      <div class="td-avatar ${colorAvatar(p.nombres + p.apellidos)}"
           style="width:28px;height:28px;font-size:10px;">
        ${initials(p.nombres + ' ' + p.apellidos)}
      </div>
      <div>
        <div>${p.nombres} ${p.apellidos}</div>
        <div class="sr-sub">
          ${p.dni ? 'DNI: ' + p.dni + ' · ' : ''}${p.telefono || p.codigomatricula || '—'}
        </div>
      </div>
    </div>`
  ).join('');

  searchResultsEl.style.display = 'block';
}

// ── INICIALIZACIÓN ──────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Navegación por sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Cerrar modales al hacer clic en el overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Búsqueda global — input con debounce
  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(
        () => performGlobalSearch(this.value, searchResults),
        300
      );
    });
  }

  // Cerrar resultados de búsqueda al hacer clic fuera
  document.addEventListener('click', function (e) {
    const searchWrap = document.getElementById('search-wrap');
    if (searchWrap && !searchWrap.contains(e.target) && searchResults) {
      searchResults.style.display = 'none';
    }
  });

  // Botón de notificaciones
  const notifBtn = document.getElementById('notif-btn');
  const notifDot = document.getElementById('notif-dot');

  if (notifBtn) {
    notifBtn.addEventListener('click', function () {
      const pend = store.atenciones.filter(a => a.estado === 'pendiente');
      if (pend.length > 0) {
        toast(pend.length + ' atención(es) pendientes de confirmar', 'info');
        if (notifDot) notifDot.style.display = 'none';
      } else {
        toast('No tienes notificaciones pendientes', 'info');
      }
    });
  }

  // Listeners fecha → horas disponibles (modal citas y nueva atención)
  const mcFecha = document.getElementById('mc-fecha');
  if (mcFecha) {
    mcFecha.addEventListener('change', (e) => {
      actualizarHorasSelect('mc-hora', e.target.value);
    });
  }

  const naFecha = document.getElementById('na-fecha');
  if (naFecha) {
    naFecha.addEventListener('change', (e) => {
      actualizarHorasSelect('na-hora', e.target.value);
    });
  }

  // Restricciones en campos de nueva atención
  const docInput      = document.getElementById('na-doc-numero');
  const telefonoInput = document.getElementById('na-telefono');

  if (docInput) {
    docInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
  }

  if (telefonoInput) {
    telefonoInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
    });
  }

  // Construir horario semanal (config)
  buildSchedule();

  // Cargar datos desde la API y arrancar en dashboard
  cargarDatos();
  navigateTo('dashboard');

  console.log('✅ PsiControl inicializado correctamente');
});