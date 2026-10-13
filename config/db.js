const mysql = require("mysql2");

// DB_SSL=true turns on TLS. Aiven signs its certificate with its own CA, so paste the contents of its
// ca.pem into DB_SSL_CA (line breaks may be written as \n) and the certificate is checked properly.
const sslOptions = () => {
  if (process.env.DB_SSL !== 'true') return undefined;
  const options = { minVersion: 'TLSv1.2' };
  if (process.env.DB_SSL_CA) options.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  return options;
};

// Connection pool. Values come from .env so no password lives in the code.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "medivault",
  waitForConnections: true,
  connectionLimit: 10,
  ssl: sslOptions(), // DB_SSL=true for hosted databases that require TLS
  dateStrings: true,     // DATE columns come back as YYYY-MM-DD text, no timezone shifts
  decimalNumbers: true   // DECIMAL columns come back as numbers
});

module.exports = pool.promise();
