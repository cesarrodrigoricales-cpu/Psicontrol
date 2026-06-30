const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'psicontrol_jwt_secret_clave_muy_larga_2024_segura';

//  Middleware: protege rutas API
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { verificarToken, JWT_SECRET };