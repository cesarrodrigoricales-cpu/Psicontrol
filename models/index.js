const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3303,
    dialect: 'mysql',
    logging: false,

    // ── Pool de conexiones ──
    pool: {
      max: 10,        // máximo de conexiones simultáneas
      min: 0,
      acquire: 30000,  // tiempo máx (ms) esperando una conexión libre antes de fallar
      idle: 10000      // tiempo (ms) que una conexión puede estar inactiva antes de liberarse
                       // IMPORTANTE: debe ser MENOR que el wait_timeout configurado en tu MySQL
    },

    dialectOptions: {
      connectTimeout: 60000
    },

    // ── Reintentos automáticos ante errores de conexión ──
    retry: {
      max: 3,
      match: [
        /ConnectionError/,
        /ConnectionRefusedError/,
        /ConnectionTimedOutError/,
        /TimeoutError/,
        /Connection lost/i,
        /ECONNRESET/,
        /EPIPE/,
        /PROTOCOL_CONNECTION_LOST/
      ]
    }
  }
);

sequelize.authenticate()
  .then(() => console.log('Conexión a la BD exitosa'))
  .catch(err => console.error('Error conectando a la BD:', err));

module.exports = { sequelize };