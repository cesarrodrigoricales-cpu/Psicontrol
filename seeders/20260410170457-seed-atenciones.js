'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('atenciones', [
      {
        idespecialista: 1,
        idprofesor:     2,
        idestudiante:   7,
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
        idespecialista: 1,
        idprofesor:     2,
        idestudiante:   8,
        fechahora:      new Date('2024-03-12 10:30:00'),
        grado:          '5to',
        seccion:        'B',
        nivelatencion:  'moderado',
        idmotivo:       2,
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