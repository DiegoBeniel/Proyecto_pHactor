const mongoose = require('mongoose');

//Un Schema es el "molde" que define qué campos tiene un documento en MongoDB y de qué tipo son
const medicionSchema = new mongoose.Schema({
  ph: { type: Number, required: true },
  temperatura: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  estado: { type: String, enum: ['OK', 'ALERTA'], default: 'OK' },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  nodoNombre:  { type: String, default: 'Nodo 1' },  // qué nodo mandó el dato
  nivel: { type: Number, default: null } // % de llenado (0–100), null si no tiene sensor
});

module.exports = mongoose.model('Medicion', medicionSchema);