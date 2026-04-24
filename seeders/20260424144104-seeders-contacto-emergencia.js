'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const estudiantes = await queryInterface.sequelize.query(
      'SELECT id FROM estudiantes LIMIT 2;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!estudiantes.length) throw new Error('Faltan datos en estudiantes');

    await queryInterface.bulkInsert('contacto_emergencia', [
      { idestudiante: estudiantes[0].id, nombre: 'María López',  parentesco: 'Madre', celular: '987654321' },
      { idestudiante: estudiantes[0].id, nombre: 'Carlos López', parentesco: 'Padre', celular: '987654322' },
      { idestudiante: estudiantes[1] ? estudiantes[1].id : estudiantes[0].id, nombre: 'Ana Torres', parentesco: 'Madre', celular: '912345678' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('contacto_emergencia', null, {});
  }
};