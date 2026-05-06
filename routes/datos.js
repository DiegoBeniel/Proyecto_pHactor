const express = require('express'); // el servidor web
const router = express.Router();
const Medicion = require('../models/Medicion');
const Empresa  = require('../models/Empresa');
const verificarToken = require('../middleware/auth');

// POST /api/datos — sensor manda x-api-key en el header
router.post('/', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Se requiere x-api-key en el header' });

    const empresa = await Empresa.findOne({ apiKey });
    if (!empresa) return res.status(401).json({ error: 'API Key inválida' });
    if (!empresa.activa) return res.status(403).json({ error: 'Empresa suspendida, no se aceptan datos' });
  
    // Verificar que el contrato no haya vencido
    if (empresa.contrato?.fin && new Date() > empresa.contrato.fin) {
      return res.status(403).json({ error: 'Contrato vencido, no se aceptan datos. Contacta al administrador.' });
}

    const { ph, temperatura } = req.body;
    if (ph === undefined || temperatura === undefined)
      return res.status(400).json({ error: 'Se requieren ph y temperatura' });

    const medicion = new Medicion({ ph, temperatura, empresa: empresa._id });
    await medicion.save();
    res.json({ mensaje: 'Dato guardado', medicion });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/datos — protegido con JWT
router.get('/', verificarToken, async (req, res) => {
  try {
    // Si es cliente, verificar que su empresa esté activa
    if (req.usuario.rol === 'cliente' && req.usuario.empresa) {
      const empresa = await Empresa.findById(req.usuario.empresa);
      if (empresa && !empresa.activa)
        return res.status(403).json({ error: 'Empresa suspendida' });
    }

    if (req.usuario.rol !== 'admin' && req.usuario.empresa) {
      const empresa = await Empresa.findById(req.usuario.empresa);
      if (!empresa || !empresa.activa)
         return res.status(403).json({ error: 'Empresa suspendida' });
        if (empresa.contrato?.fin && new Date() > empresa.contrato.fin)
          return res.status(403).json({ error: 'Contrato vencido, contacta al administrador.' });
}

const filtro = req.usuario.rol === 'admin' ? {} : { empresa: req.usuario.empresa };
const datos  = await Medicion.find(filtro).sort({ fecha: -1 }).limit(100);
res.json(datos);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/datos/ultima — protegido con JWT
router.get('/ultima', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol === 'cliente' && req.usuario.empresa) {
      const empresa = await Empresa.findById(req.usuario.empresa);
      if (empresa && !empresa.activa)
        return res.status(403).json({ error: 'Empresa suspendida' });
    }

// Verificar contrato si no es admin
if (req.usuario.rol !== 'admin' && req.usuario.empresa) {
  const empresa = await Empresa.findById(req.usuario.empresa);
  if (!empresa || !empresa.activa)
    return res.status(403).json({ error: 'Empresa suspendida' });
  if (empresa.contrato?.fin && new Date() > empresa.contrato.fin)
    return res.status(403).json({ error: 'Contrato vencido, contacta al administrador.' });
}

const filtro = req.usuario.rol === 'admin' ? {} : { empresa: req.usuario.empresa };
const ultima = await Medicion.findOne(filtro).sort({ fecha: -1 });
res.json(ultima);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;