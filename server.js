require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/datos', require('./routes/datos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gerente', require('./routes/gerente'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error conectando a MongoDB:', err);
    process.exit(1);
  });