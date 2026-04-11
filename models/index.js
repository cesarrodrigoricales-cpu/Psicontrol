const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('LocalPsico', 'root', null, {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

sequelize.authenticate()
  .then(() => console.log('✅ Conexión a la BD exitosa'))
  .catch(err => console.error('❌ Error conectando a la BD:', err));

module.exports = { sequelize };