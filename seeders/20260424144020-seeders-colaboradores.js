'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const personas = await queryInterface.sequelize.query(
      'SELECT id FROM personas ORDER BY id;',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const roles = await queryInterface.sequelize.query(
      'SELECT id FROM roles ORDER BY id;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (personas.length === 0 || roles.length === 0) {
      throw new Error('No hay personas o roles');
    }

    await queryInterface.bulkInsert('colaboradores', [
      { idpersona: personas[0].id, idrol: roles[0].id, usuario: 'admin',      claveacceso: '123456' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('colaboradores', null, {});
  }
};