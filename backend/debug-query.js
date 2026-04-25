const mysql = require('mysql2/promise');
require('dotenv').config();

async function debug() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const userId = 'da00e746-9443-43f0-9e3c-c1c3478a7823'; // liva@gmail.com

  try {
    const [rows] = await c.execute(
      `SELECT u.id, u.prenom, u.nom, u.role,
              m.contenu AS dernier_message,
              m.date_envoi,
              (SELECT COUNT(*) FROM messages 
               WHERE destinataire_id = ? AND expediteur_id = u.id AND lu = 0) AS non_lu
       FROM utilisateurs u
       JOIN messages m ON m.id = (
         SELECT id FROM messages
         WHERE (expediteur_id = u.id AND destinataire_id = ?)
            OR (expediteur_id = ? AND destinataire_id = u.id)
         ORDER BY date_envoi DESC
         LIMIT 1
       )
       ORDER BY m.date_envoi DESC`,
      [userId, userId, userId]
    );
    console.log('Query result:', rows);
  } catch (err) {
    console.error('Query error:', err);
  }

  await c.end();
}

debug();
