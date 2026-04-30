'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Sin datos iniciales
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Monitoreos', null, {});
  }
};