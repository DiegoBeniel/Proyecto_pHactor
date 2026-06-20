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
    'Content-Type': 'application/json',
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
  const nombre = document.getElementById('campo_nuevo_nombre').value.trim();
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
    div_exito.textContent = 'Nombre actualizado.';
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

// Empresa suspendida / contrato vencido
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

function formatearFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX');
}

function actualizarReloj() {
  document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-MX');
}

function estilizarTarjeta(id_tarjeta, id_indicador, en_rango) {
  document.getElementById(id_tarjeta).className = 'tarjeta_medicion ' + (en_rango ? 'en_rango' : 'fuera_rango');
  const ind = document.getElementById(id_indicador);
  ind.className = 'indicador_estado ' + (en_rango ? 'indicador_ok' : 'indicador_alerta');
  ind.textContent = en_rango ? 'En rango' : 'Fuera de rango';
}

function tiempoEntre(iso1, iso2) {
  if (!iso1 || !iso2) return '-';
  const seg = Math.floor(Math.abs(new Date(iso1) - new Date(iso2)) / 1000);
  if (seg < 60)   return `${seg}s`;
  if (seg < 3600) return `${Math.floor(seg/60)}m ${seg%60}s`;
  return `${Math.floor(seg/3600)}h ${Math.floor((seg%3600)/60)}m`;
}

function formatearDelta(val) {
  if (val === null || val === undefined) return '<span class="delta_neutro">-</span>';
  const signo = val > 0 ? '+' : '';
  const clase  = val > 0 ? 'delta_sube' : val < 0 ? 'delta_baja' : 'delta_neutro';
  return `<span class="${clase}">${signo}${val.toFixed(2)}</span>`;
}

// nodo seleccionado actualmente (null = primer nodo por defecto)
let nodo_activo = null;

// Rangos óptimos de la empresa, se cargan al inicio desde la API
let rangos = {
  ph: { min: 5.0, max: 7.0 },
  temp: { min: 20,  max: 40  },
  nivelMinimo: 80
};

async function cargarRangos() {
  try {
    const res  = await fetch('/api/gerente/rangos', { headers: encabezados() });
    if (!res.ok) return;
    const data = await res.json();
    if (data.rangosOptimos) {
      rangos = data.rangosOptimos;

      // Actualizar los textos de rango visibles en las tarjetas
      document.getElementById('rango_ph_texto').textContent =
        `Rango óptimo: ${rangos.ph.min} – ${rangos.ph.max}`;
      document.getElementById('rango_temp_texto').textContent =
        `Rango óptimo: ${rangos.temp.min}°C – ${rangos.temp.max}°C`;
      document.getElementById('rango_nivel_texto').textContent =
        `Mínimo recomendado: ${rangos.nivelMinimo}%`;
    }
  } catch {
    // silencioso, el dashboard sigue funcionando con los defaults
  }
}

// Carga los nodos de la empresa y dibuja los tabs
async function inicializarTabs() {
  try {
    const res = await fetch('/api/gerente/nodos', { headers: encabezados() });
    if (!res.ok) return; // si falla silenciosamente no rompemos el dashboard
    
    const data = await res.json();
    const nodos = data.nodos || [];

    // Con 1 solo nodo no se muestran tabs, el nodo activo queda en null (sin filtro)
    if (nodos.length <= 1) {
      nodo_activo = nodos[0]?.nombre || null;
      return;
    }

    // Más de 1 nodo: dibujar tabs
    nodo_activo = nodos[0].nombre; // arranca en el primero

    const contenedor = document.getElementById('contenedor_tabs');
    contenedor.innerHTML = `
      <div class="tabs_nodos">
        ${nodos.map((n, i) => `
          <button
            class="tab_nodo ${i === 0 ? 'tab_nodo_activo' : ''}"
            id="tab_${i}"
            onclick="cambiarNodo('${n.nombre}', ${i}, ${nodos.length})">
            ${n.nombre}
          </button>`).join('')}
      </div>`;

  } catch {
    // Si no puede cargar los nodos, sigue funcionando sin tabs
  }
}

// Cambia el nodo activo y recarga datos
function cambiarNodo(nombre, indice, total) {
  nodo_activo = nombre;

  // Actualiza el estilo de los tabs
  for (let i = 0; i < total; i++) {
    const tab = document.getElementById(`tab_${i}`);
    if (tab) tab.className = 'tab_nodo' + (i === indice ? ' tab_nodo_activo' : '');
  }

  // Actualiza el título de la sección
  document.getElementById('titulo_datos_actuales').textContent = `Datos actuales del ${nombre}`;

  // Resetea el ID conocido para forzar recarga completa al cambiar de nodo
  ultima_id_conocida = null;
  cargarDatos();
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

//gráfica de nivel de llenado
const grafica_nivel = new Chart(document.getElementById('grafica_nivel'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Nivel (%)',
      backgroundColor: '#5BC8F5',
      borderColor: '#5bc8f57d',
      data: [],
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Muestra', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' }, reverse: true },
      y: { title: { display: true, text: 'Nivel (%)', font: { size: 13 }, color: '#9e9e9e' },
           ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a2a' },
           min: 0, max: 100 } // el nivel siempre es 0-100%
    },
    plugins: { legend: { labels: { color: '#e0e0e0' } } }
  }
});

// ID de la última medición conocida para no rerenderizar sin cambios
let ultima_id_conocida = null;

// Cargar datos, filtra por nodo_activo si hay más de uno
async function cargarDatos() {
  try {
    // Agrega ?nodo=... si hay un nodo seleccionado
    const query = nodo_activo ? `?nodo=${encodeURIComponent(nodo_activo)}` : '';

    const res_ultima = await fetch(`/api/datos/ultima${query}`, { headers: encabezados() });

    if (res_ultima.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
    if (res_ultima.status === 403) {
      const data = await res_ultima.json();
      if (data.error?.toLowerCase().includes('vencido')) mostrarContratoVencido();
      else mostrarEmpresaSuspendida();
      return;
    }

    const ultima = await res_ultima.json();

    // Si el _id no cambió, no hay datos nuevos = no hacer nada
    if (ultima && ultima._id && ultima._id === ultima_id_conocida) return;
    ultima_id_conocida = ultima?._id || null;

    document.getElementById('nota_actualizacion').textContent =
      'Actualizado: ' + new Date().toLocaleTimeString('es-MX') + ' solo cambia si hay datos nuevos';

    if (ultima && ultima.ph !== undefined) {
      const ph_ok = ultima.ph >= rangos.ph.min && ultima.ph <= rangos.ph.max;
      const temp_ok = ultima.temperatura >= rangos.temp.min && ultima.temperatura <= rangos.temp.max;
      // nivel ok si está por encima del mínimo configurado, o si no tiene sensor (null)
      const nivel_ok = ultima.nivel === null || ultima.nivel === undefined || ultima.nivel >= (rangos.nivelMinimo ?? 80);
      const todo_ok  = ph_ok && temp_ok && nivel_ok;

      document.getElementById('valor_ph').textContent = Number(ultima.ph).toFixed(2);
      document.getElementById('valor_temp').textContent = Number(ultima.temperatura).toFixed(1) + '°C';
      document.getElementById('icono_estado').textContent = todo_ok ? 'OK' : 'ALERTA';
      document.getElementById('indicador_estado').textContent = todo_ok ? 'Lote OK' : 'ALERTA';

      estilizarTarjeta('tarjeta_ph','indicador_ph', ph_ok);
      estilizarTarjeta('tarjeta_temp','indicador_temp',  temp_ok);
      estilizarTarjeta('tarjeta_estado','indicador_estado', todo_ok);

      // actualizar tarjeta de nivel
      if (ultima.nivel !== null && ultima.nivel !== undefined) {
        const pct = Math.min(Math.max(Number(ultima.nivel), 0), 100);
        document.getElementById('valor_nivel').textContent = pct.toFixed(1) + '%';

        estilizarTarjeta('tarjeta_nivel', 'indicador_nivel', nivel_ok);
      } else {
        // Sin sensor ultrasónico: ocultar tarjeta de nivel
        document.getElementById('tarjeta_nivel').style.display = 'none';
      }
    }

    // Cargar las últimas 20 mediciones para tabla y gráficas
    const res_datos = await fetch(`/api/datos${query}`, { headers: encabezados() });
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
      const anterior= datos[i + 1];
      const en_rango= m.estado === 'OK';
      const delta_ph= anterior ? m.ph          - anterior.ph          : null;
      const delta_temp= anterior ? m.temperatura  - anterior.temperatura : null;

      // mostrar nivel en la tabla si existe, '-' si no
      const nivel_txt = (m.nivel !== null && m.nivel !== undefined)
        ? Number(m.nivel).toFixed(1) + '%'
        : '-';

      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${formatearFecha(m.fecha)}</td>
          <td>${Number(m.ph).toFixed(2)}</td>
          <td>${formatearDelta(delta_ph)}</td>
          <td>${Number(m.temperatura).toFixed(1)}°C</td>
          <td>${formatearDelta(delta_temp)}</td>
          <td>${nivel_txt}</td>
          <td>${tiempoEntre(m.fecha, anterior?.fecha)}</td>
          <td><span class="${en_rango ? 'etiqueta_ok' : 'etiqueta_alerta'}">${m.estado}</span></td>
        </tr>`;
    });

    // Actualizar las 3 gráficas
    const etiquetas= datos.slice(0, 20).map((_, i) => i + 1);
    const valores_ph= datos.slice(0, 20).map(m => m.ph);
    const valores_temp= datos.slice(0, 20).map(m => m.temperatura);
    const valores_nivel= datos.slice(0, 20).map(m => m.nivel ?? null); // null si no hay sensor

    grafica_ph.data.labels = etiquetas;
    grafica_ph.data.datasets[0].data= valores_ph;
    grafica_ph.update();

    grafica_temp.data.labels= etiquetas;
    grafica_temp.data.datasets[0].data= valores_temp;
    grafica_temp.update();

    // actualizar gráfica de nivel
    grafica_nivel.data.labels= etiquetas;
    grafica_nivel.data.datasets[0].data = valores_nivel;
    grafica_nivel.update();

  } catch (err) {
    console.error('Error al cargar datos:', err);
  }
}

actualizarReloj();

// primero carga los rangos, luego los tabs, luego los datos
cargarRangos().then(() => inicializarTabs()).then(() => cargarDatos());

// Reloj cada segundo
setInterval(actualizarReloj, 1000);

// Datos cada 3 segundos, respetando el nodo activo
setInterval(cargarDatos, 3000);