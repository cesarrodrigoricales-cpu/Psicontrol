const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// ── GET todas las atenciones ──
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT 
        a.idatencion, a.fechahora, a.grado, a.seccion,
        a.nivelatencion, a.observaciones, a.estado,
        a.idespecialista, a.idprofesor, a.idestudiante, a.idmotivo,
        CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
        e.codigomatricula,
        m.motivoconsulta,
        CONCAT(pe.nombres, ' ', pe.apellidos) AS especialista
      FROM atenciones a
      JOIN estudiantes e  ON a.idestudiante  = e.idestudiante
      JOIN personas p     ON e.idpersona     = p.idpersona
      JOIN motivosconsulta m ON a.idmotivo   = m.idmotivo
      LEFT JOIN colaboradores c ON a.idespecialista = c.idcolaborador
      LEFT JOIN personas pe   ON c.idpersona        = pe.idpersona
      ORDER BY a.fechahora DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /atenciones:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET una atención por ID ──
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT a.*, CONCAT(p.nombres, ' ', p.apellidos) AS paciente
      FROM atenciones a
      JOIN estudiantes e ON a.idestudiante = e.idestudiante
      JOIN personas p    ON e.idpersona    = p.idpersona
      WHERE a.idatencion = ?
    `, { replacements: [req.params.id] });

    if (rows.length === 0) return res.status(404).json({ error: 'Atención no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /atenciones/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST crear atención ──
router.post('/', async (req, res) => {
  try {
    const { idespecialista, idprofesor, idestudiante, fechahora, grado, seccion, nivelatencion, idmotivo, observaciones, estado } = req.body;

    // Validación de campos obligatorios
    if (!idestudiante || !fechahora || !nivelatencion || !idmotivo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: idestudiante, fechahora, nivelatencion, idmotivo' });
    }

    const [result] = await sequelize.query(
      `INSERT INTO atenciones 
        (idespecialista, idprofesor, idestudiante, fechahora, grado, seccion, nivelatencion, idmotivo, observaciones, estado, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      { replacements: [idespecialista || null, idprofesor || null, idestudiante, fechahora, grado || null, seccion || null, nivelatencion, idmotivo, observaciones || null, estado || 'pendiente'] }
    );

    res.status(201).json({ id: result, mensaje: 'Atención registrada correctamente' });
  } catch (err) {
    console.error('POST /atenciones:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT actualizar atención ──
router.put('/:id', async (req, res) => {
  try {
    const { idespecialista, idprofesor, idestudiante, fechahora, grado, seccion, nivelatencion, idmotivo, observaciones, estado } = req.body;

    if (!idestudiante || !fechahora || !nivelatencion || !idmotivo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const [result] = await sequelize.query(
      `UPDATE atenciones SET
        idespecialista=?, idprofesor=?, idestudiante=?, fechahora=?,
        grado=?, seccion=?, nivelatencion=?, idmotivo=?, observaciones=?, estado=?
       WHERE idatencion=?`,
      { replacements: [idespecialista || null, idprofesor || null, idestudiante, fechahora, grado || null, seccion || null, nivelatencion, idmotivo, observaciones || null, estado, req.params.id] }
    );

    res.json({ mensaje: 'Atención actualizada correctamente' });
  } catch (err) {
    console.error('PUT /atenciones/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE cancelar atención ──
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE atenciones SET estado='cerrado' WHERE idatencion=?`,
      { replacements: [req.params.id] }
    );
    res.json({ mensaje: 'Atención cerrada correctamente' });
  } catch (err) {
    console.error('DELETE /atenciones/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;