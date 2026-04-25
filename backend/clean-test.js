const mysql = require('mysql2/promise');
require('dotenv').config();

async function clean() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await c.execute("DELETE FROM candidatures WHERE candidat_id = (SELECT id FROM candidats WHERE utilisateur_id = (SELECT id FROM utilisateurs WHERE email = 'liva@gmail.com'))");
  console.log('Applications deleted for liva@gmail.com');
  await c.end();
}

clean().catch(err => console.error(err));
