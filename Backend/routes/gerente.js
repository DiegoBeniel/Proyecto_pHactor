const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const verificarToken = require('../middleware/auth');
const { enviarPasswordProvisional } = require('../utils/mailer');

// Middleware: solo gerente
function soloGerente(req, res, next) {
  if (!['gerente', 'admin'].includes(req.usuario.rol))
    return res.status(403).json({ error: 'Acceso denegado.' });
  next();
}

// Ruta pública para cualquier usuario autenticado (el dashboard la necesita)
router.get('/nodos', verificarToken, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    res.json({
      nodos: empresa.nodos.map(n => ({ nombre: n.nombre, activo: n.activo }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta pública para cualquier usuario autenticado (el dashboard la necesita para colorear tarjetas)
router.get('/rangos', verificarToken, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    res.json({ rangosOptimos: empresa.rangosOptimos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.use(verificarToken, soloGerente); // desde aquí solo gerentes

router.use(verificarToken, soloGerente);

// GET /api/gerente/mi-empresa
// Datos de su empresa incluyendo contrato y días restantes
router.get('/mi-empresa', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const dias = empresa.diasRestantes();

    // Devolver datos relevantes para el gerente, sin apiKey ni datos sensibles
    res.json({
      _id: empresa._id,
      nombre: empresa.nombre,
      claveAcceso: empresa.claveAcceso,
      apiKey: empresa.apiKey,
      activa: empresa.activa,
      contrato: empresa.contrato,
      diasRestantes: dias,
      porVencer: dias !== null && dias <= 5 && dias >= 0,
      vencida: dias !== null && dias < 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gerente/usuarios
// Lista los usuarios de su empresa
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find({
      empresa: req.usuario.empresa,
      rol: 'usuario'
    })
      .select('-password')
      .sort({ fechaCreacion: -1 });

    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/gerente/usuarios
// El gerente agrega un usuario a su empresa y le manda la contraseña
router.post('/usuarios', async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;

    if (!nombre || !email)
      return res.status(400).json({ error: 'Nombre y correo son requeridos' });

    if (await Usuario.findOne({ email }))
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });

    const tempPassword = crypto.randomBytes(4).toString('hex');

    const usuario = new Usuario({
      nombre,
      email,
      telefono: telefono || '',
      password: tempPassword,
      rol: 'usuario',
      empresa: req.usuario.empresa
    });
    await usuario.save();

    await enviarPasswordProvisional(email, nombre, tempPassword);

    res.json({ mensaje: `Usuario creado. Contraseña enviada a ${email}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/gerente/usuarios/:id/toggle
// Activa o desactiva un usuario de su empresa
router.patch('/usuarios/:id/toggle', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id: req.params.id,
      empresa: req.usuario.empresa,
      rol: 'usuario'
    });

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    usuario.activo = !usuario.activo;
    await usuario.save();

    res.json({
      mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}`,
      activo: usuario.activo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//DELETE /api/gerente/usuarios/:id
// El gerente elimina un usuario de su empresa
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id: req.params.id,
      empresa: req.usuario.empresa,
      rol: 'usuario'
    });

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado o no pertenece a tu empresa' });

    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/gerente/rangos
// El gerente actualiza los rangos óptimos de su empresa
router.patch('/rangos', async (req, res) => {
  try {
    const { ph, temp, nivelMinimo } = req.body;

    // Validaciones básicas
    const validar = (obj, nombre) => {
      if (obj === undefined) return;
      const { min, max } = obj;
      if (min === undefined || max === undefined)
        throw new Error(`${nombre}: debes enviar min y max`);
      if (typeof min !== 'number' || typeof max !== 'number')
        throw new Error(`${nombre}: min y max deben ser números`);
      if (min >= max)
        throw new Error(`${nombre}: min debe ser menor que max`);
    };

    validar(ph,'pH');
    validar(temp,'Temperatura');

    if (nivelMinimo !== undefined) {
      if (typeof nivelMinimo !== 'number')
        throw new Error('Nivel mínimo debe ser un número');
      if (nivelMinimo < 0 || nivelMinimo > 100)
        throw new Error('Nivel mínimo debe estar entre 0 y 100');
    }

    const actualizacion = {};
    if (ph) { actualizacion['rangosOptimos.ph.min']   = ph.min;   actualizacion['rangosOptimos.ph.max']   = ph.max;   }
    if (temp) { actualizacion['rangosOptimos.temp.min'] = temp.min; actualizacion['rangosOptimos.temp.max'] = temp.max; }
    if (nivelMinimo !== undefined) { actualizacion['rangosOptimos.nivelMinimo'] = nivelMinimo; }

    const empresa = await Empresa.findByIdAndUpdate(
      req.usuario.empresa,
      { $set: actualizacion },
      { new: true }
    );

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    res.json({ mensaje: 'Rangos actualizados correctamente', rangosOptimos: empresa.rangosOptimos });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/gerente/nodos, accesible para cualquier rol autenticado
// El dashboard de usuario lo usa para saber cuántos nodos tiene la empresa
router.get('/nodos', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    // Solo devuelve nombre y activo osea sin apiKey
    res.json({
      nodos: empresa.nodos.map(n => ({ nombre: n.nombre, activo: n.activo }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;