'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('intervenciones', [
      { idatencion: 3, motivo: 'Sesión de relajación grupal',     fecha: '2024-03-15', created_at: new Date() },
      { idatencion: 4, motivo: 'Tutoría académica personalizada', fecha: '2024-03-16', created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('intervenciones', null, {});
  }
};