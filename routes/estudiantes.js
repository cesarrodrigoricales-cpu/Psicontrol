const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// GET - listar todos los estudiantes
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT e.*, p.nombres, p.apellidos, p.telefono, p.genero
      FROM estudiantes e
      JOIN personas p ON e.idpersona = p.idpersona
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - registrar nuevo estudiante
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nombres, apellidos, telefono, genero, fechanac, condicion } = req.body;

    // 1. Insertar en personas
    const [resultPersona] = await sequelize.query(`
      INSERT INTO personas (nombres, apellidos, telefono, genero)
      VALUES (:nombres, :apellidos, :telefono, :genero)
    `, {
      replacements: {
        nombres:   nombres   || '',
        apellidos: apellidos || '',
        telefono:  telefono  || null,
        genero:    genero    || null,
      },
      transaction: t
    });

    const idpersona = resultPersona;

    // 2. Insertar en estudiantes
    const [resultEstudiante] = await sequelize.query(`
      INSERT INTO estudiantes (idpersona, fechanac, condicion)
      VALUES (:idpersona, :fechanac, :condicion)
    `, {
      replacements: {
        idpersona,
        fechanac:  fechanac  || null,
        condicion: condicion || null,
      },
      transaction: t
    });

    await t.commit();

    res.status(201).json({
      idestudiante: resultEstudiante,
      idpersona,
      nombres,
      apellidos
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;