const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// ── GET todos los estudiantes ──
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        e.id, e.idpersona, e.fechanac, e.condicion, e.codigomatricula,
        e.grado, e.seccion,
        p.nombres, p.apellidos, p.telefono, p.genero,
        p.nrodoc AS dni
      FROM estudiantes e
      JOIN personas p ON e.idpersona = p.id
      ORDER BY p.apellidos ASC
    `);

    const [contactos] = await sequelize.query(`SELECT * FROM contacto_emergencia`);
    const map = {};
    contactos.forEach(c => {
      if (!map[c.idestudiante]) map[c.idestudiante] = [];
      map[c.idestudiante].push(c);
    });
    rows.forEach(e => { e.contactosEmergencia = map[e.id] || []; });

    res.json(rows);
  } catch (err) {
    console.error('GET /estudiantes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET un estudiante por ID ──
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT e.id, e.idpersona, e.fechanac, e.condicion, e.codigomatricula,
             e.grado, e.seccion,
             p.nombres, p.apellidos, p.telefono, p.genero, p.nrodoc AS dni
      FROM estudiantes e
      JOIN personas p ON e.idpersona = p.id
      WHERE e.id = ?
    `, { replacements: [req.params.id] });

    if (rows.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const [contactos] = await sequelize.query(
      `SELECT * FROM contacto_emergencia WHERE idestudiante = ?`,
      { replacements: [req.params.id] }
    );
    rows[0].contactosEmergencia = contactos;

    res.json(rows[0]);
  } catch (err) {
    console.error('GET /estudiantes/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST registrar nuevo estudiante ──
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni,
      grado, seccion,           // ✅ ahora se usan
      contactosEmergencia
    } = req.body;

    // 1. Insertar persona
    const [idpersona] = await sequelize.query(`
      INSERT INTO personas (nombres, apellidos, telefono, genero, nrodoc, tipodoc)
      VALUES (?, ?, ?, ?, ?, 'DNI')
    `, {
      replacements: [nombres || '', apellidos || '', telefono || null, genero || null, dni || null],
      transaction: t
    });

    // 2. Insertar estudiante ✅ con grado y seccion
    const [idestudiante] = await sequelize.query(`
      INSERT INTO estudiantes (idpersona, fechanac, condicion, grado, seccion)
      VALUES (?, ?, ?, ?, ?)
    `, {
      replacements: [
        idpersona,
        fechanac  || null,
        condicion || 'activo',
        grado     || null,
        seccion   || null
      ],
      transaction: t
    });

    // 3. Contactos de emergencia
    if (Array.isArray(contactosEmergencia) && contactosEmergencia.length > 0) {
      for (const c of contactosEmergencia) {
        if (c.nombre || c.celular) {
          await sequelize.query(`
            INSERT INTO contacto_emergencia (idestudiante, nombre, parentesco, celular)
            VALUES (?, ?, ?, ?)
          `, {
            replacements: [idestudiante, c.nombre || '', c.parentesco || null, c.celular || null],
            transaction: t
          });
        }
      }
    }

    await t.commit();
    res.status(201).json({
      id: idestudiante,
      idpersona,
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni,
      grado, seccion,
      contactosEmergencia: contactosEmergencia || []
    });
  } catch (err) {
    await t.rollback();
    console.error('POST /estudiantes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT actualizar estudiante ──
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni,
      grado, seccion,           // ✅ ahora se actualizan
      contactosEmergencia
    } = req.body;

    const [rows] = await sequelize.query(
      `SELECT idpersona FROM estudiantes WHERE id = ?`,
      { replacements: [req.params.id], transaction: t }
    );
    if (rows.length === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    const { idpersona } = rows[0];

    // Actualizar persona
    await sequelize.query(`
      UPDATE personas SET nombres=?, apellidos=?, telefono=?, genero=?, nrodoc=?
      WHERE id=?
    `, {
      replacements: [nombres || '', apellidos || '', telefono || null, genero || null, dni || null, idpersona],
      transaction: t
    });

    // Actualizar estudiante ✅ con grado y seccion
    await sequelize.query(`
      UPDATE estudiantes SET fechanac=?, condicion=?, grado=?, seccion=?
      WHERE id=?
    `, {
      replacements: [
        fechanac  || null,
        condicion || 'activo',
        grado     || null,
        seccion   || null,
        req.params.id
      ],
      transaction: t
    });

    // Actualizar contactos
    if (Array.isArray(contactosEmergencia)) {
      await sequelize.query(
        `DELETE FROM contacto_emergencia WHERE idestudiante = ?`,
        { replacements: [req.params.id], transaction: t }
      );
      for (const c of contactosEmergencia) {
        if (c.nombre || c.celular) {
          await sequelize.query(`
            INSERT INTO contacto_emergencia (idestudiante, nombre, parentesco, celular)
            VALUES (?, ?, ?, ?)
          `, {
            replacements: [req.params.id, c.nombre || '', c.parentesco || null, c.celular || null],
            transaction: t
          });
        }
      }
    }

    await t.commit();
    res.json({ mensaje: 'Estudiante actualizado correctamente' });
  } catch (err) {
    await t.rollback();
    console.error('PUT /estudiantes/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;