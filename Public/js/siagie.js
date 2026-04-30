// ═══════════════════════════════════════════════
// SIAGIE.JS — Importación de estudiantes por Excel
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

function inicializarSiagie() {
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('siagie-sync-time');
  if (el) el.textContent = hora;
}

// Convierte "15/03/2009" → "2009-03-15" (formato ISO para guardar)
function parsearFechaSiagie(fechaStr) {
  if (!fechaStr) return '';
  const str = String(fechaStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  return str;
}

function importarExcelSiagie(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      let filas = XLSX.utils.sheet_to_json(hoja);
    if (filas.length > 0 && !filas[0]['Nombres'] && !filas[0]['NOMBRES'] && !filas[0]['DNI']) {
  const range = XLSX.utils.decode_range(hoja['!ref']);
  let headerRow = 0;
  for (let r = range.s.r; r <= Math.min(range.e.r, 5); r++) {
    const cell = hoja[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell && /apellido|nombre/i.test(String(cell.v))) {
      headerRow = r;
      break;
    }
  }
  if (headerRow > 0) {
    filas = XLSX.utils.sheet_to_json(hoja, { range: headerRow });
  }
}
      let insertados = 0, actualizados = 0, egresados = 0, duplicados = 0, errores = 0;

      // ── 1. Construir lista de DNIs del nuevo Excel ──────────────
      const dnisNuevoExcel = new Set(
        filas.map(f => String(f['DNI'] || f['Nro Documento'] || f['NRO_DNI'] || '').trim())
             .filter(Boolean)
      );

      // ── 2. Marcar como egresados a los alumnos de 5° que ya no aparecen ──
      for (const est of store.estudiantes) {
        if (est.grado === '5' && !dnisNuevoExcel.has(est.dni)) {
          try {
            await apiFetch(`${API}/estudiantes/${est.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...est, condicion: 'egresado' })
            });
            est.condicion = 'egresado';
            egresados++;
          } catch (err) {
            console.warn(`Error marcando egresado ${est.nombres}:`, err.message);
          }
        }
      }

      // ── 3. Procesar cada fila del Excel ─────────────────────────
      for (const fila of filas) {
        const dni = String(fila['DNI'] || fila['Nro Documento'] || fila['NRO_DNI'] || '').trim();
        const nombres = (fila['Nombres'] || fila['NOMBRES'] || '').trim();
        const apellidos = (
          fila['Apellidos'] ||
          ((fila['APELLIDO PATERNO'] || fila['Apellido Paterno'] || '') + ' ' +
           (fila['APELLIDO MATERNO'] || fila['Apellido Materno'] || ''))
        ).trim();

        const grado   = String(fila['Grado']   || fila['GRADO']   || '').trim();
        const seccion = String(fila['Sección']  || fila['Seccion'] || fila['SECCION'] || '').trim();
        const fechanac = parsearFechaSiagie(fila['Fec. Nacimiento'] || fila['FECHA_NACIMIENTO'] || '');
        const generoRaw = String(fila['Género'] || fila['Genero'] || '').trim();
        const genero = generoRaw === 'Masculino' ? 'Masculino'
                     : generoRaw === 'Femenino'  ? 'Femenino' : generoRaw || '';

        if (!nombres || !apellidos) continue;

        const existe = store.estudiantes.find(est => est.dni && est.dni === dni);

        if (existe) {
          // ── Alumno ya existe: ¿cambió de grado/sección? ──
          if (existe.grado !== grado || existe.seccion !== seccion) {
            try {
              await apiFetch(`${API}/estudiantes/${existe.id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...existe, grado, seccion, condicion: 'activo' })
              });
              existe.grado   = grado;
              existe.seccion = seccion;
              existe.condicion = 'activo';
              actualizados++;
            } catch (err) {
              console.warn(`Error actualizando ${nombres}:`, err.message);
              errores++;
            }
          } else {
            duplicados++; // Mismo grado/sección → sin cambios
          }

        } else {
          // ── Alumno nuevo: insertar ──
          try {
            const guardado = await apiFetch(`${API}/estudiantes`, {
              method: 'POST',
              body: JSON.stringify({
                nombres, apellidos, dni,
                grado, seccion, fechanac, genero,
                telefono: '', condicion: 'activo'
              })
            });

            store.estudiantes.push({
              id: guardado.id,
              nombres, apellidos, dni,
              grado, seccion, fechanac, genero,
              telefono: '', condicion: 'activo',
              origen: 'siagie'
            });

            insertados++;
          } catch (err) {
            console.warn(`Error guardando ${nombres}:`, err.message);
            errores++;
          }
        }
      }

      // ── 4. Actualizar UI ─────────────────────────────────────────
      const badge = document.getElementById('badge-historial');
      if (badge) badge.textContent = store.estudiantes.filter(e =>store.atenciones.some(a => a.idestudiante === e.id)).length;

      renderTablaImportados();

      const partes = [
        insertados  ? ` ${insertados} nuevos`      : '',
        actualizados? ` ${actualizados} actualizados` : '',
        egresados   ? ` ${egresados} egresados`    : '',
        duplicados  ? ` ${duplicados} sin cambios`  : '',
        errores     ? ` ${errores} errores`         : '',
      ].filter(Boolean);

      toast(partes.join('  '));

    } catch (err) {
      console.error(err);
      toast('Error al leer el archivo Excel');
    }
  };

  reader.readAsArrayBuffer(file);
}

function renderTablaImportados() {
  const tbody = document.getElementById('siagie-tbody');
  if (!tbody) return;

  const importados = store.estudiantes.filter(e => e.origen === 'siagie');

  if (importados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="es-icon">📋</div>
        <div class="es-text">Ningún estudiante importado aún</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = importados.map(e => {
    const badge = e.condicion === 'egresado'
      ? `<span class="badge-estado" style="background:#f0f0f0;color:#888;">🎓 Egresado</span>`
      : `<span class="badge-estado activo">✅ Importado</span>`;

    return `
    <tr>
      <td><b>${e.apellidos}, ${e.nombres}</b></td>
      <td>${e.dni || '—'}</td>
      <td>${e.grado ? e.grado + '°' : '—'}</td>
      <td>${e.seccion || '—'}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

function sincronizarSiagie() {
  toast('ℹ Usa el botón "Importar Excel" para cargar la nómina de SIAGIE');
}

function navegarYFiltrar() {
  navigateTo('historial');
  setTimeout(() => {
    const input = document.getElementById('hist-search');
    if (input) {
      input.value = '';
      filterHistorial?.();
    }
  }, 200);
}

function actualizarNombreArchivo(input) {
  const el = document.getElementById('siagie-archivo');
  if (!el) return;
  if (input.files[0]) {
    el.textContent = ' Archivo seleccionado: ' + input.files[0].name;
    el.style.display = 'block';
  }
}

// ── BUSCADOR EN NUEVA ATENCIÓN ──────────────────
function buscarEstudianteSiagie(q) {
  const contenedor = document.getElementById('na-resultados-busqueda');
  if (!contenedor) return;

  const query = q.trim().toLowerCase();
  if (!query) { contenedor.style.display = 'none'; return; }

  const resultados = store.estudiantes.filter(e => {
    const nombre = `${e.nombres} ${e.apellidos}`.toLowerCase();
    return nombre.includes(query) || (e.dni && e.dni.includes(query));
  }).slice(0, 6);

  if (resultados.length === 0) {
    contenedor.style.display = 'none';
    return;
  }

  contenedor.innerHTML = resultados.map(e => `
    <div onclick="seleccionarEstudianteSiagie(${e.id})"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--color-border-tertiary);display:flex;align-items:center;gap:10px;"
      onmouseover="this.style.background='#EEEDFE'"
      onmouseout="this.style.background=''">
      <div style="width:32px;height:32px;border-radius:50%;background:#534AB7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">
        ${(e.nombres[0] + e.apellidos[0]).toUpperCase()}
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">${e.apellidos}, ${e.nombres}</div>
        <!--  Grado y sección separados con ° -->
        <div style="font-size:11px;color:var(--color-text-secondary);">
          DNI: ${e.dni || '—'} · ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}
        </div>
      </div>
    </div>
  `).join('');

  contenedor.style.display = 'block';
}

function seleccionarEstudianteSiagie(id) {
  const e = store.estudiantes.find(est => est.id === id);
  if (!e) return;

  document.getElementById('na-nombres').value    = e.nombres   || '';
  document.getElementById('na-apellidos').value  = e.apellidos || '';
  document.getElementById('na-doc-numero').value = e.dni       || '';
  //  fechanac ya está en formato ISO "YYYY-MM-DD", compatible con input type="date"
  document.getElementById('na-fechanac').value   = e.fechanac  || '';

  const generoSelect = document.getElementById('na-genero');
  if (generoSelect && e.genero) {
    [...generoSelect.options].forEach(o => {
      if (o.value.toLowerCase() === e.genero.toLowerCase()) generoSelect.value = o.value;
    });
  }

 const gradoSelect = document.getElementById('na-grado');
if (gradoSelect && e.grado) {
  const gradoStr = String(e.grado).trim();
  // Buscar coincidencia exacta o parcial
  let encontrado = false;
  [...gradoSelect.options].forEach(o => {
    if (o.value === gradoStr || o.text.includes(gradoStr)) {
      gradoSelect.value = o.value;
      encontrado = true;
    }
  });
  // Si no hay opción aún, crearla temporalmente
  if (!encontrado && gradoStr) {
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

  const chip = document.getElementById('na-estudiante-seleccionado');
  const chipNombre = document.getElementById('na-estudiante-nombre');
  if (chip && chipNombre) {
    // Muestra grado y sección correctamente
    chipNombre.textContent = `✓ ${e.apellidos}, ${e.nombres} — ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}`;
    chip.style.display = 'flex';
  }

  document.getElementById('na-buscar-estudiante').value = '';
  document.getElementById('na-resultados-busqueda').style.display = 'none';
}

function limpiarEstudianteSeleccionado() {
  ['na-nombres','na-apellidos','na-doc-numero','na-fechanac'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const chip = document.getElementById('na-estudiante-seleccionado');
  if (chip) chip.style.display = 'none';
}