const API_URL = '/api/auth/login';

const btnLogin   = document.getElementById('btnLogin');
const inputUser  = document.getElementById('usuario');
const inputPass  = document.getElementById('password');
const errorMsg   = document.getElementById('errorMsg');
const errorTexto = document.getElementById('errorTexto');
const togglePass = document.getElementById('togglePass');

// Si ya hay token válido → ir directo al dashboard
(async () => {
  const token = localStorage.getItem('psicontrol_token');
  if (token) {
    try {
      const res = await fetch('/api/auth/verificar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) window.location.replace('/index.html');
      else localStorage.removeItem('psicontrol_token');
    } catch {
      localStorage.removeItem('psicontrol_token');
    }
  }
})();

// Toggle mostrar/ocultar contraseña
togglePass.addEventListener('click', () => {
  const tipo = inputPass.type === 'password' ? 'text' : 'password';
  inputPass.type = tipo;
  togglePass.querySelector('svg').innerHTML = tipo === 'text'
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
});

// Enter para hacer login
[inputUser, inputPass].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

btnLogin.addEventListener('click', handleLogin);

async function handleLogin() {
  const usuario  = inputUser.value.trim();
  const password = inputPass.value;

  if (!usuario || !password) {
    mostrarError('Completa usuario y contraseña.');
    return;
  }

  ocultarError();
  setCargando(true);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarError(data.error || 'Credenciales incorrectas.');
      inputPass.value = '';
      inputPass.focus();
      return;
    }

    localStorage.setItem('psicontrol_token', data.token);
    window.location.replace('/index.html');

  } catch (err) {
    mostrarError('No se pudo conectar al servidor.');
  } finally {
    setCargando(false);
  }
}

function mostrarError(msg) {
  errorTexto.textContent = msg;
  errorMsg.classList.add('visible');
}

function ocultarError() {
  errorMsg.classList.remove('visible');
}

function setCargando(estado) {
  btnLogin.disabled = estado;
  btnLogin.classList.toggle('cargando', estado);
}