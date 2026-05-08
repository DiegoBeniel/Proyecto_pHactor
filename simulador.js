const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = process.argv[2];
if (!API_KEY) {
  console.error('Falta la API Key, la de la empresa que le quieres mandar datos we');
  console.error('Pongale asi: node simulador.js apiKey');
  process.exit(1);
}

function generarDatos() {
  // Genera valores mayormente dentro del rango, con ~20 % de probabilidad de ALERTA
  const phOk = Math.random() > 0.2;
  const tempOk = Math.random() > 0.2;

// nivel: mayormente arriba de 80%, con ~20% de probabilidad de bajo
  const nivelOk = Math.random() > 0.2;
  const nivel = parseFloat((nivelOk
    ? Math.random() * (100 - 80) + 80  // rango OK: 80–100%
    : Math.random() * 60               // bajo: 0–60%
  ).toFixed(1));

  return {
    nivel,
    ph:parseFloat((phOk
      ? Math.random()*(7.0 - 5.0) + 5.0 // rango OK:    5.0 – 7.0
      : Math.random()>0.5 ? Math.random() * 5.0 // fuera bajo
      : 7.0 + Math.random() // fuera alto
    ).toFixed(2)),

    temperatura: parseFloat((tempOk
      ? Math.random()*(40 - 20) + 20 // rango OK:    20 – 40 °C
      : Math.random()>0.5 ? Math.random() * 20 // fuera bajo
      : 40 + Math.random() * 10 // fuera alto
    ).toFixed(2))
  };
}

console.log(`Simulador iniciado con API Key: ${API_KEY.slice(0, 8)}...`);
console.log('Enviando datos cada 10 segundos a http://localhost:3000/api/datos\n');

async function enviar() {
  const datos = generarDatos();
  try {
    const res = await fetch('http://localhost:3000/api/datos', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY // aqui mero va la apiKey de la empresa, Andy
      },
      body: JSON.stringify(datos)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error del servidor:', data.error);
    } else {
      const { ph, temperatura, nivel } = datos;
    const estado = data.medicion?.estado || '?';
    console.log(`[${new Date().toLocaleTimeString('es-MX')}]  pH: ${ph}  Temp: ${temperatura}°C  Nivel: ${nivel}%  Estado: ${estado}`);
    }
  } catch (err) {
    console.error('No se pudo conectar:', err.message);
  }
}

// Primera llamada inmediata, luego cada 10 s
enviar();
setInterval(enviar, 10000);