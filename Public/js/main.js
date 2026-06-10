// ═══════════════════════════════════════════════
// MAIN.JS — Punto de entrada y orquestador
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

// ── STORE GLOBAL ────────────────────────────────
window.store = {
  atenciones:  [],
  estudiantes: [],
  actividad: [
    { tipo: 'purple', icon: '📝', texto: 'Sistema iniciado correctamente', tiempo: 'Ahora' },
  ],
  reportes: 0,
  config: {
    nombre:    '',
    psicologo: '',
    tel:       '',
    email:     '',
    dir:       ''
  }
};

// ── NAVEGACIÓN ──────────────────────────────────
const pageLabels = {
  dashboard:  'Inicio ',
  historial:  'Historial de registros',
  citas:      'Atenciones',
  nuevo:      'Nueva atención',
  reportes:   'Reportes',
  'historial-anios': 'Historial de años anteriores',
  siagie:            'Integración SIAGIE',
  calendario: 'Calendario',
  config:     'Configuración',
  '404':      'Página no encontrada'
};

function navigateTo(page, callback) {
  cerrarSidebar();
  cerrarNotificaciones();
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
      case 'historial':       renderHistorial(callback); break;
      case 'citas':           cargarYRenderCitas();      break;
      case 'reportes':        renderReportes();          break;
      case 'nuevo':           resetNuevaAtencion();      break;
      case 'historial-anios': renderHistorialAnios();    break;
      case 'siagie':          inicializarSiagie();       break;
      case 'config':          cargarConfig();            break;
      case 'calendario':      renderCalendario();        break;
    }
  }

  // Solo limpiar el buscador si no viene un callback
  // (cuando hay callback, irAEstudianteDesdeSearch ya lo limpió)
  if (!callback) {
    const searchInput   = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');
    if (searchInput)   searchInput.value = '';
    if (searchResults) searchResults.style.display = 'none';
  }
}

// ── SIDEBAR MÓVIL ───────────────────────────────
function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.toggle('open');
  backdrop.classList.toggle('open');
}

function cerrarSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

// ── BÚSQUEDA GLOBAL ─────────────────────────────
let searchTimeout;

function irAEstudianteDesdeSearch(idEstudiante) {
  const tieneHistorial = store.atenciones.some(a => a.idestudiante == idEstudiante);

  if (!tieneHistorial) {
    showToast('Este estudiante aún no tiene atenciones registradas', 'warning');
    return;
  }

  // Limpiar buscador
  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  if (searchInput)   searchInput.value = '';
  if (searchResults) searchResults.style.display = 'none';

  // Navegar a historial y abrir el modal exactamente cuando renderHistorial termine
  navigateTo('historial', () => verEstudiante(idEstudiante));
}

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

  searchResultsEl.innerHTML = res.map(p => {
    const tieneHistorial = store.atenciones.some(a => a.idestudiante == p.id);

    return `
      <div class="search-result-item" onclick="irAEstudianteDesdeSearch(${p.id})">
        <div class="td-avatar ${colorAvatar(p.nombres + p.apellidos)}"
             style="width:28px;height:28px;font-size:10px;">
          ${initials(p.nombres + ' ' + p.apellidos)}
        </div>
        <div>
          <div>${p.nombres} ${p.apellidos}</div>
          <div class="sr-sub">
            ${p.dni ? 'DNI: ' + p.dni + ' · ' : ''}${p.telefono || p.codigomatricula || '—'}
            ${!tieneHistorial
              ? ' · <span style="color:#e67e22;font-size:10px;font-weight:600;">Sin atenciones</span>'
              : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  searchResultsEl.style.display = 'block';
}

// ── NOTIFICACIONES ──────────────────────────────

function toggleNotificaciones() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const abierto = panel.style.display === 'flex';
  if (abierto) {
    cerrarNotificaciones();
  } else {
    abrirNotificaciones();
  }
}

function abrirNotificaciones() {
  const panel      = document.getElementById('notif-panel');
  const backdrop   = document.getElementById('notif-backdrop');
  const lista      = document.getElementById('notif-lista');
  const badgeCount = document.getElementById('notif-badge-count');
  if (!panel || !lista) return;

  const pendientes = store.atenciones
    .filter(a => a.estado === 'pendiente')
    .sort((a, b) => new Date(a.fechahora) - new Date(b.fechahora))
    .slice(0, 20);

  if (badgeCount) {
    badgeCount.textContent = pendientes.length || '';
    badgeCount.style.display = pendientes.length ? 'inline' : 'none';
  }

  if (pendientes.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:36px 16px;color:var(--text3,#9B8F82);">
        <div style="font-size:32px;margin-bottom:8px;">✅</div>
        <div style="font-size:13px;font-weight:600;color:var(--text,#1a1a1a);">Todo al día</div>
        <div style="font-size:12px;margin-top:4px;">No tienes atenciones pendientes</div>
      </div>`;
  } else {
    lista.innerHTML = pendientes.map(a => {
      const est = store.estudiantes.find(e => e.id == a.idestudiante);
      const nombre = est
        ? `${est.apellidos}, ${est.nombres}`
        : (a.paciente || 'Estudiante');

      const grado   = a.grado   || est?.grado   || '';
      const seccion = a.seccion || est?.seccion || '';
      const gradoStr = grado ? `${grado}° ${seccion}` : '—';

      const fecha = a.fechahora ? fmtFecha(a.fechahora) : '—';
      const hora  = a.fechahora ? fmtHora(a.fechahora)  : '—';

      const nivelColor = a.nivelatencion === 'grave'    ? '#c0392b'
                       : a.nivelatencion === 'moderado' ? '#e67e22'
                       : '#27ae60';
      const nivelLabel = a.nivelatencion === 'grave'    ? 'Grave'
                       : a.nivelatencion === 'moderado' ? 'Moderado'
                       : 'Leve';

      return `
        <div onclick="cerrarNotificaciones();navigateTo('citas')"
          style="display:flex;align-items:flex-start;gap:11px;padding:11px 16px;
                 cursor:pointer;border-bottom:1px solid var(--border,#e8e3dd);
                 transition:background 0.15s;"
          onmouseover="this.style.background='var(--bg2,#faf9f7)'"
          onmouseout="this.style.background=''">

          <div style="width:36px;height:36px;border-radius:50%;background:#EEEDFE;
                      color:#534AB7;display:flex;align-items:center;justify-content:center;
                      font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;">
            ${est ? initials(est.nombres + ' ' + est.apellidos) : '?'}
          </div>

          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text,#1a1a1a);
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${nombre}
            </div>
            <div style="font-size:11px;color:var(--text3,#9B8F82);margin-top:2px;">
              ${fecha} · ${hora} · ${gradoStr}
            </div>
            <div style="font-size:11px;color:var(--text3,#9B8F82);margin-top:1px;">
              ${a.motivoconsulta || a.motivo || '—'}
            </div>
          </div>

          <div style="flex-shrink:0;margin-top:2px;">
            <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;
                         background:${nivelColor}18;color:${nivelColor};">
              ${nivelLabel}
            </span>
          </div>
        </div>`;
    }).join('');
  }

  panel.style.display    = 'flex';
  backdrop.style.display = 'block';

  const notifDot = document.getElementById('notif-dot');
  if (notifDot) notifDot.style.display = 'none';
}

function cerrarNotificaciones() {
  const panel    = document.getElementById('notif-panel');
  const backdrop = document.getElementById('notif-backdrop');
  if (panel)    panel.style.display    = 'none';
  if (backdrop) backdrop.style.display = 'none';
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

  // Botón notificaciones → panel drawer
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleNotificaciones();
    });
  }

  // Listeners fecha → horas disponibles
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

  // Restricciones campos nueva atención
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

  // Botón ir a primaria
  const btnIrPrimaria = document.getElementById('btn-ir-primaria');
  if (btnIrPrimaria) {
    btnIrPrimaria.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.add('saliendo');
      setTimeout(() => {
        window.location.href = '/primaria/index.html';
      }, 450);
    });
  }

  // Construir horario semanal (config)
  buildSchedule();

  // Cargar datos desde la API y arrancar en dashboard
  cargarDatos();
  navigateTo('dashboard');

  console.log('✅ PsiControl inicializado correctamente');
});