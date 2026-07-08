const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/Auth');

// Credenciales fijas del administrador (cambia estos valores)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  // Comparación estricta contra credenciales fijas
  if (usuario !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  // Generar token JWT
  const token = jwt.sign(
    { usuario: ADMIN_USER, rol: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    success: true,
    token,
    expiresIn: JWT_EXPIRES
  });
});

// POST /api/auth/logout (el logout real es en frontend borrando el token)
router.post('/logout', (req, res) => {
  res.json({ success: true, mensaje: 'Sesión cerrada.' });
});

// GET /api/auth/verificar — para checkear si el token sigue válido
router.get('/verificar', require('../config/Auth').verificarToken, (req, res) => {
  res.json({ success: true, usuario: req.usuario });
});

module.exports = router;