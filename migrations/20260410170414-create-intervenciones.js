'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intervenciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idatencion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'atenciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      motivo: { type: Sequelize.STRING(200), allowNull: true },
      fecha:  { type: Sequelize.DATEONLY,    allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('intervenciones');
  }
};