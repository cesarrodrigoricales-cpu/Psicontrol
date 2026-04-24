'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const colaboradores = await queryInterface.sequelize.query(
      'SELECT id FROM colaboradores LIMIT 1;',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const estudiantes = await queryInterface.sequelize.query(
      'SELECT id FROM estudiantes LIMIT 1;',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const motivos = await queryInterface.sequelize.query(
      'SELECT id FROM motivosconsulta LIMIT 1;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!colaboradores.length || !estudiantes.length || !motivos.length) {
      throw new Error('Faltan datos en colaboradores, estudiantes o motivosconsulta');
    }

    await queryInterface.bulkInsert('atenciones', [
      {
        idespecialista: colaboradores[0].id,
        idprofesor:     null,
        idestudiante:   estudiantes[0].id,
        fechahora:      new Date(),
        grado:          '5to',
        seccion:        'A',
        nivelatencion:  'leve',
        idmotivo:       motivos[0].id,
        observaciones:  'Primera atención de prueba',
        estado:         'pendiente'
      }
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('atenciones', null, {});
  }
};