'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendario_eventos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idatencion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'atenciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      titulo:        { type: Sequelize.STRING(150), allowNull: false },
      tipo:          { type: Sequelize.STRING(30),  allowNull: true },
      fecha:         { type: Sequelize.DATEONLY,    allowNull: false },
      hora:          { type: Sequelize.TIME,        allowNull: true },
      notif_minutos: { type: Sequelize.INTEGER,     allowNull: true, defaultValue: 15 },
      observaciones: { type: Sequelize.TEXT,        allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('calendario_eventos');
  }
};