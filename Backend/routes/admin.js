const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Medicion = require('../models/Medicion');
const verificarToken = require('../middleware/auth');
const { enviarPasswordProvisional } = require('../utils/mailer');

// Middleware: solo admin
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin')
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  next();
}

router.use(verificarToken, soloAdmin);

// POST /api/admin/empresas
// Admin crea una empresa y su gerente desde el panel
router.post('/empresas', async (req, res) => {
  try {
    const { nombreEmpresa, mesesContrato, nodos, gerenteNombre, gerenteEmail, gerenteTelefono } = req.body;

    if (!nombreEmpresa || !mesesContrato || !gerenteNombre || !gerenteEmail)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    if (![1, 3, 6].includes(Number(mesesContrato)))
      return res.status(400).json({ error: 'Los meses deben ser 1, 3 o 6' });

    if (await Usuario.findOne({ email: gerenteEmail }))
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });

    const tempPassword = crypto.randomBytes(4).toString('hex');

    const nodosArray = Array.isArray(nodos)
      ? nodos.map((n, i) => ({
          nombre: n.nombre?.trim() || `Nodo ${i + 1}`,
          alturaCm: n.alturaCm ? Number(n.alturaCm) : null // altura del tambo en cm para el ESP32
        }))
      : [{ nombre: 'Nodo 1', alturaCm: null }];

    const empresa = new Empresa({
      nombre: nombreEmpresa,
      nodos: nodosArray,
      contrato: { meses: Number(mesesContrato) },
      gerente: { nombre: gerenteNombre, correo: gerenteEmail, telefono: gerenteTelefono }
    });
    await empresa.save();

    const gerente = new Usuario({
      nombre: gerenteNombre,
      email: gerenteEmail,
      telefono: gerenteTelefono || '',
      password: tempPassword,
      rol: 'gerente',
      empresa: empresa._id
    });
    await gerente.save();

    await enviarPasswordProvisional(gerenteEmail, gerenteNombre, tempPassword);

    res.json({
      mensaje: `Empresa "${nombreEmpresa}" creada con ${nodosArray.length} nodo(s). Contraseña enviada al gerente.`,
      empresa
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/empresas
// Lista todas las empresas con stats y días restantes de contrato
router.get('/empresas', async (req, res) => {
  try {
    const { buscar } = req.query;
    const filtro = buscar ? { nombre: { $regex: buscar, $options: 'i' } } : {};

    const empresas = await Empresa.find(filtro).sort({ fechaCreacion: -1 });

    const resultado = await Promise.all(empresas.map(async (emp) => {
      const totalUsuarios = await Usuario.countDocuments({ empresa: emp._id });
      const totalMediciones = await Medicion.countDocuments({ empresa: emp._id });
      const ultimaMedicion = await Medicion.findOne({ empresa: emp._id }).sort({ fecha: -1 });
      const dias = emp.diasRestantes();

      return {
        _id: emp._id,
        nombre: emp.nombre,
        // admin ve nodos con sus apiKeys para programar los ESP32
        nodos: emp.nodos.map(n => ({
          nombre: n.nombre,
          alturaCm: n.alturaCm, // altura del tambo que necesita el ESP32 para calcular el %
          apiKey: n.apiKey,
          activo: n.activo
        })),
        totalNodos: emp.nodos.length,
        // claveAcceso no se manda al admin, eso es del gerente con sus usuarios
        activa: emp.activa,
        contrato: emp.contrato,
        diasRestantes: dias,
        porVencer: dias !== null && dias <= 5 && dias >= 0,
        vencida: dias !== null && dias < 0,
        gerente: emp.gerente,
        totalUsuarios,
        totalMediciones,
        ultimaMedicion: ultimaMedicion?.fecha || null,
        fechaCreacion: emp.fechaCreacion
      };
    }));

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/gerentes
router.get('/gerentes', async (req, res) => {
  try {
    const { buscar } = req.query;
    const filtro = { rol: 'gerente' };
    if (buscar) filtro.$or = [
      { nombre: { $regex: buscar, $options: 'i' } },
      { email: { $regex: buscar, $options: 'i' } }
    ];

    const gerentes = await Usuario.find(filtro)
      .select('-password')
      .populate('empresa', 'nombre activa contrato')
      .sort({ fechaCreacion: -1 });

    res.json(gerentes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/empresas/:id/toggle
router.patch('/empresas/:id/toggle', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    empresa.activa = !empresa.activa;
    await empresa.save();

    res.json({
      mensaje: `Empresa ${empresa.activa ? 'activada' : 'suspendida'} correctamente`,
      activa:  empresa.activa
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/empresas/:id/renovar
// Renueva el contrato de una empresa
router.patch('/empresas/:id/renovar', async (req, res) => {
  try {
    const { meses } = req.body;
    if (![1, 3, 6].includes(Number(meses)))
      return res.status(400).json({ error: 'Los meses deben ser 1, 3 o 6' });

    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const base = empresa.contrato.fin && empresa.contrato.fin > new Date()
      ? empresa.contrato.fin
      : new Date();

    const nuevaFin = new Date(base);
    nuevaFin.setMonth(nuevaFin.getMonth() + Number(meses));

    empresa.contrato.meses= Number(meses);
    empresa.contrato.fin= nuevaFin;
    empresa.activa= true;
    await empresa.save();

    res.json({ mensaje: `Contrato renovado por ${meses} mes(es)`, empresa });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/usuarios/:id
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario.rol === 'admin') return res.status(403).json({ error: 'No puedes eliminar otro admin' });

    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/empresas/:id/nodos
// Admin agrega un nodo nuevo a una empresa existente
router.post('/empresas/:id/nodos', async (req, res) => {
  try {
    const { nombre, alturaCm } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del nodo es requerido' });

    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    if (empresa.nodos.find(n => n.nombre === nombre))
      return res.status(400).json({ error: 'Ya existe un nodo con ese nombre' });

    empresa.nodos.push({
      nombre,
      alturaCm: alturaCm ? Number(alturaCm) : null
    });
    await empresa.save();

    // Devuelve el nodo recién creado con su apiKey generada
    const nodo_nuevo = empresa.nodos[empresa.nodos.length - 1];
    res.json({ mensaje: `Nodo "${nombre}" agregado`, nodo: nodo_nuevo });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;