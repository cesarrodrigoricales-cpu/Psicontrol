'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const atenciones = await queryInterface.sequelize.query(
      'SELECT id FROM atenciones LIMIT 1;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!atenciones.length) throw new Error('Faltan datos en atenciones');

    await queryInterface.bulkInsert('monitoreos', [
      {
        idatencion:      atenciones[0].id,
        fechahora:       new Date('2024-03-17 09:00:00'),
        seguimiento:     'Se observa mejora en la actitud del estudiante.',
        recomendaciones: 'Continuar con técnicas de respiración y relajación.'
      },
      {
        idatencion:      atenciones[0].id,
        fechahora:       new Date('2024-03-19 10:00:00'),
        seguimiento:     'El estudiante muestra mayor participación en clase.',
        recomendaciones: 'Reforzar hábitos de estudio en casa.'
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('monitoreos', null, {});
  }
};