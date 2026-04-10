'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('monitoreos', {
      idmonitoreo:     { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      idatencion:      {
        type: Sequelize.INTEGER,
        references: { model: 'atenciones', key: 'idatencion' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fechahora:       { type: Sequelize.DATE },
      seguimiento:     { type: Sequelize.TEXT },
      recomendaciones: { type: Sequelize.TEXT },
      created_at:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('monitoreos');
  }
};