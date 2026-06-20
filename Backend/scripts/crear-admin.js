require('dotenv').config();
const mongoose = require('mongoose');
const Usuario  = require('../models/Usuario');
const Empresa  = require('../models/Empresa');

async function crearAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const existe = await Usuario.findOne({ email: 'tu@email.com' });
  if (existe) {
    console.log('El admin ya existe.');
    process.exit(0);
  }

  const usuario = new Usuario({
    nombre:'Admin',
    email: 'phactor.soporte@gmail.com',
    password: '123456', 
    rol:'admin',
    empresa:  null,
    mustChangePassword: false
  });

  await usuario.save();
  console.log(' Admin creado.');
  process.exit(0);
}

crearAdmin().catch(err => { console.error(err); process.exit(1); });