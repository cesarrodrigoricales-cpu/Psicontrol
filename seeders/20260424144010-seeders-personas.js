'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('personas', [
      { nombres: 'Carlos',    apellidos: 'García' },
      { nombres: 'María',     apellidos: 'Torres' },
      { nombres: 'Juan',      apellidos: 'Mamani' },
      { nombres: 'Lucía',     apellidos: 'Quispe' },
      { nombres: 'Rodrigo',   apellidos: 'Flores' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('personas', null, {});
  }
};