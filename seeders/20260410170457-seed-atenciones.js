'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const colaboradores = await queryInterface.sequelize.query(
      "SELECT idcolaborador FROM colaboradores LIMIT 1;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const estudiantes = await queryInterface.sequelize.query(
      "SELECT idestudiante FROM estudiantes LIMIT 1;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const motivos = await queryInterface.sequelize.query(
      "SELECT idmotivo FROM motivosconsulta LIMIT 1;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!colaboradores.length || !estudiantes.length || !motivos.length) {
      throw new Error("Faltan datos en colaboradores, estudiantes o motivosconsulta");
    }

    await queryInterface.bulkInsert('atenciones', [
      {
        idespecialista: colaboradores[0].idcolaborador,
        idprofesor: null,
        idestudiante: estudiantes[0].idestudiante,
        fechahora: new Date(),          // ✅ CORRECTO (no "fecha")
        grado: '5to',
        seccion: 'A',
        nivelatencion: 'leve',          // ⚠️ obligatorio
        idmotivo: motivos[0].idmotivo,
        observaciones: 'Primera atención de prueba',
        estado: 'pendiente',
        created_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('atenciones', null, {});
  }
};