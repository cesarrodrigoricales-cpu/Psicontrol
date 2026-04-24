'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('personas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      apellidos:  { type: Sequelize.STRING(100), allowNull: false },
      nombres:    { type: Sequelize.STRING(100), allowNull: false },
      tipodoc:    { type: Sequelize.STRING(20),  allowNull: true },
      nrodoc:     { type: Sequelize.STRING(20),  allowNull: true },
      direccion:  { type: Sequelize.STRING(200), allowNull: true },
      referencia: { type: Sequelize.STRING(200), allowNull: true },
      telefono:   { type: Sequelize.STRING(15),  allowNull: true },
      genero:     { type: Sequelize.STRING(20),  allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('personas');
  }
};