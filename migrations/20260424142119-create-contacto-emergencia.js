'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contacto_emergencia', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idestudiante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'estudiantes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nombre:      { type: Sequelize.STRING(100), allowNull: false },
      parentesco:  { type: Sequelize.STRING(50),  allowNull: true },
      celular:     { type: Sequelize.STRING(15),  allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('contacto_emergencia');
  }
};