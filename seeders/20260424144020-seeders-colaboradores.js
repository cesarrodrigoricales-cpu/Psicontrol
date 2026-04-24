'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const personas = await queryInterface.sequelize.query(
      'SELECT id FROM personas ORDER BY id LIMIT 3;',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const roles = await queryInterface.sequelize.query(
      'SELECT id FROM roles ORDER BY id LIMIT 3;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (personas.length < 3 || roles.length < 3) {
      throw new Error('No hay suficientes personas o roles');
    }

    await queryInterface.bulkInsert('colaboradores', [
      { idpersona: personas[0].id, idrol: roles[0].id, usuario: 'admin',      claveacceso: '123456' },
      { idpersona: personas[1].id, idrol: roles[1].id, usuario: 'psicologa1', claveacceso: '123456' },
      { idpersona: personas[2].id, idrol: roles[2].id, usuario: 'profesor1',  claveacceso: '123456' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('colaboradores', null, {});
  }
};