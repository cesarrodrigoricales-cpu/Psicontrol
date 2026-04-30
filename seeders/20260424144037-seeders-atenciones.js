'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Sin datos iniciales — las atenciones se crean desde el sistema
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Atenciones', null, {});
  }
};