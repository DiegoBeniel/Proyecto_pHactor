const mongoose = require('mongoose');

//Un Schema es el "molde" que define qué campos tiene un documento en MongoDB y de qué tipo son.
const medicionSchema = new mongoose.Schema({
  ph: { type: Number, required: true },
  temperatura: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  estado: { type: String, enum: ['OK', 'ALERTA'], default: 'OK' },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  nodoNombre:  { type: String, default: 'Nodo 1' },  // qué nodo mandó el dato
  nivel: { type: Number, default: null } // % de llenado (0–100), null si no tiene sensor
});

// Calcula el estado antes de guardar según los rangos
medicionSchema.pre('save', function () {
  const phFuera= this.ph < 5.0 || this.ph > 7.0;
  const tempFuera= this.temperatura < 20 || this.temperatura > 40;
  const nivelFuera = this.nivel !== null && this.nivel < 80; // alerta si baja de 80%
  this.estado = (phFuera || tempFuera || nivelFuera) ? 'ALERTA' : 'OK';
});

module.exports = mongoose.model('Medicion', medicionSchema);