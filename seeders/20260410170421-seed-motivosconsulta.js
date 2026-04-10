'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('motivosconsulta', [
      { motivoconsulta: 'Ansiedad',                     created_at: new Date() },
      { motivoconsulta: 'Problemas de conducta',         created_at: new Date() },
      { motivoconsulta: 'Bajo rendimiento académico',    created_at: new Date() },
      { motivoconsulta: 'Problemas familiares',          created_at: new Date() },
      { motivoconsulta: 'Acoso escolar (bullying)',      created_at: new Date() },
      { motivoconsulta: 'Depresión',                    created_at: new Date() },
      { motivoconsulta: 'Problemas de atención (TDAH)', created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('motivosconsulta', null, {});
  }
};