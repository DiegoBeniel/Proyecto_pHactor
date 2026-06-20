function mostrarVista(id) {
  ['vista_login', 'vista_unirse','vista_password'] .forEach(v => document.getElementById(v).classList.add('d-none'));
  document.getElementById(id).classList.remove('d-none');
  limpiarMensajes();
}

function limpiarMensajes() {
  document.querySelectorAll('.alerta_error, .alerta_exito').forEach(el => {
    el.classList.add('d-none');
    el.textContent = '';
  });
}

function mostrarError(id, texto) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.classList.remove('d-none');
}

function mostrarExito(id, texto) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.classList.remove('d-none');
}

// Arranque: decidir qué vista mostrar
const params = new URLSearchParams(window.location.search);
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');
const vista_url = params.get('vista');

if (vista_url === 'password') {
  mostrarVista('vista_password');
} else if (token) {
  // Ya tiene sesión, redirigir al panel correcto
  if (rol === 'admin') window.location.href = 'admin.html';
  else if (rol === 'gerente') window.location.href = 'gerente.html';
  else window.location.href = 'dashboard.html';
} else {
  mostrarVista('vista_login');
}

// Login
document.getElementById('btn_login').addEventListener('click', async () => {
  const email = document.getElementById('login_email').value.trim();
  const password = document.getElementById('login_password').value;

  if (!email || !password) return mostrarError('login_error', 'Llena todos los campos.');

  const btn = document.getElementById('btn_login');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) return mostrarError('login_error', data.error || 'Error al iniciar sesión.');

    // Guardar sesión en localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('nombre', data.usuario.nombre);
    localStorage.setItem('rol', data.usuario.rol);

    if (data.usuario.rol === 'admin')   window.location.href = 'admin.html';
    else if (data.usuario.rol === 'gerente') window.location.href = 'gerente.html';
    else window.location.href = 'dashboard.html';

  } catch {
    mostrarError('login_error', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

// Unirse a una empresa
document.getElementById('btn_unirse').addEventListener('click', async () => {
  const nombre = document.getElementById('unirse_nombre').value.trim();
  const email = document.getElementById('unirse_email').value.trim();
  const telefono = document.getElementById('unirse_telefono').value.trim();
  const nombreEmpresa = document.getElementById('unirse_empresa').value.trim();
  const claveAcceso = document.getElementById('unirse_clave').value.trim().toUpperCase();

  if (!nombre || !email || !telefono || !nombreEmpresa || !claveAcceso)
    return mostrarError('unirse_error', 'Llena todos los campos, incluyendo el teléfono.');
  if (!email.includes('@'))
    return mostrarError('unirse_error', 'Ingresa un correo válido.');

  const btn = document.getElementById('btn_unirse');
  btn.disabled = true;
  btn.textContent = 'Uniéndose...';

  try {
    const res  = await fetch('/api/auth/unirse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, telefono, nombreEmpresa, claveAcceso })
    });
    const data = await res.json();

    if (!res.ok) return mostrarError('unirse_error', data.error || 'Error al unirse a la empresa.');

    mostrarExito('unirse_exito', `Te uniste a ${nombreEmpresa}. Revisa tu correo ${email} para tu contraseña.`);
    setTimeout(() => mostrarVista('vista_login'), 3000);

  } catch {
    mostrarError('unirse_error', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Unirse';
  }
});

// Cambiar contraseña
document.getElementById('btn_cambiar').addEventListener('click', async () => {
  const actual = document.getElementById('pw_actual').value;
  const nueva  = document.getElementById('pw_nueva').value;
  const confirmar = document.getElementById('pw_confirmar').value;

  if (!actual || !nueva || !confirmar)
    return mostrarError('password_error', 'Llena todos los campos.');
  if (nueva.length < 6)
    return mostrarError('password_error', 'La contraseña nueva debe tener al menos 6 caracteres.');
  if (nueva !== confirmar)
    return mostrarError('password_error', 'Las contraseñas nuevas no coinciden.');
  if (actual === nueva)
    return mostrarError('password_error', 'La contraseña nueva debe ser diferente a la actual.');

  const btn = document.getElementById('btn_cambiar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res  = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva })
    });
    const data = await res.json();

    if (!res.ok) return mostrarError('password_error', data.error || 'Error al cambiar la contraseña.');

    mostrarExito('password_exito', 'Contraseña actualizada. Redirigiendo...');
    setTimeout(() => history.back(), 2000);

  } catch {
    mostrarError('password_error', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
  }
});

// Enter en el input activa el botón principal de la vista activa
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const vistas = {
    vista_login: 'btn_login',
    vista_unirse: 'btn_unirse',
    vista_password: 'btn_cambiar'
  };
  for (const [vista, btn] of Object.entries(vistas)) {
    if (!document.getElementById(vista).classList.contains('d-none')) {
      document.getElementById(btn).click();
      break;
    }
  }
});