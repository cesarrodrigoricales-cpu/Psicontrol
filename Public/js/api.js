// API BASE
const API = `${window.location.origin}/api`;

async function apiFetch(url, options = {}) {
  try {
    const token = localStorage.getItem('psicontrol_token');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    // Token expirado o inválido → redirigir al login
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('psicontrol_token');
      window.location.replace('/login.html');
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  } catch (err) {
    toast('Error de conexión: ' + err.message, 'warning');
    throw err;
  }
}
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

    const guardado = localStorage.getItem('psicontrol_config');
    if (guardado) {
      store.config = JSON.parse(guardado);
      actualizarDatosEnUI();
    }

  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }
}