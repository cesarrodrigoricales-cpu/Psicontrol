'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const personas = await queryInterface.sequelize.query(
      'SELECT id FROM personas ORDER BY id LIMIT 5;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (personas.length < 4) throw new Error('No hay suficientes personas');

    await queryInterface.bulkInsert('estudiantes', [
      { idpersona: personas[3].id, codigomatricula: 'MAT-2024-001', fechanac: '2010-05-12', condicion: 'Regular' },
      { idpersona: personas[4].id, codigomatricula: 'MAT-2024-002', fechanac: '2011-08-23', condicion: 'Regular' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('estudiantes', null, {});
  }
};