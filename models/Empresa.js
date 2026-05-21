const mongoose = require('mongoose');
const crypto = require('crypto');

//Un Schema es el "molde" que define qué campos tiene un documento en MongoDB y de qué tipo son

// schema de cada nodo/tambo que envía datos, dentro de la empresa
const nodoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  alturaCm: { type: Number, default: null }, 
  apiKey: { type: String, unique: true }, 
  activo: { type: Boolean, default: true }
}, { _id: false });

const empresaSchema = new mongoose.Schema({
  nombre:{ type: String, required: true },
  claveAcceso: { type: String, unique: true }, // código simple 
  activa: { type: Boolean, default: true },

  // array de nodos en lugar de una sola apiKey
  nodos: [nodoSchema],

  // Datos del contrato
  contrato: {
    meses:{ type: Number, enum: [1, 3, 6], required: true },
    inicio:{ type: Date, default: Date.now },
    fin:{ type: Date }
  },

  // Datos de contacto del gerente (para el panel admin)
  gerente: {
    nombre:{ type: String },
    correo:{ type: String },
    telefono: { type: String }
  },

  // Rangos óptimos de los sensores, cada empresa puede tener los suyos
  rangosOptimos: {
    ph: { min: { type: Number, default: 4.0 }, max: { type: Number, default: 7.0 } },
    temp: { min: { type: Number, default: 20  }, max: { type: Number, default: 40  } },
    nivelMinimo: { type: Number, default: 80 }
  },

  fechaCreacion:{ type: Date, default: Date.now }
});

//después de guardar/actualizar una empresa... genera la clave de acceso y las apiKeys de los nodos
empresaSchema.pre('save', function () {

  // Genera claveAcceso legible
  if (!this.claveAcceso) {
  const nombreEmpresa = this.nombre.replace(/\s+/g, '').toUpperCase();
  const inicioClave = nombreEmpresa.slice(0, 6);
  const numeroAzar = Math.floor(1000 + Math.random() * 9999);
  this.claveAcceso = inicioClave + "-" + numeroAzar;
}

  // genera apiKey para cada nodo /nuevo)
  this.nodos.forEach(nodo => {
    if (!nodo.apiKey) {
      nodo.apiKey = crypto.randomBytes(32).toString('hex');
    }
  });

  // Calcular fecha de fin del contrato
  if (this.contrato && this.contrato.meses && !this.contrato.fin) {
    const fin = new Date(this.contrato.inicio || Date.now());
    fin.setMonth(fin.getMonth() + this.contrato.meses);
    this.contrato.fin = fin;
  }
});

// Método para saber cuántos días quedan de contrato
empresaSchema.methods.diasRestantes = function () {
  if (!this.contrato?.fin) return null;
  const hoy  = new Date();
  const diff = this.contrato.fin - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Empresa', empresaSchema);