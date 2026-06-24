const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Could not connect to PostgreSQL:', err.message);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

module.exports = pool;
