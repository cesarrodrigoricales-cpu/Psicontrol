'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('estudiantes', 'grado',   { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('estudiantes', 'seccion', { type: Sequelize.STRING(5),  allowNull: true });
    await queryInterface.addColumn('estudiantes', 'nivel',   { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'secundaria' });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('estudiantes', 'grado');
    await queryInterface.removeColumn('estudiantes', 'seccion');
    await queryInterface.removeColumn('estudiantes', 'nivel');
  }
};