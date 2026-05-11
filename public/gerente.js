// Verificar sesión y que sea gerente
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');

if (!token) window.location.href = 'login.html';
if (rol !== 'gerente') window.location.href = 'dashboard.html';

document.getElementById('nombre_gerente').textContent = localStorage.getItem('nombre') || 'Gerente';

// Cerrar sesión
document.getElementById('btn_cerrar_sesion').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Headers para todas las peticiones autenticadas
function encabezados() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Convierte fecha ISO a formato legible
function formatearFecha(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX');
}

function mostrarMensaje(el, texto) {
  if (!el) return;
  el.textContent = texto;
  el.classList.remove('d-none');
}

// Modal para cambiar nombre del gerente
const instancia_modal_nombre = new bootstrap.Modal(document.getElementById('modal_nombre'));

function abrirModalNombre() {
  document.getElementById('campo_nuevo_nombre').value = localStorage.getItem('nombre') || '';
  document.getElementById('error_modal_nombre').classList.add('d-none');
  document.getElementById('exito_modal_nombre').classList.add('d-none');
  instancia_modal_nombre.show();
}

document.getElementById('btn_guardar_nombre').addEventListener('click', async () => {
  const nombre = document.getElementById('campo_nuevo_nombre').value.trim();
  const div_error = document.getElementById('error_modal_nombre');
  const div_exito = document.getElementById('exito_modal_nombre');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  if (!nombre || nombre.length < 2)
    return mostrarMensaje(div_error, 'El nombre debe tener al menos 2 caracteres.');

  const btn = document.getElementById('btn_guardar_nombre');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res = await fetch('/api/auth/nombre', {
      method: 'PATCH', headers: encabezados(),
      body: JSON.stringify({ nombre })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al actualizar.');

    localStorage.setItem('nombre', data.nombre);
    document.getElementById('nombre_gerente').textContent = data.nombre;
    mostrarMensaje(div_exito, 'Nombre actualizado.');
    setTimeout(() => instancia_modal_nombre.hide(), 1500);

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

// Cargar los datos de la empresa
async function cargarEmpresa() {
  try {
    const res = await fetch('/api/gerente/mi-empresa', { headers: encabezados() });

    if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }

    const emp = await res.json();

    document.getElementById('nombre_empresa').textContent= emp.nombre || '-';
    document.getElementById('clave_acceso').textContent= emp.claveAcceso || '-';

    const fin = emp.contrato?.fin
      ? new Date(emp.contrato.fin).toLocaleDateString('es-MX')
      : '-';
    document.getElementById('fecha_fin_contrato').textContent = fin;

    // Colorear la tarjeta según estado del contrato
    const tarjeta = document.getElementById('tarjeta_contrato');
    const dias_el = document.getElementById('dias_restantes');
    const etiqueta = document.getElementById('etiqueta_contrato');

    if (emp.vencida) {
      dias_el.textContent  = 'Vencido';
      tarjeta.classList.add('contrato_vencido');
      etiqueta.textContent = 'Contrato vencido';
    } else if (emp.porVencer) {
      dias_el.textContent  = emp.diasRestantes;
      tarjeta.classList.add('contrato_alerta'); // naranja cuando quedan ≤5 días
      etiqueta.textContent = '¡Días restantes! Renueva pronto';
    } else {
      dias_el.textContent = emp.diasRestantes ?? '-';
    }

  } catch {
    console.error('Error al cargar datos de la empresa.');
  }
}

// Cargar usuarios de la empresa y mostrarlos en la tabla
async function cargarUsuarios() {
  const tbody = document.getElementById('filas_usuarios');
  const div_error = document.getElementById('error_usuarios');

  try {
    const res = await fetch('/api/gerente/usuarios', { headers: encabezados() });
    const usuarios = await res.json();

    document.getElementById('total_usuarios').textContent = usuarios.length;

    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="texto_cargando">No hay usuarios registrados</td></tr>';
      return;
    }

    tbody.innerHTML = usuarios.map(u => {
      const clase_estado = u.activo ? 'etiqueta_activa' : 'etiqueta_suspendida';
      const texto_estado = u.activo ? 'Activo' : 'Suspendido';
      return `
        <tr id="fila_usuario_${u._id}">
          <td>${u.nombre}</td>
          <td>${u.email}</td>
          <td>${u.telefono || '-'}</td>
          <td>${formatearFecha(u.fechaCreacion)}</td>
          <td>${formatearFecha(u.ultimoLogin)}</td>
          <td><span class="${clase_estado}">${texto_estado}</span></td>
          <td>
            <div class="d-flex gap-1 flex-wrap">
              <button class="${u.activo ? 'btn boton_suspender' : 'btn boton_activar'}"
                onclick="toggleUsuario('${u._id}', ${u.activo})">
                ${u.activo ? 'Suspender' : 'Activar'}
              </button>
              <button class="btn boton_eliminar" onclick="eliminarUsuario('${u._id}', '${u.nombre}')">
                Eliminar
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    div_error.classList.add('d-none');

  } catch {
    mostrarMensaje(div_error, 'Error al cargar usuarios.');
  }
}

// Agregar nuevo usuario
document.getElementById('btn_agregar_usuario').addEventListener('click', async () => {
  const nombre = document.getElementById('campo_u_nombre').value.trim();
  const email = document.getElementById('campo_u_email').value.trim();
  const telefono = document.getElementById('campo_u_tel').value.trim();

  const div_error = document.getElementById('error_agregar');
  const div_exito = document.getElementById('exito_agregar');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  if (!nombre || !email) return mostrarMensaje(div_error, 'Nombre y correo son obligatorios.');
  if (!email.includes('@')) return mostrarMensaje(div_error, 'Ingresa un correo válido.');

  const btn = document.getElementById('btn_agregar_usuario');
  btn.disabled = true;
  btn.textContent = 'Agregando...';

  try {
    const res  = await fetch('/api/gerente/usuarios', {
      method: 'POST', headers: encabezados(),
      body: JSON.stringify({ nombre, email, telefono })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al agregar el usuario.');

    mostrarMensaje(div_exito, `Usuario agregado. Contraseña enviada a ${email}.`);
    ['campo_u_nombre','campo_u_email','campo_u_tel'].forEach(id => document.getElementById(id).value = '');
    await cargarUsuarios();

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Agregar y enviar contraseña';
  }
});

// Toggle usuario activo/suspendido
async function toggleUsuario(id, esta_activo) {
  try {
    const res = await fetch(`/api/gerente/usuarios/${id}/toggle`, {
      method: 'PATCH', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al cambiar estado.'); return; }
    await cargarUsuarios();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Eliminar usuario
async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`/api/gerente/usuarios/${id}`, {
      method: 'DELETE', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al eliminar.'); return; }

    // Quitar la fila directamente sin recargar toda la tabla
    const fila = document.getElementById(`fila_usuario_${id}`);
    if (fila) fila.remove();

    // Restar 1 al contador manualmente
    const total = parseInt(document.getElementById('total_usuarios').textContent) - 1;
    document.getElementById('total_usuarios').textContent = total;

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Rangos óptimos de sensores, se cargan al inicio y se pueden actualizar
async function cargarRangos() {
  try {
    const res = await fetch('/api/gerente/rangos', { headers: encabezados() });
    const data = await res.json();

    if (!res.ok) return;

    const r = data.rangosOptimos;
    if (!r) return;

    if (r.ph) { document.getElementById('rango_ph_min').value = r.ph.min; document.getElementById('rango_ph_max').value   = r.ph.max;   }
    if (r.temp) { document.getElementById('rango_temp_min').value = r.temp.min; document.getElementById('rango_temp_max').value = r.temp.max; }
    if (r.nivelMinimo !== undefined) { document.getElementById('rango_nivel_min').value = r.nivelMinimo; }

  } catch {
    console.error('Error al cargar rangos.');
  }
}

document.getElementById('btn_guardar_rangos').addEventListener('click', async () => {
  const div_error = document.getElementById('error_rangos');
  const div_exito = document.getElementById('exito_rangos');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  const ph_min = parseFloat(document.getElementById('rango_ph_min').value);
  const ph_max = parseFloat(document.getElementById('rango_ph_max').value);
  const tmp_min =parseFloat(document.getElementById('rango_temp_min').value);
  const tmp_max = parseFloat(document.getElementById('rango_temp_max').value);
  const nivel_min = parseFloat(document.getElementById('rango_nivel_min').value);

  if ([ph_min, ph_max, tmp_min, tmp_max, nivel_min].some(isNaN))
    return mostrarMensaje(div_error, 'Todos los campos deben tener un valor numérico.');
  if (ph_min >= ph_max)
    return mostrarMensaje(div_error, 'pH: el mínimo debe ser menor que el máximo.');
  if (tmp_min >= tmp_max)
    return mostrarMensaje(div_error, 'Temperatura: el mínimo debe ser menor que el máximo.');
  if (nivel_min < 0 || nivel_min > 100)
    return mostrarMensaje(div_error, 'Nivel mínimo debe estar entre 0 y 100.');

  const btn = document.getElementById('btn_guardar_rangos');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res  = await fetch('/api/gerente/rangos', {
      method: 'PATCH',
      headers: encabezados(),
      body: JSON.stringify({
        ph: { min: ph_min,  max: ph_max  },
        temp: { min: tmp_min, max: tmp_max },
        nivelMinimo: nivel_min
      })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al guardar rangos.');

    mostrarMensaje(div_exito, 'Rangos actualizados correctamente.');
    setTimeout(() => div_exito.classList.add('d-none'), 3000);

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar rangos';
  }
});

// Arranque
cargarEmpresa();
cargarUsuarios();
cargarRangos();