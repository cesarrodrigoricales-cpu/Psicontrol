const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM motivosconsulta');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Ruta POST para crear nuevo motivo
router.post('/', async (req, res) => {
  try {
    const { motivoconsulta } = req.body;
    if (!motivoconsulta) {
      return res.status(400).json({ error: 'El campo motivoconsulta es requerido' });
    }
    const [result] = await sequelize.query(
      'INSERT INTO motivosconsulta (motivoconsulta) VALUES (?)',
      { replacements: [motivoconsulta] }
    );
    res.json({ id: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;