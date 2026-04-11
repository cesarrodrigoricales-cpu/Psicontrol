const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT c.*, p.nombres, p.apellidos, r.nombrerol
      FROM colaboradores c
      JOIN personas p ON c.idpersona = p.idpersona
      JOIN roles r ON c.idrol = r.idrol
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;