// NUEVO.JS — Nueva atención (paso a paso)

function buildContactosEmergenciaHTML() {
  return `
    <div style="grid-column:1/-1;margin-top:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
          📞 Contactos de emergencia
          <span style="font-size:11px;font-weight:400;color:var(--text-muted);">(Opcional — máx. 3)</span>
        </div>
        <button type="button" class="btn-secondary" id="btn-add-contacto"
          style="font-size:11px;padding:4px 12px;display:flex;align-items:center;gap:4px;"
          onclick="agregarContactoEmergencia()">
          + Agregar
        </button>
      </div>
      <div id="contactos-lista" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>`;
}

function agregarContactoEmergencia() {
  const lista = document.getElementById('contactos-lista');
  if (!lista) return;

  const existentes = lista.querySelectorAll('.contacto-row');
  if (existentes.length >= 3) {
    toast('Máximo 3 contactos de emergencia', 'warning');
    return;
  }

  const idx = Date.now();
  const row = document.createElement('div');
  row.className = 'contacto-row';
  row.dataset.idx = idx;
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px;';

  row.innerHTML = `
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Nombre completo</label>
      <input type="text" class="ce-nombre" placeholder="Ej: María García" style="font-size:13px;">
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Parentesco</label>
      <select class="ce-parentesco" style="font-size:13px;">
        <option value="">-- Parentesco --</option>
        <option value="Madre">Madre</option>
        <option value="Padre">Padre</option>
        <option value="Apoderado">Apoderado</option>
        <option value="Hermano/a">Hermano/a</option>
        <option value="Tío/a">Tío/a</option>
        <option value="Abuelo/a">Abuelo/a</option>
        <option value="Otro">Otro familiar</option>
      </select>
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Celular</label>
      <input type="text" class="ce-celular" placeholder="9XXXXXXXX" maxlength="9"
        style="font-size:13px;"
        oninput="this.value=this.value.replace(/\\D/g,'').slice(0,9)">
    </div>
    <button type="button"
      style="background:none;border:none;cursor:pointer;color:var(--rose);font-size:18px;padding:0 4px;align-self:center;margin-top:14px;"
      onclick="this.closest('.contacto-row').remove();actualizarBtnAgregarContacto()"
      title="Eliminar contacto">✕</button>`;

  lista.appendChild(row);
  actualizarBtnAgregarContacto();
}

function actualizarBtnAgregarContacto() {
  const lista = document.getElementById('contactos-lista');
  const btn   = document.getElementById('btn-add-contacto');
  if (!lista || !btn) return;
  const count = lista.querySelectorAll('.contacto-row').length;
  btn.disabled = count >= 3;
  btn.style.opacity = count >= 3 ? '0.4' : '1';
}

function leerContactosEmergencia() {
  const lista = document.getElementById('contactos-lista');
  if (!lista) return [];
  const contactos = [];
  lista.querySelectorAll('.contacto-row').forEach(row => {
    const nombre     = row.querySelector('.ce-nombre')?.value?.trim() || '';
    const parentesco = row.querySelector('.ce-parentesco')?.value || '';
    const celular    = row.querySelector('.ce-celular')?.value?.trim() || '';
    if (nombre || celular) contactos.push({ nombre, parentesco, celular });
  });
  return contactos;
}

function resetNuevaAtencion() {
  ['na-nombres','na-apellidos','na-tipo-doc','na-telefono','na-fechanac',
   'na-condicion','na-motivo-texto','na-observaciones']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  const generoEl = document.getElementById('na-genero');
  if (generoEl) generoEl.value = '';

  const gradoEl   = document.getElementById('na-grado');
  const seccionEl = document.getElementById('na-seccion');
  if (gradoEl)   gradoEl.value   = '';
  if (seccionEl) seccionEl.value = '';

  const fechaEl = document.getElementById('na-fecha');
  if (fechaEl) {
    fechaEl.value = hoy();
    fechaEl.min   = hoy();
  }

  const nivelEl = document.getElementById('na-nivel');
  if (nivelEl) nivelEl.value = 'moderado';

  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';

  const ind1  = document.getElementById('paso-ind-1');
  const ind2  = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');
  if (ind1)  ind1.className  = 'paso-item active';
  if (ind2)  ind2.className  = 'paso-item';
  if (linea) linea.className = 'paso-linea';

  buildGradoSelect('na-grado');
  buildSeccionSelect('na-seccion');
  aplicarRestriccionFechaNac();

  const contactosWrap = document.getElementById('na-contactos-emergencia-wrap');
  if (contactosWrap) contactosWrap.innerHTML = buildContactosEmergenciaHTML();

  const lista = document.getElementById('contactos-lista');
  if (lista) lista.innerHTML = '';

  // ✅ Limpiar buscador SIAGIE
  const buscarEl = document.getElementById('na-buscar-estudiante');
  if (buscarEl) buscarEl.value = '';
  const chip = document.getElementById('na-estudiante-seleccionado');
  if (chip) chip.style.display = 'none';
}

function calcularEdad(fechaNacStr) {
  const nacimiento = new Date(fechaNacStr);
  const hoyD = new Date();
  let edad = hoyD.getFullYear() - nacimiento.getFullYear();
  const m = hoyD.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoyD.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function validarPaso1() {
  const campos = [
    'na-nombres', 'na-apellidos', 'na-doc-numero',
    'na-telefono', 'na-fechanac', 'na-genero', 'na-grado', 'na-seccion'
  ];

  let valido = true;

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (!el) { valido = false; return; }
    const valor = (el.value || '').trim();
    if (valor === '') {
      el.style.border = '2px solid red';
      valido = false;
    } else {
      el.style.border = '';
    }
  });

  const dniEl = document.getElementById('na-doc-numero');
  const valorDNI = (dniEl?.value || '').trim();
  if (!/^\d{8}$/.test(valorDNI)) {
    if (dniEl) dniEl.style.border = '2px solid red';
    valido = false;
  } else {
    if (dniEl) dniEl.style.border = '';
  }

  const fechaNacEl  = document.getElementById('na-fechanac');
  const fechaNacVal = (fechaNacEl?.value || '').trim();
  if (fechaNacVal) {
    const edad = calcularEdad(fechaNacVal);
    if (edad < 11 || edad > 18) {
      if (fechaNacEl) fechaNacEl.style.border = '2px solid red';
      toast('⚠️ La fecha de nacimiento no corresponde a un estudiante de secundaria (11–17 años)', 'warning');
      valido = false;
    } else {
      if (fechaNacEl) fechaNacEl.style.border = '';
    }
  }

  const lista = document.getElementById('contactos-lista');
  if (lista) {
    lista.querySelectorAll('.contacto-row').forEach(row => {
      const celEl = row.querySelector('.ce-celular');
      const cel   = celEl?.value?.trim() || '';
      if (cel && !/^\d{9}$/.test(cel)) {
        celEl.style.border = '2px solid red';
        toast('⚠️ El celular de emergencia debe tener 9 dígitos', 'warning');
        valido = false;
      } else if (celEl) {
        celEl.style.border = '';
      }
    });
  }

  if (!valido) toast('⚠️ Completa todos los campos correctamente', 'warning');
  return valido;
}

function irPaso2() {
  if (!validarPaso1()) return;

  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const dni       = document.getElementById('na-doc-numero')?.value?.trim();

  document.getElementById('paso-ind-1').className = 'paso-item done';
  document.getElementById('paso-ind-2').className = 'paso-item active';
  document.getElementById('paso-linea').className = 'paso-linea done';

  document.getElementById('paso-1').style.display = 'none';
  document.getElementById('paso-2').style.display = '';

  document.getElementById('paso2-subtitulo').textContent =
    `Estudiante: ${nombres} ${apellidos} · DNI: ${dni}`;

  const fechaEl = document.getElementById('na-fecha');
  if (fechaEl) actualizarHorasSelect('na-hora', fechaEl.value);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverPaso1() {
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  const ind1  = document.getElementById('paso-ind-1');
  const ind2  = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');

  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';
  if (ind1)  ind1.className  = 'paso-item active';
  if (ind2)  ind2.className  = 'paso-item';
  if (linea) linea.className = 'paso-linea';
}

async function guardarNuevaAtencion() {
  if (!validarPaso1()) return;

  const fecha       = document.getElementById('na-fecha')?.value;
  const hora        = document.getElementById('na-hora')?.value;
  const motivoTexto = document.getElementById('na-motivo-texto')?.value?.trim();

  if (!fecha || !hora) {
    toast('Indica fecha y hora de la sesión', 'warning');
    return;
  }
  if (!motivoTexto) {
    toast('Escribe el motivo de consulta', 'warning');
    return;
  }
  if (fecha < hoy()) {
    toast('No puedes agendar en una fecha pasada', 'warning');
    return;
  }

  const disponible = await validarHorarioUnico(fecha, hora, null, store.atenciones);
  if (!disponible) {
    const libres = generarHorasDisponibles(fecha);
    const sugerencia = libres.length ? ` Próximo disponible: ${libres[0]}` : ' No hay horarios libres ese día.';
    toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
    return;
  }

  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const dni       = document.getElementById('na-doc-numero')?.value?.trim();
  const telefono  = document.getElementById('na-telefono')?.value?.trim();
  const fechanac  = document.getElementById('na-fechanac')?.value;
  const genero    = document.getElementById('na-genero')?.value;
  const grado     = document.getElementById('na-grado')?.value;
  const seccion   = document.getElementById('na-seccion')?.value;
  const nivel     = document.getElementById('na-nivel')?.value || 'moderado';
  const obs       = document.getElementById('na-observaciones')?.value?.trim();
  const contactosEmergencia = leerContactosEmergencia();

  try {
    let idestudiante;

    // ✅ Buscar si ya existe en la BD por DNI
    const estudiantesActuales = await apiFetch(`${API}/estudiantes`);
    const existente = (estudiantesActuales || []).find(e =>
      e.dni === dni ||
      (`${e.nombres} ${e.apellidos}`.toLowerCase() === `${nombres} ${apellidos}`.toLowerCase())
    );

    if (existente) {
      idestudiante = existente.id;

      const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, null, store.atenciones);
      if (!cronOk.ok) {
        toast(`❌ El alumno ya tiene una cita posterior (${cronOk.ultimaFecha} ${cronOk.ultimaHora}). Agendarla después.`, 'warning');
        return;
      }

      if (contactosEmergencia.length > 0) {
        try {
          await apiFetch(`${API}/estudiantes/${idestudiante}`, {
            method: 'PUT',
            body: JSON.stringify({ ...existente, contactosEmergencia })
          });
        } catch (_) {}
      }
    } else {
      const nivelPagina = window.location.pathname.includes('primaria') ? 'primaria' : 'secundaria';
      const nuevoEst = await apiFetch(`${API}/estudiantes`, {
        method: 'POST',
        body: JSON.stringify({
          nombres, apellidos, dni, telefono, fechanac, genero,
          grado, seccion, nivel: nivelPagina,
          condicion: 'activo',
          contactosEmergencia
        })
      });
      idestudiante = nuevoEst.id;

      store.estudiantes.push({
        id: idestudiante,
        nombres, apellidos, dni, telefono, fechanac, genero,
        grado, seccion, nivel: nivelPagina,
        condicion: 'activo',
        contactosEmergencia
      });
    }

    // ✅ Buscar o crear motivo de consulta
    let idmotivo = null;
    try {
      const motivos = await apiFetch(`${API}/motivosconsulta`);
      const encontrado = (motivos || []).find(m => m.motivoconsulta === motivoTexto);

      if (encontrado) {
        idmotivo = encontrado.id;
      } else {
        const nuevo = await apiFetch(`${API}/motivosconsulta`, {
          method: 'POST',
          body: JSON.stringify({ motivoconsulta: motivoTexto })
        });
        idmotivo = nuevo.id;
      }
    } catch (eMotivo) {
      console.error('Error con motivos:', eMotivo);
    }

    const fechahora = `${fecha}T${hora}:00`;
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante,
        fechahora,
        nivelatencion: nivel,
        idmotivo: idmotivo || null,
        estado: 'cerrado',
        observaciones: obs || null,
        grado,
        seccion
      })
    });

    agregarActividad('purple', '📝', `Nueva atención: <strong>${nombres} ${apellidos}</strong>`, 'Ahora');
    toast(`✅ Atención registrada para ${nombres} ${apellidos}`);

    await cargarDatos();

    mostrarModalSegundaCita((quiere) => {
      if (quiere) {
        abrirFormularioSegundaCita(idestudiante, `${nombres} ${apellidos}`);
      } else {
        navigateTo('historial');
      }
    });

  } catch (err) {
    console.error('Error guardando nueva atención:', err);
    toast('Error al registrar la atención', 'warning');
  }
}

// ✅ DOMContentLoaded — FUERA de guardarNuevaAtencion
document.addEventListener('DOMContentLoaded', function () {
  const naFecha = document.getElementById('na-fecha');
  if (naFecha) {
    naFecha.addEventListener('change', (e) => {
      actualizarHorasSelect('na-hora', e.target.value);
    });
  }

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

  // ✅ FIX: Cargar secciones cuando cambia el grado
  const gradoEl = document.getElementById('na-grado');
  if (gradoEl) {
    gradoEl.addEventListener('change', function () {
      buildSeccionSelect('na-seccion', this.value);
    });
  }
});