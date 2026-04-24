'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombrerol: { type: Sequelize.STRING(50), allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  }
};