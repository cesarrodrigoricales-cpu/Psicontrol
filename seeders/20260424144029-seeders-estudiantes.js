'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Sin datos iniciales — se importan desde SIAGIE
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Estudiantes', null, {});
  }
};