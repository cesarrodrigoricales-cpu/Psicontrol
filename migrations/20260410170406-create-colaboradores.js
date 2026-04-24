'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('colaboradores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idpersona: {
        type: Sequelize.INTEGER,        // ← corregido de BIGINT a INTEGER
        allowNull: false,
        references: { model: 'personas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      idrol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      usuario:     { type: Sequelize.STRING(50),  allowNull: false, unique: true },
      claveacceso: { type: Sequelize.STRING(255), allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('colaboradores');
  }
};