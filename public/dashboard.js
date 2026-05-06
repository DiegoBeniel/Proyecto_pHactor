// Verificar que haya sesión activa
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

document.getElementById('nombre_usuario').textContent = localStorage.getItem('nombre') || 'Usuario';

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

// Cambiar nombre
const instancia_modal_nombre = new bootstrap.Modal(document.getElementById('modal_nombre'));

function abrirModalNombre() {
  document.getElementById('campo_nuevo_nombre').value = localStorage.getItem('nombre') || '';
  document.getElementById('error_modal_nombre').classList.add('d-none');
  document.getElementById('exito_modal_nombre').classList.add('d-none');
  instancia_modal_nombre.show();
}

document.getElementById('btn_guardar_nombre').addEventListener('click', async () => {
  const nombre    = document.getElementById('campo_nuevo_nombre').value.trim();
  const div_error = document.getElementById('error_modal_nombre');
  const div_exito = document.getElementById('exito_modal_nombre');
  div_error.classList.add('d-none');
  div_exito.classList.add('d-none');

  if (!nombre || nombre.length < 2) {
    div_error.textContent = 'El nombre debe tener al menos 2 caracteres.';
    div_error.classList.remove('d-none');
    return;
  }

  const btn = document.getElementById('btn_guardar_nombre');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res  = await fetch('/api/auth/nombre', {
      method: 'PATCH', headers: encabezados(),
      body: JSON.stringify({ nombre })
    });
    const data = await res.json();

    if (!res.ok) {
      div_error.textContent = data.error || 'Error al actualizar.';
      div_error.classList.remove('d-none');
      return;
    }
    localStorage.setItem('nombre', data.nombre);
    document.getElementById('nombre_usuario').textContent = data.nombre;
    div_exito.textContent = '✓ Nombre actualizado.';
    div_exito.classList.remove('d-none');
    setTimeout(() => instancia_modal_nombre.hide(), 1500);

  } catch {
    div_error.textContent = 'No se pudo conectar con el servidor.';
    div_error.classList.remove('d-none');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

// Empresa suspendida
function mostrarEmpresaSuspendida() {
  document.querySelector('main').innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center"
         style="min-height:60vh; text-align:center; gap:16px;">
      <div style="font-size:80px; color:#e74c3c;">✗</div>
      <h2 style="color:#c0392b;">Empresa suspendida</h2>
      <p style="color:#555; max-width:400px;">
        Tu empresa ha sido suspendida por el administrador.<br>
        No se pueden ver ni recibir datos ahora.
      </p>
      <p style="color:#999;">Contacta al administrador para más información.</p>
      <button onclick="localStorage.clear(); window.location.href='login.html';"
        class="btn boton_principal mt-2">Cerrar sesión</button>
    </div>`;
}
function mostrarContratoVencido() {
  document.querySelector('main').innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center"
         style="min-height:60vh; text-align:center; gap:16px;">
      <h2 style="color:#d35400;">Su contrato está vencido</h2>
      <p style=" max-width:400px;">
        El contrato de tu empresa ha vencido.<br>
        No se pueden recibir ni ver datos hasta que sea renovado.
      </p>
      <p">Contacta a tu administrador para renovar el contrato.</p>
      <button onclick="localStorage.clear(); window.location.href='login.html';"
        class="btn boton_principal mt-2">Cerrar sesión</button>
    </div>`;
}

// Utilidades

// Convierte fecha ISO a formato legible
function formatearFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX');
}

// Actualiza el reloj del header
function actualizarReloj() {
  document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-MX');
}

// Aplica la clase visual a una tarjeta y su indicador según si está en rango
function estilizarTarjeta(id_tarjeta, id_indicador, en_rango) {
  document.getElementById(id_tarjeta).className  = 'tarjeta_medicion ' + (en_rango ? 'en_rango' : 'fuera_rango');
  const ind = document.getElementById(id_indicador);
  ind.className   = 'indicador_estado ' + (en_rango ? 'indicador_ok' : 'indicador_alerta');
  ind.textContent = en_rango ? 'En rango' : 'Fuera de rango';
}

// Devuelve tiempo legible entre dos fechas ISO
function tiempoEntre(iso1, iso2) {
  if (!iso1 || !iso2) return '—';
  const seg = Math.floor(Math.abs(new Date(iso1) - new Date(iso2)) / 1000);
  if (seg < 60)   return `${seg}s`;
  if (seg < 3600) return `${Math.floor(seg/60)}m ${seg%60}s`;
  return `${Math.floor(seg/3600)}h ${Math.floor((seg%3600)/60)}m`;
}

// Devuelve un span con el delta (+/-) con color según dirección
function formatearDelta(val) {
  if (val === null || val === undefined) return '<span class="delta_neutro">—</span>';
  const signo = val > 0 ? '+' : '';
  const clase  = val > 0 ? 'delta_sube' : val < 0 ? 'delta_baja' : 'delta_neutro';
  return `<span class="${clase}">${signo}${val.toFixed(2)}</span>`;
}

// Gráficas (se crean una sola vez al cargar la página)
const grafica_ph = new Chart(document.getElementById('grafica_ph'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'pH',
      backgroundColor: '#C871EB',
      borderColor: '#eb71e97d',
      data: [],
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Muestra', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' }, reverse: true },
      y: { title: { display: true, text: 'pH', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' } }
    },
    plugins: { legend: { labels: { color: '#e0e0e0' } } }
  }
});

const grafica_temp = new Chart(document.getElementById('grafica_temp'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Temperatura (°C)',
      backgroundColor: '#FFF95B',
      borderColor: '#bbff5b82',
      data: [],
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Muestra', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' }, reverse: true },
      y: { title: { display: true, text: 'Temperatura', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' } }
    },
    plugins: { legend: { labels: { color: '#e0e0e0' } } }
  }
});

// Detectar cambio
// Guardamos el _id de la última medición conocida para no rerenderizar si no hay cambio
let ultima_id_conocida = null;

// Cargar datos
async function cargarDatos() {
  try {
    const res_ultima = await fetch('/api/datos/ultima', { headers: encabezados() });

    if (res_ultima.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
    if (res_ultima.status === 403) {
      const data = await res_ultima.json();
      if (data.error?.toLowerCase().includes('vencido')) mostrarContratoVencido();
      else mostrarEmpresaSuspendida();
      return;
}

    const ultima = await res_ultima.json();

    // Si el _id de la última medición no cambió, no hay datos nuevos — no hacer nada
    if (ultima && ultima._id && ultima._id === ultima_id_conocida) return;

    // Hay dato nuevo (o es la primera carga): actualizar todo
    ultima_id_conocida = ultima?._id || null;

    document.getElementById('nota_actualizacion').textContent =
      'Actualizado: ' + new Date().toLocaleTimeString('es-MX') + ' — solo cambia si hay datos nuevos';

    if (ultima && ultima.ph !== undefined) {
      const ph_ok   = ultima.ph >= 5.0 && ultima.ph <= 7.0;
      const temp_ok = ultima.temperatura >= 20 && ultima.temperatura <= 40;
      const todo_ok = ph_ok && temp_ok;

      document.getElementById('valor_ph').textContent = Number(ultima.ph).toFixed(2);
      document.getElementById('valor_temp').textContent = Number(ultima.temperatura).toFixed(1) + '°C';
      document.getElementById('icono_estado').textContent = todo_ok ? 'OK' : 'ALERTA';
      document.getElementById('indicador_estado').textContent = todo_ok ? 'Lote OK' : 'ALERTA';

      estilizarTarjeta('tarjeta_ph', 'indicador_ph', ph_ok);
      estilizarTarjeta('tarjeta_temp', 'indicador_temp', temp_ok);
      estilizarTarjeta('tarjeta_estado','indicador_estado', todo_ok);
    }

    // Cargar las últimas 20 mediciones para la tabla y las gráficas
    const res_datos = await fetch('/api/datos', { headers: encabezados() });
    if (res_datos.status === 403) {
      const data = await res_datos.json();
      if (data.error?.toLowerCase().includes('vencido')) mostrarContratoVencido();
      else mostrarEmpresaSuspendida();
      return;
}

    const datos = await res_datos.json();
    const tbody = document.getElementById('filas_mediciones');
    tbody.innerHTML = '';

    datos.slice(0, 20).forEach((m, i) => {
      // datos[i+1] es la medición inmediatamente anterior (el array viene de más reciente a más viejo)
      const anterior = datos[i + 1];
      const en_rango = m.estado === 'OK';
      const delta_ph = anterior ? m.ph          - anterior.ph          : null;
      const delta_temp = anterior ? m.temperatura  - anterior.temperatura  : null;

      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${formatearFecha(m.fecha)}</td>
          <td>${Number(m.ph).toFixed(2)}</td>
          <td>${formatearDelta(delta_ph)}</td>
          <td>${Number(m.temperatura).toFixed(1)}°C</td>
          <td>${formatearDelta(delta_temp)}</td>
          <td>${tiempoEntre(m.fecha, anterior?.fecha)}</td>
          <td><span class="${en_rango ? 'etiqueta_ok' : 'etiqueta_alerta'}">${m.estado}</span></td>
        </tr>`;
    });

    // Actualizar gráficas con los nuevos datos
    const etiquetas = datos.slice(0, 20).map((_, i) => i + 1);
    const valores_ph = datos.slice(0, 20).map(m => m.ph);
    const valores_temp = datos.slice(0, 20).map(m => m.temperatura);

    grafica_ph.data.labels = etiquetas;
    grafica_ph.data.datasets[0].data  = valores_ph;
    grafica_ph.update();

    grafica_temp.data.labels = etiquetas;
    grafica_temp.data.datasets[0].data  = valores_temp;
    grafica_temp.update();

  } catch (err) {
    console.error('Error al cargar datos:', err);
  }
}

actualizarReloj();
cargarDatos();

// Reloj: actualiza cada segundo
setInterval(actualizarReloj, 1000);

// Datos: verifica cada 3 segundos, pero solo rerenderiza si hay medición nueva
setInterval(cargarDatos, 3000);