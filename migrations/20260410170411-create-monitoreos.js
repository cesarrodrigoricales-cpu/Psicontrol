'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('monitoreos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idatencion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'atenciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fechahora:       { type: Sequelize.DATE, allowNull: true },
      seguimiento:     { type: Sequelize.TEXT, allowNull: true },
      recomendaciones: { type: Sequelize.TEXT, allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('monitoreos');
  }
};