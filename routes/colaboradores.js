const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT c.id, c.usuario, c.idpersona, c.idrol,
             p.nombres, p.apellidos,
             r.nombrerol
      FROM colaboradores c
      JOIN personas p ON c.idpersona = p.id
      JOIN roles r    ON c.idrol     = r.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /colaboradores:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;