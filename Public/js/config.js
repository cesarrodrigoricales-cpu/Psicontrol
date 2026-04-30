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

