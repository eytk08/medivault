
const mysql = require("mysql2");

// Enable TLS for the hosted Aiven database.
// For certificate verification, provide Aiven's CA certificate in DB_SSL_CA.
const sslOptions = () => {
  if (process.env.DB_SSL !== "true") return undefined;

  const options = {
    minVersion: "TLSv1.2",
  };

  if (process.env.DB_SSL_CA) {
    options.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  }

  return options;
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "medivault",

  ssl: sslOptions(),

  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 15000,

  dateStrings: true,
  decimalNumbers: true,
});

module.exports = pool.promise();
