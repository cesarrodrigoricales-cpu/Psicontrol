'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('estudiantes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idpersona: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'personas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fechanac:        { type: Sequelize.DATEONLY, allowNull: true },
      condicion:       { type: Sequelize.STRING(50), allowNull: true },
      codigomatricula: { type: Sequelize.STRING(30), allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('estudiantes');
  }
};