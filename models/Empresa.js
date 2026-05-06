const mongoose = require('mongoose');
const crypto = require('crypto');

const empresaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apiKey: { type: String, unique: true },
  claveAcceso: { type: String, unique: true }, // código simple para que usuarios se unan
  activa: { type: Boolean, default: true },

  // Datos del contrato
  contrato: {
    meses:  { type: Number, enum: [1, 3, 6], required: true },
    inicio: { type: Date, default: Date.now },
    fin:    { type: Date }
  },

  // Datos de contacto del gerente (para el panel admin)
  gerente: {
    nombre: { type: String },
    correo: { type: String },
    telefono: { type: String }
  },

  fechaCreacion: { type: Date, default: Date.now }
});

// Genera apiKey y claveAcceso automáticamente antes de guardar
empresaSchema.pre('save', function () {
  if (!this.apiKey) {
    this.apiKey = crypto.randomBytes(32).toString('hex');
  }

  if (!this.claveAcceso) {
    // Clave legible tipo "FRESNO-4821"
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = this.nombre.replace(/\s+/g, '').toUpperCase().slice(0, 6);
    this.claveAcceso = `${prefix}-${suffix}`;
  }

  // Calcular fecha de fin del contrato
  if (this.contrato && this.contrato.meses) {
    if (!this.contrato.fin) {
      const fin = new Date(this.contrato.inicio || Date.now());
      fin.setMonth(fin.getMonth() + this.contrato.meses);this.contrato.fin = fin;
  }
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