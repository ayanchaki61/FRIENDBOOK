require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MSSQL_DB || process.env.DB_NAME,
  process.env.MSSQL_USER || process.env.DB_USER,
  process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD,
  {
    host: process.env.MSSQL_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433),
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true' || false,
      },
    },
    logging: false,
  }
);

const connectSQL = async () => {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('MSSQL connected');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MSSQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectSQL };
