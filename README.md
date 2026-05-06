# Proyecto_MMDS2
🧩 LISTA DE PROCEDIMIENTOS (ORDEN REAL)

Te lo dejo como checklist tipo guía de proyecto 👇

🔹 FASE 1 — Backend básico (Servidor)

🎯 Objetivo: Crear el servidor que reciba datos

✅ Pasos:
Instalar Node.js
Crear carpeta del proyecto

Inicializar proyecto:

npm init -y

Instalar dependencias:

npm install express cors
Crear archivo server.js
Crear endpoint:
POST /api/datos
GET /api/datos

👉 Aquí todavía NO hay base de datos
👉 Solo guarda en un arreglo (temporal)

🔹 FASE 2 — Simulación de datos

🎯 Objetivo: Probar el sistema SIN ESP32

✅ Pasos:
Usar Postman o fetch desde JS

Enviar datos tipo:

{
  "ph": 6.5,
  "temperatura": 28
}
Verificar que el servidor los reciba

👉 Resultado:
✔️ Ya tienes “datos como si fueran reales”

🔹 FASE 3 — Base de datos (MongoDB)

🎯 Objetivo: Guardar datos de verdad

✅ Pasos:
Instalar MongoDB o usar MongoDB Atlas

Instalar en proyecto:

npm install mongoose
Crear modelo:
ph
temperatura
fecha
Modificar endpoint para guardar datos

👉 Resultado:
✔️ Ya tienes historial real

🔹 FASE 4 — Frontend básico

🎯 Objetivo: Ver datos en web

✅ Pasos:
Crear:
index.html
style.css
app.js

Hacer petición:

fetch("http://localhost:3000/api/datos")
Mostrar:
Último valor
Lista de datos

👉 Resultado:
✔️ Ya ves datos en pantalla

🔹 FASE 5 — Dashboard (lo importante)

🎯 Objetivo: Hacerlo visual y pro

✅ Pasos:
Instalar Chart.js
Crear gráfica:
pH vs tiempo
temperatura vs tiempo
Agregar colores:
Verde = correcto
Rojo = fuera de rango

👉 Resultado:
✔️ Ya parece sistema real industrial

🔹 FASE 6 — Alertas

🎯 Objetivo: Inteligencia del sistema

✅ Pasos:
Validar en frontend o backend:
pH < 5 o > 7
temp < 20 o > 40
Mostrar:
Mensaje
Color rojo

👉 Resultado:
✔️ Sistema inteligente

🔹 FASE 7 — Conectar ESP32

🎯 Objetivo: Reemplazar datos fake

✅ Pasos:

ESP32 manda:

{
  "ph": 6.2,
  "temperatura": 30
}

A:

http://tu-servidor/api/datos

👉 Resultado:
✔️ Sistema completo funcionando
