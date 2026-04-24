'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const atenciones = await queryInterface.sequelize.query(
      'SELECT id FROM atenciones LIMIT 2;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    await queryInterface.bulkInsert('calendario_eventos', [
      {
        idatencion:    atenciones.length ? atenciones[0].id : null,
        titulo:        'Reunión con padres de familia',
        tipo:          'reunion',
        fecha:         '2026-05-10',
        hora:          '09:00:00',
        notif_minutos: 30,
        observaciones: 'Coordinación con apoderados del 5to grado'
      },
      {
        idatencion:    atenciones.length > 1 ? atenciones[1].id : null,
        titulo:        'Taller de habilidades sociales',
        tipo:          'taller',
        fecha:         '2026-05-15',
        hora:          '10:30:00',
        notif_minutos: 15,
        observaciones: 'Actividad grupal para estudiantes de secundaria'
      },
      {
        idatencion:    null,
        titulo:        'Capacitación docente',
        tipo:          'capacitacion',
        fecha:         '2026-05-20',
        hora:          '08:00:00',
        notif_minutos: 60,
        observaciones: 'Capacitación interna del equipo de psicología'
      }
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('calendario_eventos', null, {});
  }
};