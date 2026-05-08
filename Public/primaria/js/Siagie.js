// ═══════════════════════════════════════════════
// SIAGIE.JS — PsiControl · Primaria
// Importa nómina Excel de Primaria (1° a 6°)
// También recibe estudiantes enviados desde Secundaria
// ═══════════════════════════════════════════════

// Nivel fijo para este módulo
const NIVEL_PRIMARIA  = 'primaria';
const GRADO_MAX       = '6';           // 6° = último grado primaria
const API_BULK        = `${API}/estudiantes/primaria/bulk`;

// ── Inicialización ────────────────────────────────
function inicializarSiagie() {
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const el   = document.getElementById('siagie-sync-time');
  if (el) el.textContent = hora;

  // Mostrar estudiantes que ya vinieron de secundaria
  renderTablaImportados();
}

// ── Parsear fecha desde Excel ─────────────────────
function parsearFechaSiagie(fechaStr) {
  if (!fechaStr) return '';
  const str = String(fechaStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d+$/.test(str) && parseInt(str) > 10000) {
    const date = new Date(Math.round((parseInt(str) - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  return str;
}

// ── Obtener columna por múltiples claves ──────────
function getCol(fila, ...claves) {
  for (const clave of claves) {
    const val = fila[clave];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

// ── Barra de progreso ──────────────────────────────
function mostrarProgreso(actual, total, mensaje) {
  let barra = document.getElementById('siagie-barra-progreso');
  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'siagie-barra-progreso';
    barra.innerHTML = `
      <div style="
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:#1e1b4b;color:#fff;border-radius:12px;
        padding:14px 24px;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.3);
        z-index:9999;font-family:inherit;
      ">
        <div id="siagie-progreso-msg" style="font-size:13px;margin-bottom:8px;font-weight:500;"></div>
        <div style="background:rgba(255,255,255,0.15);border-radius:99px;height:6px;overflow:hidden;">
          <div id="siagie-progreso-fill" style="height:100%;background:#818cf8;border-radius:99px;transition:width 0.3s ease;width:0%"></div>
        </div>
        <div id="siagie-progreso-pct" style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:6px;text-align:right;"></div>
      </div>`;
    document.body.appendChild(barra);
  }
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  document.getElementById('siagie-progreso-msg').textContent  = mensaje || 'Importando...';
  document.getElementById('siagie-progreso-fill').style.width = pct + '%';
  document.getElementById('siagie-progreso-pct').textContent  = `${actual} / ${total} — ${pct}%`;
}

function ocultarProgreso() {
  const barra = document.getElementById('siagie-barra-progreso');
  if (barra) {
    barra.style.opacity    = '0';
    barra.style.transition = 'opacity 0.5s';
    setTimeout(() => barra.remove(), 500);
  }
}

// ═══════════════════════════════════════════════════
// IMPORTAR EXCEL — solo primaria (1° a 6°)
// ═══════════════════════════════════════════════════
function importarExcelSiagie(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const hoja     = workbook.Sheets[workbook.SheetNames[0]];
      const range    = XLSX.utils.decode_range(hoja['!ref']);

      // ── Detectar fila de encabezados ──────────
      let headerRow = 0;
      const keywordHeader = /^(apellido|nombres?|dni|nro\.?\s*doc|n[uú]mero\s*de\s*doc|fec|fecha|g[eé]nero|sexo)/i;

      outer:
      for (let r = range.s.r; r <= Math.min(range.e.r, 15); r++) {
        let hits = 0;
        for (let c = range.s.c; c <= Math.min(range.e.c, 15); c++) {
          const cell = hoja[XLSX.utils.encode_cell({ r, c })];
          if (cell && keywordHeader.test(String(cell.v).trim())) hits++;
        }
        if (hits >= 2) { headerRow = r; break outer; }
      }

      const filas = XLSX.utils.sheet_to_json(hoja, { range: headerRow, defval: '' });

      console.log(`[SIAGIE-PRIMARIA] Total filas: ${filas.length}`);
      if (filas.length > 0) console.log('[SIAGIE-PRIMARIA] Columnas:', Object.keys(filas[0]));

      // ── Parsear filas ─────────────────────────
      const nuevos     = [];
      const actualizar = [];
      let egresados = 0, duplicados = 0, errores = 0;
      const dnisDelExcel = new Set();

      for (const fila of filas) {
        const dni = getCol(fila,
          'DNI','Nro Documento','NRO_DNI','Nro. Documento','NUMDOC','NUM_DOC','Número de Documento'
        );
        const nombres = getCol(fila, 'Nombres','NOMBRES','nombres','NOMBRE','Nombre');

        const apJunto   = getCol(fila, 'Apellidos','APELLIDOS','apellidos');
        const apPaterno = getCol(fila, 'APELLIDO PATERNO','Apellido Paterno','AP_PATERNO','Ap. Paterno');
        const apMaterno = getCol(fila, 'APELLIDO MATERNO','Apellido Materno','AP_MATERNO','Ap. Materno');
        const apellidos = (apJunto || `${apPaterno} ${apMaterno}`).trim();

        const grado   = getCol(fila, 'Grado','GRADO','grado','GRD').replace(/°|º/g, '').trim();
        const seccion = getCol(fila, 'Sección','Seccion','SECCION','SECCIÓN','seccion','SEC');
        const fechanac = parsearFechaSiagie(
          getCol(fila, 'Fec. Nacimiento','FECHA_NACIMIENTO','Fecha Nacimiento','FEC_NAC','FECNAC')
        );

        const generoRaw = getCol(fila, 'Género','Genero','GENERO','GÉNERO','Sexo','SEXO');
        const genero    = normalizar(generoRaw) === 'masculino' ? 'Masculino'
                        : normalizar(generoRaw) === 'femenino'  ? 'Femenino'
                        : generoRaw;

        // Saltar filas vacías o totales
        if (!nombres || !apellidos) continue;
        if (/^total|^resumen|^cantidad/i.test(nombres)) continue;

        // Solo aceptar grados de primaria (1 al 6)
        const gradoNum = parseInt(grado);
        if (gradoNum < 1 || gradoNum > 6) continue;

        if (dni) dnisDelExcel.add(dni);

        const existe = store.estudiantes.find(est => est.dni && est.dni === dni);
        if (existe) {
          if (existe.grado !== grado || existe.seccion !== seccion) {
            actualizar.push({ ...existe, grado, seccion, condicion: 'activo' });
          } else {
            duplicados++;
          }
        } else {
          nuevos.push({ nombres, apellidos, dni, grado, seccion, fechanac, genero, condicion: 'activo', nivel: NIVEL_PRIMARIA });
        }
      }

      // ── Marcar egresados de 6° que ya no están ──
      mostrarProgreso(0, 1, '🎓 Verificando egresados de 6°...');
      for (const est of store.estudiantes) {
        if (est.grado === GRADO_MAX && !dnisDelExcel.has(est.dni)) {
          try {
            await apiFetch(`${API}/estudiantes/${est.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...est, condicion: 'egresado' })
            });
            est.condicion = 'egresado';
            egresados++;
          } catch (err) {
            console.warn(`[SIAGIE-PRIMARIA] Error egresado ${est.nombres}:`, err.message);
          }
        }
      }

      // ── Enviar nuevos en lotes de 50 ──────────
      const LOTE = 50;
      const totalOps = nuevos.length + actualizar.length;
      let procesados = 0, insertados = 0;

      for (let i = 0; i < nuevos.length; i += LOTE) {
        const lote = nuevos.slice(i, i + LOTE);
        mostrarProgreso(procesados, totalOps, `⬆️ Insertando... (${Math.min(i + LOTE, nuevos.length)}/${nuevos.length})`);
        try {
          const res = await apiFetch(API_BULK, {
            method: 'POST',
            body: JSON.stringify({ estudiantes: lote, nivel: NIVEL_PRIMARIA })
          });
          insertados += res.insertados || 0;
          errores    += res.errores    || 0;
          if (res.detalle) {
            res.detalle.filter(d => d.accion === 'insertado').forEach((d, idx) => {
              const est = lote[idx];
              if (est) store.estudiantes.push({ ...est, id: d.id, origen: 'siagie' });
            });
          }
        } catch (err) {
          console.error('[SIAGIE-PRIMARIA] Error bulk:', err.message);
          errores += lote.length;
        }
        procesados += lote.length;
      }

      // ── Actualizar en lotes de 50 ─────────────
      let actualizados = 0;
      for (let i = 0; i < actualizar.length; i += LOTE) {
        const lote = actualizar.slice(i, i + LOTE);
        mostrarProgreso(procesados, totalOps, `🔄 Actualizando... (${Math.min(i + LOTE, actualizar.length)}/${actualizar.length})`);
        try {
          const res = await apiFetch(API_BULK, {
            method: 'POST',
            body: JSON.stringify({ estudiantes: lote, nivel: NIVEL_PRIMARIA })
          });
          actualizados += res.actualizados || 0;
          errores      += res.errores      || 0;
          lote.forEach(est => {
            const local = store.estudiantes.find(e => e.id === est.id);
            if (local) { local.grado = est.grado; local.seccion = est.seccion; local.condicion = 'activo'; }
          });
        } catch (err) {
          console.error('[SIAGIE-PRIMARIA] Error actualizar:', err.message);
          errores += lote.length;
        }
        procesados += lote.length;
      }

      mostrarProgreso(totalOps, totalOps, '✅ Importación completada');
      setTimeout(ocultarProgreso, 2000);

      renderTablaImportados();

      const partes = [
        insertados   ? `✅ ${insertados} nuevos`      : '',
        actualizados ? `🔄 ${actualizados} actualizados` : '',
        egresados    ? `🎓 ${egresados} egresados`    : '',
        duplicados   ? `➖ ${duplicados} sin cambios` : '',
        errores      ? `❌ ${errores} errores`         : '',
      ].filter(Boolean);
      toast(partes.join('  ') || 'Sin cambios');

    } catch (err) {
      ocultarProgreso();
      console.error('[SIAGIE-PRIMARIA] Error crítico:', err);
      toast('❌ Error al leer el archivo Excel');
    }
  };

  reader.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════════════════
// RECIBIR ESTUDIANTES DESDE SECUNDARIA
// El módulo de secundaria llama: window.recibirDeSecundaria(estudiantes)
// ═══════════════════════════════════════════════════
window.recibirDeSecundaria = async function (estudiantesDeSecundaria) {
  if (!Array.isArray(estudiantesDeSecundaria) || estudiantesDeSecundaria.length === 0) {
    toast('⚠️ No hay estudiantes para transferir');
    return;
  }

  let insertados = 0, duplicados = 0, errores = 0;
  const LOTE = 50;

  // Marcar que vienen de secundaria (para identificarlos)
  const preparados = estudiantesDeSecundaria.map(e => ({
    ...e,
    nivel:     NIVEL_PRIMARIA,
    condicion: 'activo',
    origen:    'transferido-secundaria'
  }));

  mostrarProgreso(0, preparados.length, '📥 Recibiendo desde Secundaria...');

  for (let i = 0; i < preparados.length; i += LOTE) {
    const lote = preparados.slice(i, i + LOTE);
    mostrarProgreso(i, preparados.length, `📥 Transfiriendo... (${Math.min(i + LOTE, preparados.length)}/${preparados.length})`);
    try {
      const res = await apiFetch(API_BULK, {
        method: 'POST',
        body: JSON.stringify({ estudiantes: lote, nivel: NIVEL_PRIMARIA })
      });
      insertados += res.insertados  || 0;
      duplicados += res.duplicados  || 0;
      errores    += res.errores     || 0;

      if (res.detalle) {
        res.detalle.filter(d => d.accion === 'insertado').forEach((d, idx) => {
          const est = lote[idx];
          if (est) store.estudiantes.push({ ...est, id: d.id });
        });
      }
    } catch (err) {
      console.error('[SIAGIE-PRIMARIA] Error recibiendo de secundaria:', err.message);
      errores += lote.length;
    }
  }

  mostrarProgreso(preparados.length, preparados.length, '✅ Transferencia completada');
  setTimeout(ocultarProgreso, 2000);
  renderTablaImportados();

  const partes = [
    insertados ? `✅ ${insertados} transferidos a Primaria` : '',
    duplicados ? `➖ ${duplicados} ya existían`             : '',
    errores    ? `❌ ${errores} errores`                    : '',
  ].filter(Boolean);
  toast(partes.join('  ') || 'Sin cambios');
};

// ── Tabla de estudiantes importados ───────────────
function renderTablaImportados() {
  const tbody = document.getElementById('siagie-tbody');
  if (!tbody) return;

  // Mostrar todos los estudiantes de primaria (importados + transferidos)
  const lista = store.estudiantes;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="es-icon">📋</div>
        <div class="es-text">Ningún estudiante importado aún</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(e => {
    const badge = e.condicion === 'egresado'
      ? `<span class="badge-estado" style="background:#f0f0f0;color:#888;">🎓 Egresado</span>`
      : e.origen === 'transferido-secundaria'
        ? `<span class="badge-estado" style="background:#fff7ed;color:#c2410c;">🔀 De Secundaria</span>`
        : `<span class="badge-estado activo">✅ Importado</span>`;

    return `<tr>
      <td><b>${e.apellidos || ''}, ${e.nombres || ''}</b></td>
      <td>${e.dni || '—'}</td>
      <td>${e.grado ? e.grado + '°' : '—'}</td>
      <td>${e.seccion || '—'}</td>
      <td>
        <span style="font-size:11px;background:#d1fae5;color:#065f46;
              padding:2px 8px;border-radius:99px;font-weight:600;">Primaria</span>
      </td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

// ── Helpers UI ────────────────────────────────────
function actualizarNombreArchivo(input) {
  const el = document.getElementById('siagie-archivo');
  if (!el) return;
  if (input.files[0]) {
    el.textContent = ' Archivo: ' + input.files[0].name;
    el.style.display = 'block';
  }
}

function sincronizarSiagie() {
  toast('ℹ Usa el botón "Importar Excel" para cargar la nómina de Primaria');
}

// ── Búsqueda en formulario "Nuevo" ────────────────
function buscarEstudianteSiagie(q) {
  const contenedor = document.getElementById('na-resultados-busqueda');
  if (!contenedor) return;

  const query = normalizar(q);
  if (!query) { contenedor.style.display = 'none'; return; }

  const idsConAtencion = new Set(store.atenciones.map(a => a.idestudiante));
  const resultados = store.estudiantes.filter(e => {
    if (!idsConAtencion.has(e.id)) return false;
    const nombre    = normalizar(`${e.nombres} ${e.apellidos}`);
    const nombreInv = normalizar(`${e.apellidos} ${e.nombres}`);
    return nombre.includes(query) || nombreInv.includes(query) || (e.dni && e.dni.includes(query));
  }).slice(0, 6);

  if (!resultados.length) { contenedor.style.display = 'none'; return; }

  contenedor.innerHTML = resultados.map(e => `
    <div onclick="seleccionarEstudianteSiagie(${e.id})"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);
             display:flex;align-items:center;gap:10px;"
      onmouseover="this.style.background='#EEEDFE'" onmouseout="this.style.background=''">
      <div style="width:32px;height:32px;border-radius:50%;background:#534AB7;color:#fff;
                  display:flex;align-items:center;justify-content:center;font-size:11px;
                  font-weight:700;flex-shrink:0;">
        ${((e.nombres?.[0] || '') + (e.apellidos?.[0] || '')).toUpperCase()}
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;">${e.apellidos}, ${e.nombres}</div>
        <div style="font-size:11px;color:var(--text3);">DNI: ${e.dni || '—'} · ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}</div>
      </div>
    </div>`).join('');

  contenedor.style.display = 'block';
}

function seleccionarEstudianteSiagie(id) {
  const e = store.estudiantes.find(est => est.id === id);
  if (!e) return;

  document.getElementById('na-nombres').value    = e.nombres   || '';
  document.getElementById('na-apellidos').value  = e.apellidos || '';
  document.getElementById('na-doc-numero').value = e.dni       || '';
  document.getElementById('na-fechanac').value   = e.fechanac  || '';

  const generoSelect = document.getElementById('na-genero');
  if (generoSelect && e.genero) {
    [...generoSelect.options].forEach(o => {
      if (normalizar(o.value) === normalizar(e.genero)) generoSelect.value = o.value;
    });
  }

  const gradoSelect = document.getElementById('na-grado');
  if (gradoSelect && e.grado) {
    const gradoStr = String(e.grado).trim();
    let encontrado = false;
    [...gradoSelect.options].forEach(o => {
      if (o.value === gradoStr || o.text.includes(gradoStr)) { gradoSelect.value = o.value; encontrado = true; }
    });
    if (!encontrado) {
      const opt = new Option(`${gradoStr}°`, gradoStr, true, true);
      gradoSelect.add(opt);
      gradoSelect.value = gradoStr;
    }
  }

  const seccionSelect = document.getElementById('na-seccion');
  if (seccionSelect && e.seccion) {
    [...seccionSelect.options].forEach(o => {
      if (o.value === e.seccion) seccionSelect.value = o.value;
    });
  }

  const chip      = document.getElementById('na-estudiante-seleccionado');
  const chipNombre = document.getElementById('na-estudiante-nombre');
  if (chip && chipNombre) {
    chipNombre.textContent = `✓ ${e.apellidos}, ${e.nombres} — ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}`;
    chip.style.display = 'flex';
  }

  document.getElementById('na-buscar-estudiante').value = '';
  document.getElementById('na-resultados-busqueda').style.display = 'none';
}

function limpiarEstudianteSeleccionado() {
  ['na-nombres','na-apellidos','na-doc-numero','na-fechanac'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const chip = document.getElementById('na-estudiante-seleccionado');
  if (chip) chip.style.display = 'none';
}