'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('personas', {
      idpersona:  { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      apellidos:  { type: Sequelize.STRING(100) },
      nombres:    { type: Sequelize.STRING(100) },
      tipodoc:    { type: Sequelize.STRING(50) },
      nrodoc:     { type: Sequelize.STRING(50) },
      direccion:  { type: Sequelize.STRING(150) },
      referencia: { type: Sequelize.STRING(150) },
      telefono:   { type: Sequelize.STRING(30) },
      genero:     { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('personas');
  }
};