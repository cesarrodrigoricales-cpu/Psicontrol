'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      idrol:      { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombrerol:  { type: Sequelize.STRING(100), allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  }
};