'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('motivosconsulta', [
      { motivoconsulta: 'Ansiedad' },
      { motivoconsulta: 'Problemas de conducta' },
      { motivoconsulta: 'Bajo rendimiento académico' },
      { motivoconsulta: 'Problemas familiares' },
      { motivoconsulta: 'Acoso escolar (bullying)' },
      { motivoconsulta: 'Depresión' },
      { motivoconsulta: 'Problemas de atención (TDAH)' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('motivosconsulta', null, {});
  }
};