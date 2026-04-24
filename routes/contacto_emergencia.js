// routes/contacto_emergencia.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// GET todos
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM contacto_emergencia');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET por estudiante
router.get('/estudiante/:idestudiante', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM contacto_emergencia WHERE idestudiante = :idestudiante',
      { replacements: { idestudiante: req.params.idestudiante } }
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST crear
router.post('/', async (req, res) => {
  try {
    const { idestudiante, nombre, parentesco, celular } = req.body;
    await sequelize.query(
      'INSERT INTO contacto_emergencia (idestudiante, nombre, parentesco, celular) VALUES (:idestudiante, :nombre, :parentesco, :celular)',
      { replacements: { idestudiante, nombre, parentesco, celular } }
    );
    res.status(201).json({ message: 'Contacto creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT actualizar
router.put('/:id', async (req, res) => {
  try {
    const { nombre, parentesco, celular } = req.body;
    await sequelize.query(
      'UPDATE contacto_emergencia SET nombre = :nombre, parentesco = :parentesco, celular = :celular WHERE id = :id',
      { replacements: { nombre, parentesco, celular, id: req.params.id } }
    );
    res.json({ message: 'Contacto actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE eliminar
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM contacto_emergencia WHERE id = :id',
      { replacements: { id: req.params.id } }
    );
    res.json({ message: 'Contacto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;