// ═══════════════════════════════════════════════
// CALENDARIO.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

let calMes = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth()
};

function renderCalendario() {
  const { year, month } = calMes;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const tituloEl = document.getElementById('cal-mes-titulo');
  if (tituloEl) tituloEl.textContent = `${meses[month]} ${year}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();
  const today       = new Date();

  // Días del mes con atenciones
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

  // Días del mes anterior
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other-month">${prevDays - firstDay + i + 1}</div>`;
  }

  // Días del mes actual
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