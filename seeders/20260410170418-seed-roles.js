'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('roles', [
      { nombrerol: 'Administrador', created_at: new Date() },
      { nombrerol: 'Psicólogo',     created_at: new Date() },
      { nombrerol: 'Profesor',      created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};