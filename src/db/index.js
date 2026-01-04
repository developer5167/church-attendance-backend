const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

});

pool.connect().catch((err) => {
    console.error('Database connection error:', err.stack);
});
pool.on('connect', () => {  
    console.log('Connected to the database');
});

module.exports = pool;
