// routes/calendario_eventos.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// GET todos
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM calendario_eventos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET por fecha
router.get('/fecha/:fecha', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM calendario_eventos WHERE fecha = :fecha',
      { replacements: { fecha: req.params.fecha } }
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST crear
router.post('/', async (req, res) => {
  try {
    const { idatencion, titulo, tipo, fecha, hora, notif_minutos, observaciones } = req.body;
    await sequelize.query(
      `INSERT INTO calendario_eventos (idatencion, titulo, tipo, fecha, hora, notif_minutos, observaciones)
       VALUES (:idatencion, :titulo, :tipo, :fecha, :hora, :notif_minutos, :observaciones)`,
      { replacements: { idatencion, titulo, tipo, fecha, hora, notif_minutos, observaciones } }
    );
    res.status(201).json({ message: 'Evento creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT actualizar
router.put('/:id', async (req, res) => {
  try {
    const { titulo, tipo, fecha, hora, notif_minutos, observaciones } = req.body;
    await sequelize.query(
      `UPDATE calendario_eventos SET titulo = :titulo, tipo = :tipo, fecha = :fecha,
       hora = :hora, notif_minutos = :notif_minutos, observaciones = :observaciones WHERE id = :id`,
      { replacements: { titulo, tipo, fecha, hora, notif_minutos, observaciones, id: req.params.id } }
    );
    res.json({ message: 'Evento actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE eliminar
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM calendario_eventos WHERE id = :id',
      { replacements: { id: req.params.id } }
    );
    res.json({ message: 'Evento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;