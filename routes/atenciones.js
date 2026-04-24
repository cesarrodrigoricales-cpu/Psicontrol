const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// ── GET todas las atenciones ──
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT 
        a.id, a.fechahora, a.grado, a.seccion,
        a.nivelatencion, a.observaciones, a.estado,
        a.idespecialista, a.idprofesor, a.idestudiante, a.idmotivo,
        CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
        p.nrodoc AS dni,
        e.codigomatricula,
        m.motivoconsulta,
        CONCAT(pe.nombres, ' ', pe.apellidos) AS especialista
      FROM atenciones a
      JOIN estudiantes e     ON a.idestudiante  = e.id
      JOIN personas p        ON e.idpersona     = p.id
      LEFT JOIN motivosconsulta m  ON a.idmotivo = m.id
      LEFT JOIN colaboradores c    ON a.idespecialista = c.id
      LEFT JOIN personas pe        ON c.idpersona      = pe.id
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
      JOIN estudiantes e ON a.idestudiante = e.id
      JOIN personas p    ON e.idpersona    = p.id
      WHERE a.id = ?
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

    if (!idestudiante || !fechahora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: idestudiante, fechahora' });
    }

    // Usar idmotivo=1 como fallback si no se envía
    const motivoFinal = idmotivo || 1;

    const [result] = await sequelize.query(
      `INSERT INTO atenciones 
        (idespecialista, idprofesor, idestudiante, fechahora, grado, seccion, nivelatencion, idmotivo, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [
          idespecialista || null,
          idprofesor     || null,
          idestudiante,
          fechahora,
          grado          || null,
          seccion        || null,
          nivelatencion  || 'moderado',
          motivoFinal,
          observaciones  || null,
          estado         || 'pendiente'
      ]}
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

    if (!idestudiante || !fechahora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    await sequelize.query(
      `UPDATE atenciones SET
        idespecialista=?, idprofesor=?, idestudiante=?, fechahora=?,
        grado=?, seccion=?, nivelatencion=?, idmotivo=?, observaciones=?, estado=?
       WHERE id=?`,
      { replacements: [
          idespecialista || null,
          idprofesor     || null,
          idestudiante,
          fechahora,
          grado          || null,
          seccion        || null,
          nivelatencion  || 'moderado',
          idmotivo       || 1,
          observaciones  || null,
          estado,
          req.params.id
      ]}
    );

    res.json({ mensaje: 'Atención actualizada correctamente' });
  } catch (err) {
    console.error('PUT /atenciones/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE cerrar atención ──
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE atenciones SET estado='cerrado' WHERE id=?`,
      { replacements: [req.params.id] }
    );
    res.json({ mensaje: 'Atención cerrada correctamente' });
  } catch (err) {
    console.error('DELETE /atenciones/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;