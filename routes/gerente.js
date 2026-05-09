const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Medicion = require('../models/Medicion');
const verificarToken = require('../middleware/auth');
const { enviarPasswordProvisional } = require('../utils/mailer');

// Middleware: solo gerente o admin
function soloGerente(req, res, next) {
  if (!['gerente', 'admin'].includes(req.usuario.rol))
    return res.status(403).json({ error: 'Acceso denegado.' });
  next();
}

// GET /api/gerente/nodos — accesible para cualquier rol autenticado
// El dashboard de usuario lo usa para saber cuántos nodos tiene la empresa
router.get('/nodos', verificarToken, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    res.json({
      nodos: empresa.nodos.map(n => ({
        nombre: n.nombre,
        alturaCm: n.alturaCm,
        activo: n.activo
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desde aquí solo gerentes o admin
router.use(verificarToken, soloGerente);

// GET /api/gerente/mi-empresa
router.get('/mi-empresa', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const dias = empresa.diasRestantes();

    res.json({
      _id: empresa._id,
      nombre:  empresa.nombre,
      claveAcceso:empresa.claveAcceso,
      activa:empresa.activa,
      contrato: empresa.contrato,
      diasRestantes: dias,
      porVencer: dias !== null && dias <= 5 && dias >= 0,
      vencida: dias !== null && dias < 0,
      nodos: empresa.nodos.map(n => ({ nombre: n.nombre, alturaCm: n.alturaCm, activo: n.activo })),
      totalNodos: empresa.nodos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gerente/nodos-detalle
// Nodos con su última medición y estado del lote — para el panel del gerente
router.get('/nodos-detalle', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const nodos = await Promise.all(empresa.nodos.map(async (n) => {
      // Busca la última medición de cada nodo para mostrar el estado del lote
      const ultima = await Medicion.findOne({
        empresa:    empresa._id,
        nodoNombre: n.nombre
      }).sort({ fecha: -1 });

      return {
        nombre: n.nombre,
        alturaCm: n.alturaCm,
        activo: n.activo,
        ultimoEstado: ultima?.estado || null, // 'OK', 'ALERTA' o null si no hay datos aún
        ultimaFecha:  ultima?.fecha  || null
      };
    }));

    res.json({ nodos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/gerente/nodos/:nombre/toggle
// Activa o suspende un nodo de la empresa
router.patch('/nodos/:nombre/toggle', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const nodo = empresa.nodos.find(n => n.nombre === req.params.nombre);
    if (!nodo) return res.status(404).json({ error: 'Nodo no encontrado' });

    nodo.activo = !nodo.activo;
    await empresa.save();

    res.json({
      mensaje: `Nodo "${nodo.nombre}" ${nodo.activo ? 'activado' : 'suspendido'}`,
      activo:  nodo.activo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/gerente/nodos/:nombre
// Elimina un nodo y todas sus mediciones
router.delete('/nodos/:nombre', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.usuario.empresa);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const indice = empresa.nodos.findIndex(n => n.nombre === req.params.nombre);
    if (indice === -1) return res.status(404).json({ error: 'Nodo no encontrado' });

    empresa.nodos.splice(indice, 1);
    await empresa.save();

    // Borra también las mediciones de ese nodo
    await Medicion.deleteMany({ empresa: empresa._id, nodoNombre: req.params.nombre });

    res.json({ mensaje: `Nodo "${req.params.nombre}" eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gerente/usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find({
      empresa: req.usuario.empresa,
      rol:     'usuario'
    })
      .select('-password')
      .sort({ fechaCreacion: -1 });

    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/gerente/usuarios
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
      rol:      'usuario',
      empresa:  req.usuario.empresa
    });
    await usuario.save();

    await enviarPasswordProvisional(email, nombre, tempPassword);

    res.json({ mensaje: `Usuario creado. Contraseña enviada a ${email}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/gerente/usuarios/:id/toggle
router.patch('/usuarios/:id/toggle', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id:     req.params.id,
      empresa: req.usuario.empresa,
      rol:     'usuario'
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

// DELETE /api/gerente/usuarios/:id
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id:     req.params.id,
      empresa: req.usuario.empresa,
      rol:     'usuario'
    });

    if (!usuario)
      return res.status(404).json({ error: 'Usuario no encontrado o no pertenece a tu empresa' });

    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;