const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Un Schema es el "molde" que define qué campos tiene un documento en MongoDB y de qué tipo son
const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String, default: '' },
  password: { type: String, required: true },
  rol: {
    type: String,
    enum: ['admin', 'gerente', 'usuario'],
    default: 'usuario'
  },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', default: null },
  ultimoLogin: { type: Date, default: null },
  activo: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  fechaCreacion: { type: Date, default: Date.now }
});

// Encripta la contraseña antes de guardar
usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Verifica contraseña en el login
usuarioSchema.methods.verificarPassword = async function (passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);