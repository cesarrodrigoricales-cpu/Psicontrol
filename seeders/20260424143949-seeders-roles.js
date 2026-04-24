'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('roles', [
      { nombrerol: 'Administrador' },
      { nombrerol: 'Psicólogo' },
      { nombrerol: 'Profesor' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};