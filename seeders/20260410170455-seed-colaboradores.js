'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const personas = await queryInterface.sequelize.query(
      "SELECT idpersona FROM personas ORDER BY idpersona LIMIT 3;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const roles = await queryInterface.sequelize.query(
      "SELECT idrol FROM roles ORDER BY idrol LIMIT 3;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (personas.length < 3 || roles.length < 3) {
      throw new Error("No hay suficientes personas o roles");
    }

    await queryInterface.bulkInsert('colaboradores', [
      {
        idpersona: personas[0].idpersona,
        idrol: roles[0].idrol,
        usuario: 'admin',
        claveacceso: '123456',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        idpersona: personas[1].idpersona,
        idrol: roles[1].idrol,
        usuario: 'psicologa1',
        claveacceso: '123456',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        idpersona: personas[2].idpersona,
        idrol: roles[2].idrol,
        usuario: 'profesor1',
        claveacceso: '123456',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('colaboradores', null, {});
  }
};