// Verificar sesión y que sea admin
const token = localStorage.getItem('token');
const rol   = localStorage.getItem('rol');

if (!token) window.location.href = 'login.html';
if (rol !== 'admin') window.location.href = 'dashboard.html';

document.getElementById('nombre_admin').textContent = localStorage.getItem('nombre') || 'Admin';

// Cerrar sesión
document.getElementById('btn_cerrar_sesion').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Headers para todas las peticiones autenticadas
function encabezados() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Convierte fecha ISO a formato legible en español
function formatearFecha(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX');
}

// Muestra un mensaje de error o éxito en un elemento del DOM
function mostrarMensaje(el, texto) {
  el.textContent = texto;
  el.classList.remove('d-none');
}

// Modal para cambiarle el nombre
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
      method: 'PATCH',
      headers: encabezados(),
      body: JSON.stringify({ nombre })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al actualizar.');

    localStorage.setItem('nombre', data.nombre);
    document.getElementById('nombre_admin').textContent = data.nombre;
    mostrarMensaje(div_exito, ' Nombre actualizado.');
    setTimeout(() => instancia_modal_nombre.hide(), 1500);

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

// Genera campos de nombre y altura por cada nodo
// Se llama al cambiar el select de cantidad y al abrir el modal
function generarCamposNodos() {
  const cantidad = parseInt(document.getElementById('campo_cantidad_nodos').value);
  const contenedor = document.getElementById('contenedor_nodos');
  contenedor.innerHTML = '';

  for (let i = 0; i < cantidad; i++) {
    contenedor.innerHTML += `
      <div class="col-12 col-md-6">
        <div style="background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:14px;">
          <p class="etiqueta_campo mb-2" style="color:#952ecc; font-weight:600;">Nodo ${i + 1}</p>
          <label class="form-label etiqueta_campo">Nombre del nodo</label>
          <input type="text" id="nodo_nombre_${i}" class="form-control campo_entrada mb-2"
            placeholder="Ej: Tambo Norte" value="Nodo ${i + 1}">
          <label class="form-label etiqueta_campo">Altura del tambo (cm)</label>
          <input type="number" id="nodo_altura_${i}" class="form-control campo_entrada"
            placeholder="Ej: 80" min="1">
        </div>
      </div>`;
  }
}

// Al abrir el modal: genera el primer nodo y limpia mensajes
document.getElementById('modal_crear_empresa').addEventListener('show.bs.modal', () => {
  generarCamposNodos();
  document.getElementById('error_crear').classList.add('d-none');
  document.getElementById('exito_crear').classList.add('d-none');
});

// Crear empresa con nodos
document.getElementById('btn_crear_empresa').addEventListener('click', async () => {
  const nombre_empresa = document.getElementById('campo_empresa').value.trim();
  const meses_contrato = document.getElementById('campo_meses').value;
  const nombre_gerente = document.getElementById('campo_gerente_nombre').value.trim();
  const email_gerente = document.getElementById('campo_gerente_email').value.trim();
  const tel_gerente = document.getElementById('campo_gerente_tel').value.trim();
  const cantidad_nodos = parseInt(document.getElementById('campo_cantidad_nodos').value);

  const div_error = document.getElementById('error_crear');
  const div_exito = document.getElementById('exito_crear');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  if (!nombre_empresa || !meses_contrato || !nombre_gerente || !email_gerente)
    return mostrarMensaje(div_error, 'Llena todos los campos obligatorios.');
  if (!email_gerente.includes('@'))
    return mostrarMensaje(div_error, 'Ingresa un correo válido para el gerente.');

  // Recolecta nombre y altura de cada nodo desde los inputs dinámicos
  const nodos = [];
  for (let i = 0; i < cantidad_nodos; i++) {
    const nombre_nodo = document.getElementById(`nodo_nombre_${i}`)?.value.trim() || `Nodo ${i + 1}`;
    const altura_nodo = document.getElementById(`nodo_altura_${i}`)?.value;
    nodos.push({
      nombre: nombre_nodo,
      alturaCm: altura_nodo ? Number(altura_nodo) : null // altura que usará el ESP32 para calcular el %
    });
  }

  const btn = document.getElementById('btn_crear_empresa');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  try {
    const res  = await fetch('/api/admin/empresas', {
      method: 'POST',
      headers: encabezados(),
      body: JSON.stringify({
        nombreEmpresa: nombre_empresa,
        mesesContrato: meses_contrato,
        nodos,
        gerenteNombre: nombre_gerente,
        gerenteEmail: email_gerente,
        gerenteTelefono: tel_gerente
      })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al crear la empresa.');

    mostrarMensaje(div_exito, `Exitoso: ${data.mensaje}`);

    ['campo_empresa','campo_meses','campo_gerente_nombre','campo_gerente_email','campo_gerente_tel']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('campo_cantidad_nodos').value = '1';
    generarCamposNodos();

    await cargarTodo();

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear empresa y gerente';
  }
});

// Buscar
document.getElementById('btn_buscar').addEventListener('click', () => {
  const termino = document.getElementById('campo_buscar').value.trim();
  cargarEmpresas(termino);
  cargarGerentes(termino);
});

document.getElementById('btn_limpiar').addEventListener('click', () => {
  document.getElementById('campo_buscar').value = '';
  cargarTodo();
});

document.getElementById('campo_buscar').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn_buscar').click();
});

// Cargar empresas
async function cargarEmpresas(buscar = '') {
  const tbody = document.getElementById('filas_empresas');
  const div_error = document.getElementById('error_empresas');

  try {
    const url = buscar
      ? `/api/admin/empresas?buscar=${encodeURIComponent(buscar)}`
      : '/api/admin/empresas';
    const res = await fetch(url, { headers: encabezados() });

    if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
    if (res.status === 403) { window.location.href = 'dashboard.html'; return; }

    const empresas = await res.json();

    document.getElementById('total_empresas').textContent   = empresas.length;
    document.getElementById('empresas_activas').textContent = empresas.filter(e => e.activa && !e.vencida).length;

    if (empresas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="texto_cargando">No hay empresas registradas</td></tr>';
      renderizarAlertas([]);
      return;
    }

    tbody.innerHTML = empresas.map(emp => {
      let html_dias = '-';
      if (emp.diasRestantes !== null) {
        const clase = emp.vencida ? 'dias_vencido' : emp.porVencer ? 'dias_alerta' : 'dias_ok';
        html_dias = `<span class="${clase}">${emp.vencida ? 'Vencido' : emp.diasRestantes + ' días'}</span>`;
      }

      const clase_estado = emp.vencida ? 'etiqueta_suspendida' : emp.activa ? 'etiqueta_activa' : 'etiqueta_suspendida';
      const texto_estado = emp.vencida ? 'Vencida' : emp.activa ? 'Activa' : 'Suspendida';

      // Serializa los nodos para pasarlos al onclick de verKeys
      const nodos_json = JSON.stringify(emp.nodos || []).replace(/"/g, '&quot;');

      return `
        <tr id="fila_empresa_${emp._id}">
          <td><strong>${emp.nombre}</strong></td>
          <td>${emp.gerente?.nombre || '-'}</td>
          <td>${emp.contrato?.meses || '-'} mes(es)</td>
          <td>${html_dias}</td>
          <td>${emp.totalUsuarios}</td>
          <td>${emp.totalNodos || 0}</td>
          <td>
            <button class="btn boton_toggle"
              onclick="verKeys('${emp._id}', '${emp.nombre}', '${nodos_json}')">
              Ver keys
            </button>
          </td>
          <td>${formatearFecha(emp.ultimaMedicion)}</td>
          <td><span class="${clase_estado}">${texto_estado}</span></td>
          <td>
            <div class="d-flex gap-1 flex-wrap">
              <button class="${emp.activa ? 'btn boton_suspender' : 'btn boton_activar'}"
                onclick="toggleEmpresa('${emp._id}', ${emp.activa})">
                ${emp.activa ? 'Suspender' : 'Activar'}
              </button>
              <button class="btn boton_renovar" onclick="renovarContrato('${emp._id}', '${emp.nombre}')">
                Renovar
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    div_error.classList.add('d-none');
    renderizarAlertas(empresas);

  } catch {
    mostrarMensaje(div_error, 'Error al cargar empresas.');
  }
}

// Abre el modal con las apiKeys y altura de los nodos de una empresa
// ID de la empresa actualmente abierta en el modal de keys
let empresa_keys_activa = null;
function verKeys(id, nombre, nodos_string) {
  const nodos = JSON.parse(nodos_string.replace(/&quot;/g, '"'));

  // Guarda el id para usarlo al agregar nodo
  empresa_keys_activa = id;

  document.getElementById('titulo_modal_keys').textContent = `API Keys. ${nombre}`;
  document.getElementById('lista_keys').innerHTML = nodos.map(n => `
    <div style="background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:14px; margin-bottom:10px;">
      <p class="etiqueta_campo mb-1" style="color:#952ecc; font-weight:600;">${n.nombre}
        ${n.alturaCm ? `<span style="color:#555; font-weight:normal;"> · ${n.alturaCm} cm</span>` : ''}
      </p>
      <code style="word-break:break-all; color:#e0e0e0; font-size:0.8rem;">${n.apiKey}</code>
    </div>`).join('');

  // Limpia el formulario de agregar nodo al abrir
  document.getElementById('nuevo_nodo_nombre').value = '';
  document.getElementById('nuevo_nodo_altura').value = '';
  document.getElementById('error_agregar_nodo').classList.add('d-none');
  document.getElementById('exito_agregar_nodo').classList.add('d-none');

  new bootstrap.Modal(document.getElementById('modal_keys')).show();
}

// Muestra empresas vencidas o con ≤5 días en la sección de alertas
function renderizarAlertas(empresas) {
  const contenedor = document.getElementById('contenedor_alertas');
  const alertas = empresas.filter(e => e.porVencer || e.vencida);

  if (alertas.length === 0) {
    contenedor.innerHTML = '<p class="texto_cargando">Sin alertas activas</p>';
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="table table-dark tabla_datos">
        <thead>
          <tr>
            <th>Empresa</th><th>Gerente</th><th>Días restantes</th><th>Estado</th><th>Contacto</th>
          </tr>
        </thead>
        <tbody>
          ${alertas.map(emp => `
            <tr>
              <td><strong>${emp.nombre}</strong></td>
              <td>${emp.gerente?.nombre || '-'}</td>
              <td><span class="${emp.vencida ? 'dias_vencido' : 'dias_alerta'}">
                ${emp.vencida ? 'Vencido' : emp.diasRestantes + ' días'}
              </span></td>
              <td><span class="${emp.vencida ? 'etiqueta_suspendida' : emp.activa ? 'etiqueta_activa' : 'etiqueta_suspendida'}">
                ${emp.vencida ? 'Vencida' : emp.activa ? 'Activa' : 'Suspendida'}
              </span></td>
              <td>
                ${emp.gerente?.correo
                  ? `<a href="mailto:${emp.gerente.correo}" class="enlace_contacto">${emp.gerente.correo}</a>`
                  : '-'}
                ${emp.gerente?.telefono
                  ? ` · <a href="https://wa.me/52${emp.gerente.telefono.replace(/\D/g,'')}" target="_blank" class="enlace_contacto">WhatsApp</a>`
                  : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Cargar gerentes
async function cargarGerentes(buscar = '') {
  const tbody     = document.getElementById('filas_gerentes');
  const div_error = document.getElementById('error_gerentes');

  try {
    const url = buscar
      ? `/api/admin/gerentes?buscar=${encodeURIComponent(buscar)}`
      : '/api/admin/gerentes';
    const res      = await fetch(url, { headers: encabezados() });
    const gerentes = await res.json();

    document.getElementById('total_gerentes').textContent = gerentes.length;

    if (gerentes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="texto_cargando">No hay gerentes registrados</td></tr>';
      return;
    }

    tbody.innerHTML = gerentes.map(g => `
      <tr>
        <td>${g.nombre}</td>
        <td>${g.email}</td>
        <td>${g.telefono || '-'}</td>
        <td>${g.empresa?.nombre || '-'}</td>
        <td>${formatearFecha(g.ultimoLogin)}</td>
        <td>
          <button class="btn boton_eliminar" onclick="eliminarUsuario('${g._id}', '${g.nombre}')">
            Eliminar
          </button>
        </td>
      </tr>`).join('');

    div_error.classList.add('d-none');

  } catch {
    mostrarMensaje(div_error, 'Error al cargar gerentes.');
  }
}

// TOGGLE EMPRESA (activar / suspender)
async function toggleEmpresa(id, esta_activa) {
  const confirmado = confirm(
    esta_activa
      ? '¿Suspender esta empresa? Sus usuarios no podrán entrar.'
      : '¿Reactivar esta empresa?'
  );
  if (!confirmado) return;

  try {
    const res  = await fetch(`/api/admin/empresas/${id}/toggle`, {
      method: 'PATCH', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al cambiar el estado.'); return; }
    await cargarTodo();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Renovar contrato
async function renovarContrato(id, nombre) {
  const meses = prompt(`¿Cuántos meses renovar para "${nombre}"?\nEscribe: 1, 3 o 6`);
  if (!meses) return;
  if (!['1','3','6'].includes(meses.trim())) { alert('Solo se permiten 1, 3 o 6 meses.'); return; }

  try {
    const res  = await fetch(`/api/admin/empresas/${id}/renovar`, {
      method: 'PATCH', headers: encabezados(),
      body: JSON.stringify({ meses: Number(meses) })
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al renovar.'); return; }
    alert(`Listo ${data.mensaje}`);
    await cargarTodo();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Eliminar usuario o gerente
async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res  = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'DELETE', headers: encabezados()
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Error al eliminar.'); return; }
    await cargarTodo();

  } catch {
    alert('No se pudo conectar con el servidor.');
  }
}

// Carga empresas y gerentes en paralelo
async function cargarTodo() {
  await Promise.all([cargarEmpresas(), cargarGerentes()]);
}
// Agregar nodo desde el modal de keys
document.getElementById('btn_agregar_nodo').addEventListener('click', async () => {
  const nombre = document.getElementById('nuevo_nodo_nombre').value.trim();
  const alturaCm = document.getElementById('nuevo_nodo_altura').value;

  const div_error = document.getElementById('error_agregar_nodo');
  const div_exito = document.getElementById('exito_agregar_nodo');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  if (!nombre) return mostrarMensaje(div_error, 'El nombre del nodo es obligatorio.');
  if (!empresa_keys_activa) return mostrarMensaje(div_error, 'Error: no se identificó la empresa.');

  const btn = document.getElementById('btn_agregar_nodo');
  btn.disabled = true;
  btn.textContent = 'Agregando...';

  try {
    const res  = await fetch(`/api/admin/empresas/${empresa_keys_activa}/nodos`, {
      method: 'POST', headers: encabezados(),
      body: JSON.stringify({ nombre, alturaCm: alturaCm ? Number(alturaCm) : null })
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje(div_error, data.error || 'Error al agregar el nodo.');

    mostrarMensaje(div_exito, `Listo ${data.mensaje}. API Key generada.`);
    document.getElementById('nuevo_nodo_nombre').value = '';
    document.getElementById('nuevo_nodo_altura').value = '';

    // Agrega el nuevo nodo a la lista sin cerrar el modal
    document.getElementById('lista_keys').innerHTML += `
      <div style="background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:14px; margin-bottom:10px;">
        <p class="etiqueta_campo mb-1" style="color:#952ecc; font-weight:600;">${data.nodo.nombre}
          ${data.nodo.alturaCm ? `<span style="color:#555; font-weight:normal;"> · ${data.nodo.alturaCm} cm</span>` : ''}
        </p>
        <code style="word-break:break-all; color:#e0e0e0; font-size:0.8rem;">${data.nodo.apiKey}</code>
      </div>`;

    // Actualiza la tabla de empresas en el fondo
    await cargarTodo();

  } catch {
    mostrarMensaje(div_error, 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Agregar';
  }
});
// Arranque
cargarTodo();