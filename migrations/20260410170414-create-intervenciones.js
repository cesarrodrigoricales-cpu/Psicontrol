'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intervenciones', {
      idintervencion: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      idatencion:     {
        type: Sequelize.INTEGER,
        references: { model: 'atenciones', key: 'idatencion' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      motivo:         { type: Sequelize.STRING(200) },
      fecha:          { type: Sequelize.DATEONLY },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('intervenciones');
  }
};