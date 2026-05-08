// ═══════════════════════════════════════════════
// NUEVO.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

// ── Pasos del formulario ──────────────────────────
function resetPasos() {
  const p1 = document.getElementById('paso1-card');
  const p2 = document.getElementById('paso2-card');
  const i1 = document.getElementById('paso-ind-1');
  const i2 = document.getElementById('paso-ind-2');
  if (p1) p1.style.display = '';
  if (p2) p2.style.display = 'none';
  if (i1) i1.className = 'paso-step active';
  if (i2) i2.className = 'paso-step';
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

// ── Guardar nueva atención (estudiante + sesión) ──
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
    // 1️⃣ Crear estudiante en primaria
    const nuevoEst = await apiFetch(`${API}/estudiantes`, {
      method: 'POST',
      body: JSON.stringify({
        nombres,
        apellidos,
        dni:      document.getElementById('na-dni')?.value      || '',
        telefono: document.getElementById('na-telefono')?.value  || '',
        grado:    document.getElementById('na-grado')?.value     || '',
        seccion:  document.getElementById('na-seccion')?.value   || '',
        genero:   document.getElementById('na-genero')?.value    || '',
        fechanac: document.getElementById('na-fechanac')?.value  || null,
        condicion: 'activo',
        nivel:    'primaria',          // ← marca el nivel
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
        grado:         document.getElementById('na-grado')?.value   || '',
        seccion:       document.getElementById('na-seccion')?.value  || '',
      })
    });

    toast(`✅ ${nombres} ${apellidos} registrado correctamente`);

    // ── Limpiar campos ────────────────────────────
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