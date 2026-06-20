//Este archivo maneja todo lo relacionado con cuentas: registrarse, entrar al sistema y cambiar contraseña

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const verificarToken = require('../middleware/auth');
const { enviarPasswordProvisional } = require('../utils/mailer');

// POST /api/auth/unirse
// Un usuario se une a una empresa existente con la clave de acceso
router.post('/unirse', async (req, res) => {
  try {
    const { nombre, email, telefono, nombreEmpresa, claveAcceso } = req.body;

    if (!nombre || !email || !nombreEmpresa || !claveAcceso)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (await Usuario.findOne({ email }))
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });

    // Verificar que la empresa y la clave coincidan
    const empresa = await Empresa.findOne({
      nombre: { $regex: new RegExp(`^${nombreEmpresa}$`, 'i') }, // sin importar mayúsculas
      claveAcceso: claveAcceso.trim().toUpperCase(),
      activa: true
    });

    if (!empresa)
      return res.status(400).json({ error: 'Empresa no encontrada o clave incorrecta' });

    //crear y guardar el nuevo usuario con contraseña temporal
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const usuario = new Usuario({
      nombre,
      email,
      telefono,
      password: tempPassword,
      rol: 'usuario',
      empresa: empresa._id
    });
    await usuario.save();
    await enviarPasswordProvisional(email, nombre, tempPassword);
    res.json({ mensaje: `Te uniste a ${empresa.nombre}. Contraseña provisional enviada a ${email}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });

    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ error: 'Correo no encontrado' });
    if (!usuario.activo) return res.status(403).json({ error: 'Tu cuenta está desactivada, contacta al administrador' });

    const passwordCorrecta = await usuario.verificarPassword(password);
    if (!passwordCorrecta) return res.status(400).json({ error: 'Contraseña incorrecta' });

    // Verificar que la empresa no esté suspendida (solo para gerente y usuario)
    if (usuario.empresa && usuario.rol !== 'admin') {
      const empresa = await Empresa.findById(usuario.empresa);
      if (!empresa || !empresa.activa)
        return res.status(403).json({ error: 'Tu empresa está suspendida. Contacta al administrador.' });
    }

    // Actualizar último login
    usuario.ultimoLogin = new Date();
    await usuario.save();

    //crear token JWT con id, rol y empresa (si tiene)
    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, empresa: usuario.empresa },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Devolver token y datos básicos del usuario (sin password)
    res.json({
      token,
      usuario: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/change-password 
router.put('/change-password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva)
      return res.status(400).json({ error: 'Se requieren contraseña actual y nueva' });

    if (passwordNueva.length < 6)
      return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const correcta = await usuario.verificarPassword(passwordActual);
    if (!correcta) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    usuario.password = passwordNueva;
    usuario.mustChangePassword = false;
    await usuario.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/auth/nombre
// Cualquier usuario autenticado puede actualizar su nombre
router.patch('/nombre', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || nombre.trim().length < 2)
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      { nombre: nombre.trim() },
      { new: true } // devuelve el documento ya actualizado
    );

    res.json({ mensaje: 'Nombre actualizado', nombre: usuario.nombre });
  } 
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id)
      .select('-password')
      .populate('empresa', 'nombre claveAcceso contrato activa');
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;