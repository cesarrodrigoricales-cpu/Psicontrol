'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('atenciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idespecialista: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'colaboradores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      idprofesor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'colaboradores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      idestudiante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'estudiantes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      idmotivo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'motivosconsulta', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fechahora:     { type: Sequelize.DATE,        allowNull: false },
      grado:         { type: Sequelize.STRING(10),  allowNull: true },  // ← corregido de INTEGER a STRING
      seccion:       { type: Sequelize.STRING(5),   allowNull: true },
      nivelatencion: { type: Sequelize.STRING(20),  allowNull: true },
      observaciones: { type: Sequelize.TEXT,        allowNull: true },
      estado:        { type: Sequelize.STRING(20),  allowNull: true, defaultValue: 'pendiente' }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('atenciones');
  }
};