'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('motivosconsulta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      motivoconsulta: { type: Sequelize.STRING(200), allowNull: false }  // ← corregido de BIGINT a STRING
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('motivosconsulta');
  }
};