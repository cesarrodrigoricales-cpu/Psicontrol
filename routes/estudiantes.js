const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// ══════════════════════════════════════════════════════
// ⚠️  ORDEN CRÍTICO: rutas específicas ANTES de /:id
// ══════════════════════════════════════════════════════

// ── GET todos los estudiantes ──────────────────────────
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

// ── GET estudiantes de PRIMARIA (grados 1 al 6) ───────
router.get('/primaria', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        e.id, e.idpersona, e.fechanac, e.condicion, e.codigomatricula,
        e.grado, e.seccion,
        p.nombres, p.apellidos, p.telefono, p.genero,
        p.nrodoc AS dni
      FROM estudiantes e
      JOIN personas p ON e.idpersona = p.id
      WHERE CAST(e.grado AS UNSIGNED) BETWEEN 1 AND 6
      ORDER BY CAST(e.grado AS UNSIGNED) ASC, p.apellidos ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /estudiantes/primaria:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET estudiantes de SECUNDARIA (grados 1 al 5) ─────
router.get('/secundaria', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        e.id, e.idpersona, e.fechanac, e.condicion, e.codigomatricula,
        e.grado, e.seccion,
        p.nombres, p.apellidos, p.telefono, p.genero,
        p.nrodoc AS dni
      FROM estudiantes e
      JOIN personas p ON e.idpersona = p.id
      WHERE CAST(e.grado AS UNSIGNED) BETWEEN 1 AND 5
      ORDER BY CAST(e.grado AS UNSIGNED) ASC, p.apellidos ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /estudiantes/secundaria:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET un estudiante por ID ───────────────────────────
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

// ── POST registrar nuevo estudiante ───────────────────
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni,
      grado, seccion,
      contactosEmergencia
    } = req.body;

    const [idpersona] = await sequelize.query(`
      INSERT INTO personas (nombres, apellidos, telefono, genero, nrodoc, tipodoc)
      VALUES (?, ?, ?, ?, ?, 'DNI')
    `, {
      replacements: [nombres || '', apellidos || '', telefono || null, genero || null, dni || null],
      transaction: t
    });

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
      id: idestudiante, idpersona,
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni, grado, seccion,
      contactosEmergencia: contactosEmergencia || []
    });
  } catch (err) {
    await t.rollback();
    console.error('POST /estudiantes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /bulk — inserción masiva desde SIAGIE (secundaria) ──
router.post('/bulk', async (req, res) => {
  const { estudiantes = [] } = req.body;

  if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
    return res.status(400).json({ error: 'Lista de estudiantes vacía' });
  }

  let insertados = 0, actualizados = 0, errores = 0;
  const detalle = [];

  for (const est of estudiantes) {
    const t = await sequelize.transaction();
    try {
      const { nombres, apellidos, dni, grado, seccion, fechanac, genero, condicion } = est;

      const [existe] = await sequelize.query(
        `SELECT e.id, e.idpersona, e.grado, e.seccion
         FROM estudiantes e
         JOIN personas p ON e.idpersona = p.id
         WHERE p.nrodoc = ? LIMIT 1`,
        { replacements: [dni || ''], transaction: t }
      );

      if (existe.length > 0) {
        const actual = existe[0];
        if (actual.grado !== grado || actual.seccion !== seccion) {
          await sequelize.query(
            `UPDATE personas SET nombres=?, apellidos=? WHERE id=?`,
            { replacements: [nombres || '', apellidos || '', actual.idpersona], transaction: t }
          );
          await sequelize.query(
            `UPDATE estudiantes SET grado=?, seccion=?, condicion='activo' WHERE id=?`,
            { replacements: [grado || null, seccion || null, actual.id], transaction: t }
          );
          actualizados++;
          detalle.push({ dni, accion: 'actualizado', id: actual.id });
        } else {
          detalle.push({ dni, accion: 'sin_cambio', id: actual.id });
        }
      } else {
        const [idpersona] = await sequelize.query(`
          INSERT INTO personas (nombres, apellidos, genero, nrodoc, tipodoc)
          VALUES (?, ?, ?, ?, 'DNI')
        `, {
          replacements: [nombres || '', apellidos || '', genero || null, dni || null],
          transaction: t
        });

        const [idest] = await sequelize.query(`
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

        insertados++;
        detalle.push({ dni, accion: 'insertado', id: idest });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      errores++;
      detalle.push({ dni: est.dni, accion: 'error', mensaje: err.message });
      console.error(`[BULK] Error con DNI ${est.dni}:`, err.message);
    }
  }

  res.json({ insertados, actualizados, errores, total: estudiantes.length, detalle });
});

// ── POST /primaria/bulk — inserción masiva para primaria ──
router.post('/primaria/bulk', async (req, res) => {
  const { estudiantes = [] } = req.body;

  if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
    return res.status(400).json({ error: 'Lista de estudiantes vacía' });
  }

  let insertados = 0, actualizados = 0, errores = 0;
  const detalle = [];

  for (const est of estudiantes) {
    const t = await sequelize.transaction();
    try {
      const { nombres, apellidos, dni, grado, seccion, fechanac, genero, condicion } = est;

      // Solo aceptar grados 1-6 (primaria)
      const gradoNum = parseInt(grado);
      if (gradoNum < 1 || gradoNum > 6) {
        await t.rollback();
        detalle.push({ dni, accion: 'ignorado', mensaje: `Grado ${grado} no es de primaria` });
        continue;
      }

      const [existe] = await sequelize.query(
        `SELECT e.id, e.idpersona, e.grado, e.seccion
         FROM estudiantes e
         JOIN personas p ON e.idpersona = p.id
         WHERE p.nrodoc = ? LIMIT 1`,
        { replacements: [dni || ''], transaction: t }
      );

      if (existe.length > 0) {
        const actual = existe[0];
        if (actual.grado !== grado || actual.seccion !== seccion) {
          await sequelize.query(
            `UPDATE personas SET nombres=?, apellidos=? WHERE id=?`,
            { replacements: [nombres || '', apellidos || '', actual.idpersona], transaction: t }
          );
          await sequelize.query(
            `UPDATE estudiantes SET grado=?, seccion=?, condicion='activo' WHERE id=?`,
            { replacements: [grado || null, seccion || null, actual.id], transaction: t }
          );
          actualizados++;
          detalle.push({ dni, accion: 'actualizado', id: actual.id });
        } else {
          detalle.push({ dni, accion: 'sin_cambio', id: actual.id });
        }
      } else {
        const [idpersona] = await sequelize.query(`
          INSERT INTO personas (nombres, apellidos, genero, nrodoc, tipodoc)
          VALUES (?, ?, ?, ?, 'DNI')
        `, {
          replacements: [nombres || '', apellidos || '', genero || null, dni || null],
          transaction: t
        });

        const [idest] = await sequelize.query(`
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

        insertados++;
        detalle.push({ dni, accion: 'insertado', id: idest });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      errores++;
      detalle.push({ dni: est.dni, accion: 'error', mensaje: err.message });
      console.error(`[BULK-PRIMARIA] Error DNI ${est.dni}:`, err.message);
    }
  }

  res.json({ insertados, actualizados, errores, total: estudiantes.length, detalle });
});

// ── PUT actualizar estudiante ──────────────────────────
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      nombres, apellidos, telefono, genero,
      fechanac, condicion, dni,
      grado, seccion,
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

    await sequelize.query(`
      UPDATE personas SET nombres=?, apellidos=?, telefono=?, genero=?, nrodoc=?
      WHERE id=?
    `, {
      replacements: [nombres || '', apellidos || '', telefono || null, genero || null, dni || null, idpersona],
      transaction: t
    });

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