'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('atenciones', [
      {
        idespecialista: 2,
        idprofesor:     3,
        idestudiante:   1,
        fechahora:      new Date('2024-03-10 09:00:00'),
        grado:          '4to',
        seccion:        'A',
        nivelatencion:  'leve',
        idmotivo:       1,
        observaciones:  'Estudiante presenta nerviosismo antes de exámenes.',
        estado:         'activo',
        created_at:     new Date()
      },
      {
        idespecialista: 2,
        idprofesor:     3,
        idestudiante:   2,
        fechahora:      new Date('2024-03-12 10:30:00'),
        grado:          '5to',
        seccion:        'B',
        nivelatencion:  'moderado',
        idmotivo:       3,
        observaciones:  'Notas bajas en matemáticas y comunicación.',
        estado:         'pendiente',
        created_at:     new Date()
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('atenciones', null, {});
  }
};