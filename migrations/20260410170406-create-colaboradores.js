'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('colaboradores', {
      idcolaborador: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      idpersona:     {
        type: Sequelize.INTEGER,
        references: { model: 'personas', key: 'idpersona' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      idrol:         {
        type: Sequelize.INTEGER,
        references: { model: 'roles', key: 'idrol' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      usuario:       { type: Sequelize.STRING(50), unique: true, allowNull: false },
      claveacceso:   { type: Sequelize.STRING(255), allowNull: false },
      created_at:    { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('colaboradores');
  }
};