'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('estudiantes', [
      { idpersona: 3, codigomatricula: 'MAT-2024-001', fechanac: '2010-05-12', condicion: 'Regular', created_at: new Date() },
      { idpersona: 4, codigomatricula: 'MAT-2024-002', fechanac: '2011-08-23', condicion: 'Regular', created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('estudiantes', null, {});
  }
};