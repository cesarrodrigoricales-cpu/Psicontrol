// ═══════════════════════════════════
//   DATA
// ═══════════════════════════════════
let estudiantes = [
  { id:1, nombres:'Carlos Andrés', apellidos:'Quispe Mamani', dni:'75234891', telefono:'987654321', grado:'3° Primaria', seccion:'B', genero:'Masculino', fechanac:'2015-03-14' },
  { id:2, nombres:'Lucía Fernanda', apellidos:'Torres Rivas', dni:'76112345', telefono:'956789012', grado:'5° Primaria', seccion:'A', genero:'Femenino', fechanac:'2013-07-22' },
  { id:3, nombres:'Diego Sebastián', apellidos:'Flores Vega', dni:'74890234', telefono:'934567890', grado:'2° Primaria', seccion:'C', genero:'Masculino', fechanac:'2016-11-05' },
  { id:4, nombres:'Valentina', apellidos:'Ccama López', dni:'77345678', telefono:'912345678', grado:'6° Primaria', seccion:'A', genero:'Femenino', fechanac:'2012-02-18' },
  { id:5, nombres:'Mateo Rodrigo', apellidos:'Huanca Díaz', dni:'75901234', telefono:'978901234', grado:'4° Primaria', seccion:'D', genero:'Masculino', fechanac:'2014-08-30' },
  { id:6, nombres:'Sofía Alejandra', apellidos:'Paucar Nina', dni:'76567890', telefono:'965432198', grado:'1° Primaria', seccion:'B', genero:'Femenino', fechanac:'2017-12-01' },
];

let atenciones = [
  { id:1, estudianteId:1, motivo:'Problemas de conducta en clase', nivel:'urgente', estado:'activo',  fecha:'2025-04-25', hora:'09:00', obs:'Se comunica con los padres.' },
  { id:2, estudianteId:2, motivo:'Ansiedad ante exámenes',         nivel:'moderado',estado:'pendiente',fecha:'2025-04-26', hora:'10:30', obs:'' },
  { id:3, estudianteId:3, motivo:'Dificultades de socialización',  nivel:'leve',   estado:'activo',  fecha:'2025-04-24', hora:'08:30', obs:'Juego grupal como terapia.' },
  { id:4, estudianteId:4, motivo:'Bullying — víctima',             nivel:'urgente', estado:'activo',  fecha:'2025-04-23', hora:'11:00', obs:'Caso prioritario.' },
  { id:5, estudianteId:5, motivo:'Tristeza y apatía frecuente',    nivel:'moderado',estado:'pendiente',fecha:'2025-04-27', hora:'14:00', obs:'' },
  { id:6, estudianteId:6, motivo:'Agresividad con compañeros',     nivel:'moderado',estado:'cerrado', fecha:'2025-04-20', hora:'09:30', obs:'Caso cerrado satisfactoriamente.' },
  { id:7, estudianteId:2, motivo:'Seguimiento ansiedad',           nivel:'leve',   estado:'cerrado', fecha:'2025-04-15', hora:'10:00', obs:'' },
];

let calMes = { year: 2025, month: 3 }; // 0-indexed: 3 = April

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
  const titles = { dashboard:'Panel de control', historial:'Historial de estudiantes', atenciones:'Atenciones', nuevo:'Nueva atención', reportes:'Reportes', calendario:'Calendario', config:'Configuración' };
  document.getElementById('bc-text').textContent = titles[id] || id;
  if (id === 'historial') renderHistorial(estudiantes);
  if (id === 'atenciones') renderCitas('todas');
  if (id === 'reportes') renderReportes();
  if (id === 'calendario') renderCalendario();
  if (id === 'config') renderConfig();
  if (id === 'nuevo') { document.getElementById('na-fecha').value = hoy(); resetPasos(); }
}

// ═══════════════════════════════════
//   UTILS
// ═══════════════════════════════════
function hoy() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
function fmtFecha(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}
function nombreCompleto(e) { return e.nombres + ' ' + e.apellidos; }
function iniciales(e) {
  return (e.nombres[0] + (e.apellidos[0] || '')).toUpperCase();
}
function getEst(id) { return estudiantes.find(e => e.id === id); }
function nivelBadge(n) {
  if (n === 'urgente') return '<span class="badge-status b-urgente">🔴 Urgente</span>';
  if (n === 'moderado') return '<span class="badge-status b-activo">🟡 Moderado</span>';
  return '<span class="badge-status b-cerrado">🟢 Leve</span>';
}
function estadoBadge(e) {
  if (e === 'pendiente') return '<span class="badge-status b-pendiente">⏳ Pendiente</span>';
  if (e === 'activo')    return '<span class="badge-status b-activo">✅ Activo</span>';
  return '<span class="badge-status b-cerrado">🔒 Cerrado</span>';
}
function toast(msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ═══════════════════════════════════
//   DASHBOARD
// ═══════════════════════════════════
function initDashboard() {
  const today = new Date();
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('fecha-hoy').textContent = `${dias[today.getDay()]}, ${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;
  document.getElementById('dash-fecha-citas').textContent = 'Sesiones registradas recientemente';

  const pendientes = atenciones.filter(a => a.estado === 'pendiente');
  const activas    = atenciones.filter(a => a.estado === 'activo');
  const urgentes   = atenciones.filter(a => a.nivel === 'urgente' && a.estado !== 'cerrado');

  document.getElementById('s-estudiantes').textContent = estudiantes.length;
  document.getElementById('s-pendientes').textContent  = pendientes.length;
  document.getElementById('s-activas').textContent     = activas.length;
  document.getElementById('s-urgentes').textContent    = urgentes.length;

  document.getElementById('nb-hist').textContent  = estudiantes.length;
  document.getElementById('nb-citas').textContent = pendientes.length;

  // Atenciones recientes
  const rec = [...atenciones].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4);
  document.getElementById('dash-appt-list').innerHTML = rec.length ? rec.map(a => {
    const est = getEst(a.estudianteId);
    return `<div class="activity-item">
      <div style="width:36px;height:36px;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${iniciales(est)}</div>
      <div class="act-text"><strong>${nombreCompleto(est)}</strong><br>${a.motivo}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div class="act-time">${fmtFecha(a.fecha)}</div>
        ${estadoBadge(a.estado)}
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div>';

  // Activity feed
  const acts = [
    { icon:'🧒', text:'<strong>Carlos Quispe</strong> inició seguimiento por conducta', t:'Hace 2h', c:'var(--rose)' },
    { icon:'📋', text:'<strong>Lucía Torres</strong> registrada con ansiedad', t:'Hoy 08:15', c:'var(--amber)' },
    { icon:'✅', text:'<strong>Sofía Paucar</strong> caso cerrado satisfactoriamente', t:'Ayer', c:'var(--green)' },
    { icon:'⚠️', text:'<strong>Valentina Ccama</strong> — caso urgente de bullying', t:'Hace 2 días', c:'var(--rose)' },
  ];
  document.getElementById('activity-feed').innerHTML = acts.map(a => `
    <div class="activity-item">
      <div class="act-dot" style="background:${a.c};"></div>
      <div class="act-text">${a.text}</div>
      <div class="act-time">${a.t}</div>
    </div>`).join('');

  // Motivos
  const motivos = [
    { label:'Conducta', pct:38, color:'var(--rose)' },
    { label:'Ansiedad', pct:28, color:'var(--amber)' },
    { label:'Socialización', pct:20, color:'var(--accent)' },
    { label:'Bullying',  pct:14, color:'var(--green)' },
  ];
  document.getElementById('prog-wrap').innerHTML = motivos.map(m => `
    <div class="prog-item">
      <div class="prog-label-row">
        <span class="prog-label">${m.label}</span>
        <span class="prog-pct">${m.pct}%</span>
      </div>
      <div class="prog-track"><div class="prog-fill" style="width:${m.pct}%;background:${m.color};"></div></div>
    </div>`).join('');
}

// ═══════════════════════════════════
//   HISTORIAL
// ═══════════════════════════════════
function renderHistorial(list) {
  const tb = document.getElementById('hist-tbody');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📋</div><div class="es-text">Sin estudiantes</div></div></td></tr>'; return; }
  tb.innerHTML = list.map(e => {
    const ults = atenciones.filter(a => a.estudianteId === e.id).sort((a,b)=>b.fecha.localeCompare(a.fecha))[0];
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${iniciales(e)}</div>
        <span style="font-weight:600;color:var(--text);">${nombreCompleto(e)}</span>
      </div></td>
      <td>${e.dni || '—'}</td>
      <td><span class="grado-badge">📚 ${e.grado}</span></td>
      <td>${e.seccion}</td>
      <td>${e.telefono || '—'}</td>
      <td>${ults ? fmtFecha(ults.fecha) : '—'}</td>
      <td><button class="action-btn" onclick="verEstudiante(${e.id})">Ver expediente</button></td>
    </tr>`;
  }).join('');
}
function filtrarHistorial(q) {
  const f = q.toLowerCase();
  renderHistorial(estudiantes.filter(e => nombreCompleto(e).toLowerCase().includes(f) || (e.dni||'').includes(f)));
}

// ═══════════════════════════════════
//   VER ESTUDIANTE
// ═══════════════════════════════════
function verEstudiante(id) {
  const e = getEst(id);
  const sesiones = atenciones.filter(a => a.estudianteId === id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  document.getElementById('me-titulo').textContent = 'Expediente — ' + nombreCompleto(e);
  document.getElementById('me-body').innerHTML = `
    <div class="student-profile">
      <div class="sp-header">
        <div class="sp-avatar">${iniciales(e)}</div>
        <div>
          <div class="sp-name">${nombreCompleto(e)}</div>
          <div class="sp-grade">${e.grado} — Sección ${e.seccion}</div>
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
        ${sesiones.length ? sesiones.map(s=>`
          <div class="sp-sess-item">
            <div style="flex:1;">
              <div style="font-weight:600;color:var(--text);font-size:12.5px;">${s.motivo}</div>
              <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">${fmtFecha(s.fecha)} · ${s.hora}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">${nivelBadge(s.nivel)} ${estadoBadge(s.estado)}</div>
          </div>`).join('') : '<div style="color:var(--text3);font-size:13px;">Sin sesiones registradas.</div>'}
      </div>
    </div>`;
  openModal('modal-estudiante');
}

// ═══════════════════════════════════
//   ATENCIONES
// ═══════════════════════════════════
let citaFiltro = 'todas';
function renderCitas(filtro) {
  citaFiltro = filtro;
  const list = filtro === 'todas' ? atenciones : atenciones.filter(a => a.estado === filtro);
  const tb = document.getElementById('citas-tbody');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div></td></tr>'; return; }
  const sorted = [...list].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  tb.innerHTML = sorted.map(a => {
    const est = getEst(a.estudianteId);
    return `<tr>
      <td>${fmtFecha(a.fecha)}</td>
      <td>${a.hora}</td>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${iniciales(est)}</div>
        ${nombreCompleto(est)}
      </div></td>
      <td><span class="grado-badge">${est.grado}</span></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.motivo}</td>
      <td>${nivelBadge(a.nivel)}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="action-btn" onclick="verEstudiante(${est.id})">Ver</button>
          <button class="action-btn danger" onclick="eliminarAtencion(${a.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}
function filtrarCitas(f) { renderCitas(f); }
function eliminarAtencion(id) {
  if (!confirm('¿Eliminar esta atención?')) return;
  atenciones = atenciones.filter(a => a.id !== id);
  renderCitas(citaFiltro);
  toast('🗑 Atención eliminada');
  initDashboard();
}

// Modal sesión
function guardarSesion() {
  const estId = parseInt(document.getElementById('ms-estudiante').value);
  const motivo = document.getElementById('ms-motivo').value.trim();
  const fecha  = document.getElementById('ms-fecha').value;
  const hora   = document.getElementById('ms-hora').value;
  if (!estId || !motivo || !fecha || !hora) { toast('⚠️ Completa todos los campos obligatorios'); return; }
  atenciones.push({
    id: Date.now(),
    estudianteId: estId,
    motivo,
    nivel: document.getElementById('ms-nivel').value,
    estado: document.getElementById('ms-estado').value,
    fecha, hora,
    obs: document.getElementById('ms-obs').value,
  });
  closeModal('modal-sesion');
  toast('✅ Sesión registrada correctamente');
  renderCitas(citaFiltro);
  initDashboard();
}
function populateEstSelect(selId) {
  const sel = document.getElementById(selId);
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    estudiantes.map(e => `<option value="${e.id}">${nombreCompleto(e)} — ${e.grado}</option>`).join('');
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
  const nombres  = document.getElementById('na-nombres').value.trim();
  const apellidos= document.getElementById('na-apellidos').value.trim();
  const grado    = document.getElementById('na-grado').value;
  if (!nombres || !apellidos || !grado) { toast('⚠️ Completa nombre, apellidos y grado'); return; }
  document.getElementById('paso2-sub').textContent = `Primera sesión para ${nombres} ${apellidos}`;
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
function guardarAtencion() {
  const nombres  = document.getElementById('na-nombres').value.trim();
  const apellidos= document.getElementById('na-apellidos').value.trim();
  const motivo   = document.getElementById('na-motivo').value.trim();
  const fecha    = document.getElementById('na-fecha').value;
  const hora     = document.getElementById('na-hora').value;
  if (!motivo || !fecha || !hora) { toast('⚠️ Completa motivo, fecha y hora'); return; }

  const nuevoEst = {
    id: Date.now(),
    nombres, apellidos,
    dni: document.getElementById('na-dni').value,
    telefono: document.getElementById('na-telefono').value,
    grado: document.getElementById('na-grado').value,
    seccion: document.getElementById('na-seccion').value,
    genero: document.getElementById('na-genero').value,
    fechanac: document.getElementById('na-fechanac').value,
  };
  estudiantes.push(nuevoEst);

  atenciones.push({
    id: Date.now() + 1,
    estudianteId: nuevoEst.id,
    motivo,
    nivel: document.getElementById('na-nivel').value,
    estado: 'pendiente',
    fecha, hora,
    obs: document.getElementById('na-obs').value,
  });

  toast(`✅ ${nombres} ${apellidos} registrado correctamente`);
  ['na-nombres','na-apellidos','na-dni','na-telefono','na-fechanac','na-motivo','na-obs'].forEach(id => document.getElementById(id).value = '');
  ['na-genero','na-grado','na-seccion','na-nivel','na-hora'].forEach(id => document.getElementById(id).selectedIndex = 0);
  initDashboard();
  goPage('dashboard');
}

// ═══════════════════════════════════
//   REPORTES
// ═══════════════════════════════════
function renderReportes() {
  // Bar chart
  const data = [8, 12, 7, 15, 11, 9, 14, 10, 13, 6, 8, 11];
  const labels = ['E','F','M','A','M','J','J','A','S','O','N','D'];
  const max = Math.max(...data);
  const colors = ['#3B5BDB','#5B7CF7','#3B5BDB','#5B7CF7','#3B5BDB','#5B7CF7','#3B5BDB','#5B7CF7','#3B5BDB','#5B7CF7','#3B5BDB','#5B7CF7'];
  document.getElementById('bar-chart-wrap').innerHTML = `
    <div class="bar-row">
      ${data.map((v,i)=>`<div class="bar-col">
        <div class="bar-val">${v}</div>
        <div class="bar" style="height:${(v/max)*110}px;background:${colors[i]};"></div>
      </div>`).join('')}
    </div>
    <div class="bar-label-row">${labels.map(l=>`<div class="bar-lbl">${l}</div>`).join('')}</div>`;

  // Grade prog
  const grades = [
    { g:'1° Primaria', pct:12, c:'var(--accent)' },
    { g:'2° Primaria', pct:18, c:'var(--amber)' },
    { g:'3° Primaria', pct:22, c:'var(--rose)' },
    { g:'4° Primaria', pct:20, c:'var(--green)' },
    { g:'5° Primaria', pct:16, c:'#7D93F5' },
    { g:'6° Primaria', pct:12, c:'var(--text3)' },
  ];
  document.getElementById('grade-prog-wrap').innerHTML = grades.map(g=>`
    <div class="prog-item">
      <div class="prog-label-row"><span class="prog-label">${g.g}</span><span class="prog-pct">${g.pct}%</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${g.pct}%;background:${g.c};"></div></div>
    </div>`).join('');

  // Indicadores
  document.getElementById('rep-ind-grid').innerHTML = [
    { v: atenciones.length, l:'Total atenciones' },
    { v: estudiantes.length, l:'Estudiantes atendidos' },
    { v: atenciones.filter(a=>a.estado==='activo').length, l:'Casos activos' },
    { v: atenciones.filter(a=>a.nivel==='urgente').length, l:'Casos urgentes' },
  ].map(i=>`<div class="rep-ind"><div class="rep-ind-val">${i.v}</div><div class="rep-ind-lbl">${i.l}</div></div>`).join('');

  // Motivos prog
  const motivos = [
    { l:'Conducta', pct:35, c:'var(--rose)' },
    { l:'Ansiedad', pct:25, c:'var(--amber)' },
    { l:'Bullying',  pct:20, c:'var(--accent)' },
    { l:'Social',   pct:12, c:'var(--green)' },
    { l:'Otros',    pct:8,  c:'var(--text3)' },
  ];
  document.getElementById('motivos-prog').innerHTML = motivos.map(m=>`
    <div class="prog-item">
      <div class="prog-label-row"><span class="prog-label">${m.l}</span><span class="prog-pct">${m.pct}%</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${m.pct}%;background:${m.c};"></div></div>
    </div>`).join('');
}

// ═══════════════════════════════════
//   CALENDARIO
// ═══════════════════════════════════
function renderCalendario() {
  const { year, month } = calMes;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('cal-mes-titulo').textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const today = new Date();

  const eventDays = new Set(atenciones.filter(a => {
    const d = new Date(a.fecha);
    return d.getFullYear()===year && d.getMonth()===month;
  }).map(a => parseInt(a.fecha.split('-')[2])));

  let html = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d=>`<div class="cal-day-name">${d}</div>`).join('');

  for (let i=0; i<firstDay; i++) {
    html += `<div class="cal-day other-month">${prevDays - firstDay + i + 1}</div>`;
  }
  for (let d=1; d<=daysInMonth; d++) {
    const isToday = d===today.getDate() && month===today.getMonth() && year===today.getFullYear();
    const hasEv = eventDays.has(d);
    html += `<div class="cal-day${isToday?' today':''}${hasEv?' has-event':''}" title="${hasEv?'Hay sesiones este día':''}">${d}</div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
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
    { desde:'08:00', hasta:'12:00', activo:true },
    { desde:'08:00', hasta:'12:00', activo:true },
    { desde:'08:00', hasta:'12:00', activo:true },
    { desde:'08:00', hasta:'12:00', activo:true },
    { desde:'08:00', hasta:'12:00', activo:false },
  ];
  document.getElementById('schedule-rows').innerHTML = dias.map((d,i)=>`
    <div class="sch-row">
      <div class="sch-day">${d}</div>
      <input type="time" value="${horarios[i].desde}" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
      <input type="time" value="${horarios[i].hasta}" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
      <button class="sch-toggle ${horarios[i].activo?'on':'off'}" onclick="toggleSch(this)"></button>
    </div>`).join('');
}
function toggleSch(btn) {
  btn.classList.toggle('on');
  btn.classList.toggle('off');
}

// ═══════════════════════════════════
//   SEARCH
// ═══════════════════════════════════
function onGlobalSearch(q) {
  if (!q.trim()) return;
  const f = q.toLowerCase();
  const found = estudiantes.filter(e => nombreCompleto(e).toLowerCase().includes(f) || (e.dni||'').includes(f));
  if (found.length) {
    goPage('historial');
    document.getElementById('hist-search').value = q;
    renderHistorial(found);
  }
}

// ═══════════════════════════════════
//   INIT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  populateEstSelect('ms-estudiante');
  document.getElementById('ms-fecha').value = hoy();
  document.getElementById('na-fecha').value = hoy();
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
});
