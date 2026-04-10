'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('monitoreos', [
      {
        idatencion:      1,
        fechahora:       new Date('2024-03-17 09:00:00'),
        seguimiento:     'Se observa mejora en la actitud del estudiante.',
        recomendaciones: 'Continuar con técnicas de respiración y relajación.',
        created_at:      new Date()
      },
      {
        idatencion:      2,
        fechahora:       new Date('2024-03-19 10:00:00'),
        seguimiento:     'El estudiante muestra mayor participación en clase.',
        recomendaciones: 'Reforzar hábitos de estudio en casa.',
        created_at:      new Date()
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('monitoreos', null, {});
  }
};