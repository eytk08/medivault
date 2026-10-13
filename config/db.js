const mysql = require("mysql2");

// Connection pool. Values come from .env so no password lives in the code.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "medivault",
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined, // DB_SSL=true for hosted databases that require TLS
  dateStrings: true,     // DATE columns come back as YYYY-MM-DD text, no timezone shifts
  decimalNumbers: true   // DECIMAL columns come back as numbers
});

module.exports = pool.promise();
