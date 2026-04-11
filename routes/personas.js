const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM personas');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { apellidos, nombres, tipodoc, nrodoc, direccion, referencia, telefono, genero } = req.body;
    const [result] = await sequelize.query(
      `INSERT INTO personas (apellidos, nombres, tipodoc, nrodoc, direccion, referencia, telefono, genero)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [apellidos, nombres, tipodoc, nrodoc, direccion, referencia, telefono, genero] }
    );
    res.json({ id: result, mensaje: 'Persona creada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;