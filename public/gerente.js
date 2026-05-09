// Verificar sesión y que sea gerente
const token = localStorage.getItem('token');
const rol   = localStorage.getItem('rol');

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
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX');
}

function mostrarMensaje(el, texto) {
  el.textContent = texto;
  el.classList.remove('d-none');
}

//Modal: Cambiar nombre del gerente
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
    const res  = await fetch('/api/auth/nombre', {
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

// Cargar datos de la empresa y estado del contrato
async function cargarEmpresa() {
  try {
    const res = await fetch('/api/gerente/mi-empresa', { headers: encabezados() });

    if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }

    const emp = await res.json();

    document.getElementById('nombre_empresa').textContent = emp.nombre || '—';
    document.getElementById('clave_acceso').textContent   = emp.claveAcceso || '—';

    const fin = emp.contrato?.fin
      ? new Date(emp.contrato.fin).toLocaleDateString('es-MX')
      : '—';
    document.getElementById('fecha_fin_contrato').textContent = fin;

    const tarjeta = document.getElementById('tarjeta_contrato');
    const dias_el = document.getElementById('dias_restantes');
    const etiqueta = document.getElementById('etiqueta_contrato');

    if (emp.vencida) {
      dias_el.textContent  = 'Vencido';
      tarjeta.classList.add('contrato_vencido');
      etiqueta.textContent = 'Contrato vencido';
    } else if (emp.porVencer) {
      dias_el.textContent  = emp.diasRestantes;
      tarjeta.classList.add('contrato_alerta');
      etiqueta.textContent = '⚠ ¡Días restantes! Renueva pronto';
    } else {
      dias_el.textContent = emp.diasRestantes ?? '—';
    }

  } catch {
    console.error('Error al cargar datos de la empresa.');
  }
}

// Cargar nodos y sus estados
async function cargarNodos() {
  const tbody = document.getElementById('filas_nodos');
  const div_error = document.getElementById('error_nodos');

  try {
    const res  = await fetch('/api/gerente/nodos-detalle', { headers: encabezados() });
    const data = await res.json();
    const nodos = data.nodos || [];

    if (nodos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="texto_cargando">No hay nodos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = nodos.map(n => {
      // Estado del nodo (activo/suspendido)
      const clase_nodo  = n.activo ? 'etiqueta_activa' : 'etiqueta_suspendida';
      const texto_nodo  = n.activo ? 'Activo' : 'Suspendido';

      // Estado del último lote medido
      let html_lote = '<span style="color:#555;">Sin datos</span>';
      if (n.ultimoEstado === 'OK')
        html_lote = '<span class="etiqueta_activa">OK</span>';
      else if (n.ultimoEstado === 'ALERTA')
        html_lote = '<span class="etiqueta_suspendida">ALERTA</span>';

      // Encode del nombre para pasarlo en el onclick sin conflictos de comillas
      const nombre_enc = encodeURIComponent(n.nombre);

      return `
        <tr>
          <td><strong>${n.nombre}</strong></td>
          <td>${n.alturaCm ? n.alturaCm + ' cm' : '—'}</td>
          <td>
            ${html_lote}
            ${n.ultimaFecha ? `<br><small style="color:#555;">${formatearFecha(n.ultimaFecha)}</small>` : ''}
          </td>
          <td><span class="${clase_nodo}">${texto_nodo}</span></td>
          <td>
            <div class="d-flex gap-1 flex-wrap">
              <button class="${n.activo ? 'btn boton_suspender' : 'btn boton_activar'}"
                onclick="toggleNodo('${nombre_enc}', ${n.activo})">
                ${n.activo ? 'Suspender' : 'Activar'}
              </button>
              <button class="btn boton_eliminar"
                onclick="eliminarNodo('${nombre_enc}')">
                Eliminar
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    div_error.classList.add('d-none');

  } catch {
    mostrarMensaje(div_error, 'Error al cargar nodos.');
  }
}

// Toggle nodo activo/suspendido
async function toggleNodo(nombre_enc, esta_activo) {
  const nombre = decodeURIComponent(nombre_enc);
  const confirmado = confirm(
    esta_activo
      ? `¿Suspender el nodo "${nombre}"? Dejará de recibir datos.`
      : `¿Activar el nodo "${nombre}"?`
  );
  if (!confirmado) return;

  try {
    const res  = await fetch(`/api/gerente/nodos/${encodeURIComponent(nombre)}/toggle`, {
      method: 'PATCH', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al cambiar estado.'); return; }
    await cargarNodos();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Eliminar nodo
async function eliminarNodo(nombre_enc) {
  const nombre = decodeURIComponent(nombre_enc);
  if (!confirm(`¿Eliminar el nodo "${nombre}"? Se borrarán todas sus mediciones. Esta acción no se puede deshacer.`)) return;

  try {
    const res  = await fetch(`/api/gerente/nodos/${encodeURIComponent(nombre)}`, {
      method: 'DELETE', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al eliminar.'); return; }
    await cargarNodos();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Cargar usuarios
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
          <td>${u.telefono || '—'}</td>
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

    mostrarMensaje(div_exito, `✓ Usuario agregado. Contraseña enviada a ${email}.`);
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
    const res  = await fetch(`/api/gerente/usuarios/${id}/toggle`, {
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
    const res  = await fetch(`/api/gerente/usuarios/${id}`, {
      method: 'DELETE', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al eliminar.'); return; }

    const fila = document.getElementById(`fila_usuario_${id}`);
    if (fila) fila.remove();

    const total = parseInt(document.getElementById('total_usuarios').textContent) - 1;
    document.getElementById('total_usuarios').textContent = total;

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Arranque
cargarEmpresa();
cargarNodos();
cargarUsuarios();