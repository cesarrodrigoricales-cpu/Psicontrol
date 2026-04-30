// API BASE
const API = 'http://localhost:3000/api';

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  } catch (err) {
    toast('Error de conexión: ' + err.message, 'warning');
    throw err;
  }
}

// ── CARGAR DATOS INICIALES ──────────────────────
async function cargarDatos() {
  try {
    const [atenciones, estudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = atenciones  || [];
    store.estudiantes = estudiantes || [];
    renderDashboard();
    actualizarSelectEstudiantes();
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }
}