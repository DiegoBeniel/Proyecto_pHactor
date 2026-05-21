const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  // Soporta "Bearer <token>" o el token directo
  const header = req.headers['authorization'] || ''; 
  const token = header.startsWith('Bearer ') ? header.slice(7) : header; //si viene con Bearer, lo quita, sino lo toma tal cual

  if (!token) return res.status(401).json({ error: 'Acceso denegado, token requerido' });

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET); //jwt.verify decodifica el token usando la misma clave secreta con la que fue creado  
    req.usuario = verificado; // { id, rol, empresa, mustChangePassword }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;