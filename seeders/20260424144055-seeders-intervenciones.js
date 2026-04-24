'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const atenciones = await queryInterface.sequelize.query(
      'SELECT id FROM atenciones LIMIT 1;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!atenciones.length) throw new Error('Faltan datos en atenciones');

    await queryInterface.bulkInsert('intervenciones', [
      { idatencion: atenciones[0].id, motivo: 'Sesión de relajación grupal',     fecha: '2024-03-15' },
      { idatencion: atenciones[0].id, motivo: 'Tutoría académica personalizada',  fecha: '2024-03-16' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('intervenciones', null, {});
  }
};