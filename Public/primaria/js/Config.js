// ═══════════════════════════════════════════════
// CONFIG.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

function renderConfig() {
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  const horarios = [
    { desde: '08:00', hasta: '13:00', activo: true  },
    { desde: '08:00', hasta: '13:00', activo: true  },
    { desde: '08:00', hasta: '13:00', activo: true  },
    { desde: '08:00', hasta: '13:00', activo: true  },
    { desde: '08:00', hasta: '13:00', activo: false },
  ];

  const schEl = document.getElementById('schedule-rows');
  if (schEl) {
    schEl.innerHTML = dias.map((d, i) => `
      <div class="sch-row">
        <div class="sch-day">${d}</div>
        <input type="time" value="${horarios[i].desde}"
          style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;
                 font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
        <input type="time" value="${horarios[i].hasta}"
          style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;
                 font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;">
        <button class="sch-toggle ${horarios[i].activo ? 'on' : 'off'}" onclick="toggleSch(this)"></button>
      </div>`).join('');
  }
}

function toggleSch(btn) {
  btn.classList.toggle('on');
  btn.classList.toggle('off');
}