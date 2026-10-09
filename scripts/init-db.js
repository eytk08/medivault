// Creates the database, builds the tables, and optionally loads sample data.
//   npm run db:init   -> empty tables (this RESETS existing data)
//   npm run db:seed   -> tables plus fake sample patients
//   npm run db:ensure -> like db:seed, but does nothing if the tables already exist (safe on every deploy).
//                        Set SEED_DEMO=false to create the tables without sample data.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const dbName = process.env.DB_NAME || 'medivault';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
    await conn.query(`USE \`${dbName}\``);
    if (process.argv.includes('--if-empty')) {
      // Never touch a database that is already set up. This is what makes redeploys safe.
      const [[found]] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'", [dbName]);
      if (found.n > 0) {
        console.log(`Database "${dbName}" is already set up. Nothing to do.`);
        return;
      }
    }
    await conn.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    console.log(`Tables created in "${dbName}".`);
    const wantSample = process.argv.includes('--seed') && process.env.SEED_DEMO !== 'false';
    if (wantSample) {
      await conn.query(fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8'));
      console.log('Sample data loaded. Demo login: demo@medivault.test / Demo@1234');
    }
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
