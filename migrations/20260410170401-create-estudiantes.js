'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('estudiantes', {
      idestudiante:    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      idpersona:       {
        type: Sequelize.INTEGER,
        references: { model: 'personas', key: 'idpersona' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      codigomatricula: { type: Sequelize.STRING(50) },
      fechanac:        { type: Sequelize.DATEONLY },
      condicion:       { type: Sequelize.STRING(50) },
      created_at:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('estudiantes');
  }
};