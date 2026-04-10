'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('motivosconsulta', {
      idmotivo:       { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      motivoconsulta: { type: Sequelize.STRING(200), allowNull: false },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('motivosconsulta');
  }
};