// ═══════════════════════════════════════════════
// SIAGIE-PRIMARIA.JS — PsiControl
// Importación de nómina Excel · Primaria (1° a 6°)
// ═══════════════════════════════════════════════

const NIVEL_PRIMARIA = 'primaria';
const GRADO_MAX_PRIM = '6';
const API_BULK_PRIM  = `${API}/estudiantes/primaria/bulk`;

// ── Inicialización ────────────────────────────────────────────────────────────
function inicializarSiagie() {
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const el   = document.getElementById('siagie-sync-time');
  if (el) el.textContent = hora;
  renderTablaImportados();
}

// ── Parsear fecha desde Excel ─────────────────────────────────────────────────
function parsearFechaSiagie(fechaStr) {
  if (!fechaStr) return '';
  const str = String(fechaStr).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    if (parseInt(m) < 1 || parseInt(m) > 12) return '';
    if (parseInt(d) < 1 || parseInt(d) > 31) return '';
    return `${y}-${m}-${d}`;
  }

  if (/^\d+$/.test(str) && parseInt(str) > 10000 && parseInt(str) < 100000) {
    try {
      const date = new Date(Math.round((parseInt(str) - 25569) * 86400 * 1000));
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch { return ''; }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return '';
}

// ── Normalizar texto ──────────────────────────────────────────────────────────
function normalizar(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ── Obtener columna por múltiples claves ──────────────────────────────────────
function getCol(fila, ...claves) {
  for (const clave of claves) {
    const val = fila[clave];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

// ── Validar DNI peruano ───────────────────────────────────────────────────────
function validarDNI(dni) {
  if (!dni) return { valido: false, motivo: 'vacío' };
  const limpio = String(dni).trim().replace(/\s/g, '');
  if (!/^\d{8}$/.test(limpio)) return { valido: false, motivo: `"${limpio}" no es un DNI válido (debe tener 8 dígitos)` };
  return { valido: true, valor: limpio };
}

// ── Validar estructura mínima de nómina SIAGIE ───────────────────────────────
function validarEstructuraSiagie(filas) {
  if (!filas || filas.length === 0)
    return { valido: false, motivo: 'El archivo está vacío o no contiene datos.' };

  const columnasExcel = Object.keys(filas[0]).map(k => normalizar(k));
  const gruposRequeridos = [
    { nombre: 'Nombres',   variantes: ['nombres', 'nombre'] },
    { nombre: 'Apellidos', variantes: ['apellidos', 'apellido', 'ap. paterno', 'ap paterno', 'apellido paterno'] },
    { nombre: 'Grado',     variantes: ['grado', 'grd'] },
  ];

  const faltantes = gruposRequeridos.filter(grupo =>
    !columnasExcel.some(col => grupo.variantes.some(v => col.includes(v)))
  );

  if (faltantes.length > 0) {
    return {
      valido: false,
      motivo: `No se encontraron las columnas: ${faltantes.map(g => g.nombre).join(', ')}. ¿Es una nómina SIAGIE?`
    };
  }
  return { valido: true };
}

// ── Detectar filas basura ─────────────────────────────────────────────────────
function esFilaBasura(nombres, apellidos) {
  const regexBasura = /^total|^resumen|^cantidad|^\*+|^-{2,}|^={2,}|^#{2,}|\bturno\b|\bnivel\b|^n[uú]mero|^nro\.?\s*$/i;
  if (regexBasura.test(nombres))  return true;
  if (regexBasura.test(apellidos)) return true;
  if (nombres && /^[\d\s\-\/\.\,\*]+$/.test(nombres)) return true;
  const encabezadosComunes = ['nombres', 'apellidos', 'dni', 'grado', 'seccion', 'genero', 'fecha'];
  if (encabezadosComunes.includes(normalizar(nombres))) return true;
  if ((nombres + apellidos).replace(/[\s\-]/g, '').length < 4) return true;
  return false;
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
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
        z-index:9999;font-family:inherit;">
        <div id="siagie-progreso-msg" style="font-size:13px;margin-bottom:8px;font-weight:500;"></div>
        <div style="background:rgba(255,255,255,0.15);border-radius:99px;height:6px;overflow:hidden;">
          <div id="siagie-progreso-fill" style="height:100%;background:#818cf8;border-radius:99px;transition:width 0.3s ease;width:0%"></div>
        </div>
        <div id="siagie-progreso-pct" style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:6px;text-align:right;"></div>
      </div>`;
    document.body.appendChild(barra);
  }
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  document.getElementById('siagie-progreso-msg').textContent  = mensaje || 'Procesando...';
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

// ── Modal de alerta ───────────────────────────────────────────────────────────
function mostrarAlertaSiagie(titulo, mensaje, detalle = null) {
  const previo = document.getElementById('siagie-alerta-modal');
  if (previo) previo.remove();

  const modal = document.createElement('div');
  modal.id = 'siagie-alerta-modal';
  modal.innerHTML = `
    <div style="
      position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:10000;display:flex;align-items:center;justify-content:center;">
      <div style="
        background:#fff;border-radius:16px;padding:28px 32px;
        max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:inherit;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="font-size:28px;">⚠️</div>
          <div style="font-size:16px;font-weight:700;color:#1e1b4b;">${titulo}</div>
        </div>
        <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:${detalle ? '12px' : '20px'};">
          ${mensaje}
        </div>
        ${detalle ? `<div style="
          background:#f8f7ff;border:1px solid #e0deff;border-radius:8px;
          padding:10px 14px;font-size:12px;color:#534AB7;margin-bottom:20px;
          max-height:120px;overflow-y:auto;font-family:monospace;line-height:1.7;">
          ${detalle}</div>` : ''}
        <button onclick="document.getElementById('siagie-alerta-modal').remove()" style="
          width:100%;padding:10px;background:#534AB7;color:#fff;border:none;
          border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          Entendido
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ── Modal de advertencias ─────────────────────────────────────────────────────
function mostrarResumenAdvertencias(advertencias) {
  if (!advertencias || advertencias.length === 0) return;
  const previo = document.getElementById('siagie-advertencias-modal');
  if (previo) previo.remove();

  const modal = document.createElement('div');
  modal.id = 'siagie-advertencias-modal';
  modal.innerHTML = `
    <div style="
      position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:10000;display:flex;align-items:center;justify-content:center;">
      <div style="
        background:#fff;border-radius:16px;padding:28px 32px;
        max-width:520px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:inherit;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="font-size:24px;">📋</div>
          <div style="font-size:16px;font-weight:700;color:#1e1b4b;">Advertencias de importación</div>
        </div>
        <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
          Los siguientes registros tuvieron problemas:
        </p>
        <div style="max-height:200px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;">
          ${advertencias.map((adv, i) => `
            <div style="
              padding:8px 14px;font-size:12px;
              border-bottom:1px solid #f3f4f6;
              background:${i % 2 === 0 ? '#fff' : '#fafafa'};
              display:flex;gap:8px;align-items:flex-start;">
              <span style="color:#f59e0b;font-size:14px;flex-shrink:0;">⚠</span>
              <span style="color:#374151;line-height:1.5;">${adv}</span>
            </div>`).join('')}
        </div>
        <button onclick="document.getElementById('siagie-advertencias-modal').remove()" style="
          width:100%;padding:10px;background:#534AB7;color:#fff;border:none;
          border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          Cerrar
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTAR EXCEL — Primaria (1° a 6°)
// ═══════════════════════════════════════════════════════════════════════════════
function importarExcelSiagie(file) {
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    mostrarAlertaSiagie(
      'Formato de archivo incorrecto',
      `El archivo "<b>${file.name}</b>" no es un archivo Excel válido.<br><br>
       Solo se aceptan archivos <b>.xlsx</b> o <b>.xls</b> exportados desde SIAGIE.`
    );
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    mostrarAlertaSiagie(
      'Archivo demasiado grande',
      'El archivo supera los 10 MB. Verifica que sea la nómina correcta de SIAGIE.'
    );
    return;
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      mostrarProgreso(0, 1, '📂 Leyendo archivo...');

      const workbook = XLSX.read(e.target.result, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        ocultarProgreso();
        mostrarAlertaSiagie('Archivo sin hojas',
          'El archivo Excel no contiene ninguna hoja de datos. Verifica que sea la nómina correcta de SIAGIE.');
        return;
      }

      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      if (!hoja || !hoja['!ref']) {
        ocultarProgreso();
        mostrarAlertaSiagie('Hoja vacía',
          'La primera hoja del archivo está vacía. Verifica que sea la nómina correcta de SIAGIE.');
        return;
      }

      const range = XLSX.utils.decode_range(hoja['!ref']);

      // ── Detectar fila de encabezados ──────────────────────────────────
      let headerRow = -1;
      const keywordHeader = /^(apellido|nombres?|dni|nro\.?\s*doc|n[uú]mero\s*de\s*doc|fec|fecha|g[eé]nero|sexo|grado|secci[oó]n)/i;

      for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
        let hits = 0;
        for (let c = range.s.c; c <= Math.min(range.e.c, 15); c++) {
          const cell = hoja[XLSX.utils.encode_cell({ r, c })];
          if (cell && keywordHeader.test(String(cell.v || '').trim())) hits++;
        }
        if (hits >= 2) { headerRow = r; break; }
      }

      if (headerRow === -1) {
        ocultarProgreso();
        mostrarAlertaSiagie(
          'Estructura no reconocida',
          'No se encontraron los encabezados de columna esperados en el archivo.<br><br>' +
          'Una nómina SIAGIE debe tener columnas como <b>Apellidos</b>, <b>Nombres</b>, <b>DNI</b>, <b>Grado</b>, etc.',
          'Columnas buscadas: Apellidos, Nombres, DNI / Nro Documento, Fecha Nacimiento, Género, Grado, Sección'
        );
        return;
      }

      const filas = XLSX.utils.sheet_to_json(hoja, { range: headerRow, defval: '' });

      console.log(`[SIAGIE-PRIM] Total filas: ${filas.length}`);
      if (filas.length > 0) console.log('[SIAGIE-PRIM] Columnas:', Object.keys(filas[0]));

      // ── Validar estructura mínima ─────────────────────────────────────
      const validacion = validarEstructuraSiagie(filas);
      if (!validacion.valido) {
        ocultarProgreso();
        mostrarAlertaSiagie(
          'El archivo no es una nómina SIAGIE',
          validacion.motivo,
          `Columnas encontradas: ${Object.keys(filas[0] || {}).join(', ') || '(ninguna)'}`
        );
        return;
      }

      // ── Parsear filas ─────────────────────────────────────────────────
      const nuevos      = [];
      const actualizar  = [];
      const advertencias = [];
      let egresados = 0, duplicados = 0, errores = 0, filasBasura = 0;
      const dnisDelExcel = new Set();

      for (const fila of filas) {
        const nombres   = getCol(fila, 'Nombres', 'NOMBRES', 'nombres', 'NOMBRE', 'Nombre');
        const apJunto   = getCol(fila, 'Apellidos', 'APELLIDOS', 'apellidos');
        const apPaterno = getCol(fila, 'APELLIDO PATERNO', 'Apellido Paterno', 'AP_PATERNO', 'Ap. Paterno');
        const apMaterno = getCol(fila, 'APELLIDO MATERNO', 'Apellido Materno', 'AP_MATERNO', 'Ap. Materno');
        const apellidos = (apJunto || `${apPaterno} ${apMaterno}`).trim();

        if (!nombres && !apellidos) { filasBasura++; continue; }
        if (esFilaBasura(nombres, apellidos)) { filasBasura++; continue; }

        const dniRaw = getCol(fila, 'DNI', 'Nro Documento', 'NRO_DNI', 'Nro. Documento', 'NUMDOC', 'NUM_DOC', 'Número de Documento');
        const dniVal = validarDNI(dniRaw);
        const dni    = dniVal.valido ? dniVal.valor : '';
        if (dniRaw && !dniVal.valido) {
          advertencias.push(`${apellidos}, ${nombres} — DNI inválido: ${dniVal.motivo}. Se importará sin DNI.`);
        }

        const grado   = getCol(fila, 'Grado', 'GRADO', 'grado', 'GRD').replace(/[°º]/g, '').trim();
        const seccion = getCol(fila, 'Sección', 'Seccion', 'SECCION', 'SECCIÓN', 'seccion', 'SEC');
        const fechanac = parsearFechaSiagie(
          getCol(fila, 'Fec. Nacimiento', 'FECHA_NACIMIENTO', 'Fecha Nacimiento', 'FEC_NAC', 'Fecha de Nacimiento', 'FECNAC')
        );

        const generoRaw  = getCol(fila, 'Género', 'Genero', 'GENERO', 'GÉNERO', 'Sexo', 'SEXO');
        const generoNorm = normalizar(generoRaw);
        const genero     = generoNorm === 'masculino' || generoNorm === 'm' ? 'Masculino'
                         : generoNorm === 'femenino'  || generoNorm === 'f' ? 'Femenino'
                         : generoRaw;

        // Solo aceptar grados válidos de primaria (1 al 6)
        const gradoNum = parseInt(grado);
        if (grado && (gradoNum < 1 || gradoNum > 6)) {
          advertencias.push(`${apellidos}, ${nombres} — Grado "${grado}" no corresponde a Primaria (1°-6°). Se omitirá.`);
          filasBasura++;
          continue;
        }

        if (!grado) {
          advertencias.push(`${apellidos}, ${nombres} — no tiene Grado definido. Se importará sin grado.`);
        }

        if (dni) dnisDelExcel.add(dni);

        const existe = store.estudiantes.find(est => est.dni && est.dni === dni && dni !== '');
        if (existe) {
          if (existe.grado !== grado || existe.seccion !== seccion) {
            actualizar.push({ ...existe, grado, seccion, condicion: 'activo' });
          } else {
            duplicados++;
          }
        } else {
          nuevos.push({
            nombres, apellidos, dni, grado, seccion,
            fechanac, genero, condicion: 'activo',
            nivel: NIVEL_PRIMARIA, origen: 'siagie'
          });
        }
      }

      console.log(`[SIAGIE-PRIM] Basura: ${filasBasura} | Nuevos: ${nuevos.length} | Actualizar: ${actualizar.length}`);

      if (nuevos.length === 0 && actualizar.length === 0) {
        ocultarProgreso();
        mostrarAlertaSiagie(
          'No se encontraron estudiantes válidos',
          `Se leyeron <b>${filas.length} filas</b> pero ninguna contiene datos válidos de Primaria.<br><br>
           Verifica que el archivo sea la nómina de <b>Primaria</b> (grados 1° a 6°).`,
          advertencias.length > 0 ? advertencias.slice(0, 5).join('\n') : null
        );
        return;
      }

      // ── Marcar egresados de 6° ────────────────────────────────────────
      mostrarProgreso(0, 1, '🎓 Verificando egresados de 6°...');
      for (const est of store.estudiantes) {
        if (est.nivel === NIVEL_PRIMARIA && est.grado === GRADO_MAX_PRIM && !dnisDelExcel.has(est.dni)) {
          try {
            await apiFetch(`${API}/estudiantes/${est.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...est, condicion: 'egresado' })
            });
            est.condicion = 'egresado';
            egresados++;
          } catch (err) {
            console.warn(`[SIAGIE-PRIM] Error egresado ${est.nombres}:`, err.message);
          }
        }
      }

      // ── Enviar nuevos en lotes ────────────────────────────────────────
      const LOTE = 50;
      const totalOps = nuevos.length + actualizar.length;
      let procesados = 0, insertados = 0;

      for (let i = 0; i < nuevos.length; i += LOTE) {
        const lote = nuevos.slice(i, i + LOTE);
        mostrarProgreso(procesados, totalOps,
          `⬆️ Insertando... (${Math.min(i + LOTE, nuevos.length)}/${nuevos.length})`);
        try {
          const res = await apiFetch(API_BULK_PRIM, {
            method: 'POST',
            body: JSON.stringify({ estudiantes: lote, nivel: NIVEL_PRIMARIA })
          });
          insertados += res.insertados || 0;
          errores    += res.errores    || 0;
          if (res.detalle) {
            res.detalle.filter(d => d.accion === 'insertado').forEach((d, idx) => {
              const est = lote[idx];
              if (est) store.estudiantes.push({ ...est, id: d.id });
            });
          }
        } catch (err) {
          console.error('[SIAGIE-PRIM] Error bulk:', err.message);
          errores += lote.length;
        }
        procesados += lote.length;
      }

      // ── Actualizar existentes ─────────────────────────────────────────
      let actualizados = 0;
      for (let i = 0; i < actualizar.length; i += LOTE) {
        const lote = actualizar.slice(i, i + LOTE);
        mostrarProgreso(procesados, totalOps,
          `🔄 Actualizando... (${Math.min(i + LOTE, actualizar.length)}/${actualizar.length})`);
        try {
          const res = await apiFetch(API_BULK_PRIM, {
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
          console.error('[SIAGIE-PRIM] Error actualizar:', err.message);
          errores += lote.length;
        }
        procesados += lote.length;
      }

      mostrarProgreso(totalOps, totalOps, '✅ Importación completada');
      setTimeout(ocultarProgreso, 2000);

      renderTablaImportados();

      const partes = [
        insertados   ? `✅ ${insertados} nuevos`          : '',
        actualizados ? `🔄 ${actualizados} actualizados`  : '',
        egresados    ? `🎓 ${egresados} egresados`        : '',
        duplicados   ? `➖ ${duplicados} sin cambios`     : '',
        errores      ? `❌ ${errores} errores`            : '',
      ].filter(Boolean);
      toast(partes.join('  ') || 'Sin cambios detectados');

      if (advertencias.length > 0) {
        setTimeout(() => mostrarResumenAdvertencias(advertencias), 800);
      }

    } catch (err) {
      ocultarProgreso();
      console.error('[SIAGIE-PRIM] Error crítico:', err);
      mostrarAlertaSiagie(
        'Error al procesar el archivo',
        `Ocurrió un error inesperado al leer el archivo.<br><br>
         <b>Detalle:</b> ${err.message || 'Error desconocido'}`
      );
    }
  };

  reader.onerror = function () {
    ocultarProgreso();
    mostrarAlertaSiagie(
      'No se pudo leer el archivo',
      'El navegador no pudo acceder al archivo. Intenta de nuevo o verifica que no esté abierto en otro programa.'
    );
  };

  reader.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLA DE IMPORTADOS — Primaria
// Muestra también los transferidos desde Secundaria (origen: transferido-secundaria)
// ═══════════════════════════════════════════════════════════════════════════════
function renderTablaImportados() {
  const tbody = document.getElementById('siagie-tbody');
  if (!tbody) return;

  const lista = store.estudiantes.filter(e => e.nivel === NIVEL_PRIMARIA);

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
        : `<span class="badge-estado activo">✅ Activo</span>`;

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

// ── Helpers UI ────────────────────────────────────────────────────────────────
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

// ── Búsqueda en formulario "Nuevo" ────────────────────────────────────────────
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
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--color-border-tertiary);
             display:flex;align-items:center;gap:10px;"
      onmouseover="this.style.background='#EEEDFE'" onmouseout="this.style.background=''">
      <div style="width:32px;height:32px;border-radius:50%;background:#534AB7;color:#fff;
                  display:flex;align-items:center;justify-content:center;font-size:11px;
                  font-weight:700;flex-shrink:0;">
        ${((e.nombres?.[0] || '') + (e.apellidos?.[0] || '')).toUpperCase()}
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">
          ${e.apellidos}, ${e.nombres}
        </div>
        <div style="font-size:11px;color:var(--color-text-secondary);">
          DNI: ${e.dni || '—'} · ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}
        </div>
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

  const chip       = document.getElementById('na-estudiante-seleccionado');
  const chipNombre = document.getElementById('na-estudiante-nombre');
  if (chip && chipNombre) {
    chipNombre.textContent = `✓ ${e.apellidos}, ${e.nombres} — ${e.grado ? e.grado + '°' : '—'} ${e.seccion || ''}`;
    chip.style.display = 'flex';
  }

  document.getElementById('na-buscar-estudiante').value = '';
  document.getElementById('na-resultados-busqueda').style.display = 'none';
}

function limpiarEstudianteSeleccionado() {
  ['na-nombres', 'na-apellidos', 'na-doc-numero', 'na-fechanac'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const chip = document.getElementById('na-estudiante-seleccionado');
  if (chip) chip.style.display = 'none';
}