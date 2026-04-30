'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('personas', [
      {
        nombres:    'Ana',
        apellidos:  'López',
        tipodoc:    'DNI',
        nrodoc:     '12345678',
        telefono:   '987654321',
        genero:     'Femenino',
        direccion:  null,
        referencia: null
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('personas', null, {});
  }
};