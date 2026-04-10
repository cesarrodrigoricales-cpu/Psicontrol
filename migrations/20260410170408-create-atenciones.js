'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('atenciones', {
      idatencion:     { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      idespecialista: {
        type: Sequelize.INTEGER,
        references: { model: 'colaboradores', key: 'idcolaborador' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      idprofesor:     {
        type: Sequelize.INTEGER,
        references: { model: 'colaboradores', key: 'idcolaborador' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      idestudiante:   {
        type: Sequelize.INTEGER,
        references: { model: 'estudiantes', key: 'idestudiante' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fechahora:      { type: Sequelize.DATE },
      grado:          { type: Sequelize.STRING(50) },
      seccion:        { type: Sequelize.STRING(50) },
      nivelatencion:  { type: Sequelize.ENUM('leve', 'moderado', 'grave'), allowNull: false },
      idmotivo:       {
        type: Sequelize.INTEGER,
        references: { model: 'motivosconsulta', key: 'idmotivo' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      observaciones:  { type: Sequelize.TEXT },
      estado:         { type: Sequelize.ENUM('activo', 'cerrado', 'derivado', 'pendiente'), defaultValue: 'pendiente' },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('atenciones');
  }
};