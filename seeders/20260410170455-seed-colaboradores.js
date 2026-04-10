'use strict';
module.exports = {
  async up(queryInterface) {
   await queryInterface.bulkInsert('colaboradores', [
  { idcolaborador: 1, idpersona: 1, idrol: 1, usuario: 'admin', created_at: new Date() },
  { idcolaborador: 2, idpersona: 2, idrol: 2, usuario: 'psicologa1', created_at: new Date() },
  { idcolaborador: 3, idpersona: 5, idrol: 3, usuario: 'profesor1', created_at: new Date() },
]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('colaboradores', null, {});
  }
};