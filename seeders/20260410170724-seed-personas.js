'use strict';
module.exports = {
  async up(queryInterface) {
  await queryInterface.bulkInsert('personas', [
  { idpersona: 1, nombres: 'Carlos', apellidos: 'García', created_at: new Date() },
  { idpersona: 2, nombres: 'María', apellidos: 'Torres', created_at: new Date() },
  { idpersona: 3, nombres: 'Juan', apellidos: 'Mamani', created_at: new Date() }
]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('personas', null, {});
  }
};