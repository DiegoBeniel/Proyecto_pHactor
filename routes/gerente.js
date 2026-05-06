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

router.use(verificarToken, soloGerente);

// GET /api/gerente/mi-empresa
// Datos de su empresa incluyendo contrato y días restantes
router.get('/mi-empresa', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const dias = empresa.diasRestantes();

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
      activo:  usuario.activo
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

module.exports = router;