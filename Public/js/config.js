// ═══════════════════════════════════════════════
// CONFIG.JS — Configuración, horario y reportes
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

const CONFIG_KEY    = 'psicontrol_config';
const HORARIO_KEY   = 'psicontrol_horario';

// ── CONFIGURACIÓN DEL CONSULTORIO ──────────────

function cargarConfig() {
  // ✅ Cargar desde localStorage si existe
  const guardado = localStorage.getItem(CONFIG_KEY);
  if (guardado) {
    store.config = JSON.parse(guardado);
  }

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

  // ✅ Cargar horario guardado
  const horarioGuardado = localStorage.getItem(HORARIO_KEY);
  if (horarioGuardado) {
    const horarioParsed = JSON.parse(horarioGuardado);
    horarioParsed.forEach(d => {
      const idx = days.findIndex(x => x.key === d.key);
      if (idx !== -1) days[idx] = { ...days[idx], ...d };
    });
  }

  buildSchedule();
  actualizarDatosEnUI();
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

  // ✅ Persistir en localStorage
  localStorage.setItem(CONFIG_KEY, JSON.stringify(store.config));

  actualizarDatosEnUI();
  toast('✅ Configuración guardada');
}

// ✅ Actualizar nombre del psicólogo y consultorio en toda la UI
function actualizarDatosEnUI() {
  // Nombre en sidebar
  const profileName = document.querySelector('.profile-name');
  if (profileName && store.config.psicologo) {
    profileName.textContent = store.config.psicologo;
  }

  // Iniciales en avatar del sidebar
  const avatar = document.querySelector('.sidebar-footer .avatar');
  if (avatar && store.config.psicologo) {
    const palabras = store.config.psicologo.trim().split(' ').filter(Boolean);
    const iniciales = palabras.length >= 2
      ? (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase()
      : palabras[0]?.slice(0, 2).toUpperCase() || 'PS';
    avatar.textContent = iniciales;
  }

  // Rol — puedes hacerlo editable luego
  const profileRole = document.querySelector('.profile-role');
  if (profileRole && store.config.rol) {
    profileRole.textContent = store.config.rol;
  }

  // Título en el breadcrumb del dashboard
  const subtitulo = document.getElementById('fecha-hoy');
  if (subtitulo && store.config.nombre) {
    const fecha = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    subtitulo.textContent = `${store.config.nombre} · ${fecha}`;
  }
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
    <div class="schedule-row" style="background:${i%2===0 ? 'var(--bg)' : 'transparent'};border-radius:8px;padding:4px 0;">
      <span class="day-label">${d.label}</span>
      <input type="time" value="${d.from}" id="from-${d.key}"
        onchange="updateScheduleTime('${d.key}', 'from', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;
               font-family:inherit;font-size:12px;background:var(--surface);outline:none;
               ${!d.active ? 'opacity:.35;pointer-events:none;' : ''}">
      <input type="time" value="${d.to}" id="to-${d.key}"
        onchange="updateScheduleTime('${d.key}', 'to', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;
               font-family:inherit;font-size:12px;background:var(--surface);outline:none;
               ${!d.active ? 'opacity:.35;pointer-events:none;' : ''}">
      <div class="toggle-switch ${d.active ? 'on' : ''}" id="tog-${d.key}"
        onclick="toggleDay('${d.key}', ${i})"></div>
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
  const tog  = document.getElementById('tog-'  + key);
  const from = document.getElementById('from-' + key);
  const to   = document.getElementById('to-'   + key);

  if (tog) tog.classList.toggle('on', days[i].active);
  [from, to].forEach(el => {
    if (el) {
      el.style.opacity       = days[i].active ? '1'    : '.35';
      el.style.pointerEvents = days[i].active ? ''     : 'none';
    }
  });
}

function guardarHorario() {
  // ✅ Persistir horario en localStorage
  localStorage.setItem(HORARIO_KEY, JSON.stringify(days));
  toast('✅ Horario guardado');
}