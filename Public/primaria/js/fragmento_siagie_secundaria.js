// ═══════════════════════════════════════════════
// AGREGAR ESTO AL SIAGIE.JS DE SECUNDARIA
// Función para enviar estudiantes seleccionados a Primaria
// ═══════════════════════════════════════════════

// ── Endpoint de primaria (mismo backend, diferente ruta) ──
const API_PRIMARIA_BULK = `${API}/estudiantes/primaria/bulk`;

// ── Enviar estudiantes de secundaria a primaria ────────────
// Llama a este función desde un botón en el HTML de secundaria
// Ejemplo: <button onclick="enviarSeleccionadosAPrimaria()">Pasar a Primaria</button>
async function enviarSeleccionadosAPrimaria() {
  // Obtener IDs seleccionados (si tienes checkboxes) o pasar lista completa
  const seleccionados = obtenerEstudiantesSeleccionados();

  if (!seleccionados.length) {
    toast('⚠️ Selecciona al menos un estudiante para transferir');
    return;
  }

  if (!confirm(`¿Transferir ${seleccionados.length} estudiante(s) a Primaria?`)) return;

  let insertados = 0, duplicados = 0, errores = 0;
  const LOTE = 50;

  // Preparar datos marcando nivel primaria
  const preparados = seleccionados.map(e => ({
    nombres:   e.nombres,
    apellidos: e.apellidos,
    dni:       e.dni,
    grado:     e.grado,
    seccion:   e.seccion,
    fechanac:  e.fechanac,
    genero:    e.genero,
    condicion: 'activo',
    nivel:     'primaria',
    origen:    'transferido-secundaria'
  }));

  for (let i = 0; i < preparados.length; i += LOTE) {
    const lote = preparados.slice(i, i + LOTE);
    try {
      const res = await apiFetch(API_PRIMARIA_BULK, {
        method: 'POST',
        body: JSON.stringify({ estudiantes: lote, nivel: 'primaria' })
      });
      insertados += res.insertados  || 0;
      duplicados += res.duplicados  || 0;
      errores    += res.errores     || 0;
    } catch (err) {
      console.error('[SIAGIE-SECUNDARIA→PRIMARIA] Error:', err.message);
      errores += lote.length;
    }
  }

  const partes = [
    insertados ? `✅ ${insertados} transferidos a Primaria` : '',
    duplicados ? `➖ ${duplicados} ya existían en Primaria` : '',
    errores    ? `❌ ${errores} errores`                    : '',
  ].filter(Boolean);
  toast(partes.join('  ') || 'Sin cambios');
}

// ── Obtener estudiantes seleccionados (adaptar a tu HTML) ──
// Si tienes checkboxes con data-id, usa esto:
function obtenerEstudiantesSeleccionados() {
  const checkboxes = document.querySelectorAll('.siagie-check:checked');
  if (checkboxes.length > 0) {
    return [...checkboxes]
      .map(cb => store.estudiantes.find(e => e.id == cb.dataset.id))
      .filter(Boolean);
  }
  // Si no hay checkboxes, devuelve todos los importados del Excel
  return store.estudiantes.filter(e => e.origen === 'siagie');
}