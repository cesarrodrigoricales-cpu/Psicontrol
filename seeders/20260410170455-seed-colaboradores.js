'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('colaboradores', [
      { idpersona: 1, idrol: 1, usuario: 'admin',      claveacceso: '123456', created_at: new Date() },
      { idpersona: 2, idrol: 2, usuario: 'psicologa1', claveacceso: '123456', created_at: new Date() },
      { idpersona: 5, idrol: 3, usuario: 'profesor1',  claveacceso: '123456', created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('colaboradores', null, {});
  }
};