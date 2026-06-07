require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const conectarDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/datos', require('./routes/datos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gerente', require('./routes/gerente'));

// Ruta para servir el frontend al entrar a la raíz
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); //es la ruta absoluta
});

// Conectar a MongoDB  y luego iniciar el servidor
conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});