const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // 1. Check user
  const [users] = await c.execute("SELECT id, email, role, statut FROM utilisateurs WHERE email LIKE '%liva%'");
  console.log('=== UTILISATEURS ===');
  console.log(JSON.stringify(users, null, 2));

  // 2. Check if candidat profile exists
  for (const u of users) {
    if (u.role === 'candidat') {
      const [cands] = await c.execute("SELECT id FROM candidats WHERE utilisateur_id = ?", [u.id]);
      console.log(`\nProfil candidat pour ${u.email}:`, cands.length ? 'EXISTE (id: ' + cands[0].id + ')' : 'MANQUANT!');
    }
  }

  // 3. Check messages sent TO this user
  for (const u of users) {
    const [msgs] = await c.execute("SELECT m.id, m.contenu, m.date_envoi, exp.email as from_email FROM messages m JOIN utilisateurs exp ON m.expediteur_id = exp.id WHERE m.destinataire_id = ? ORDER BY m.date_envoi DESC LIMIT 5", [u.id]);
    console.log(`\nMessages reçus par ${u.email}:`, msgs.length);
    msgs.forEach(m => console.log(`  - De: ${m.from_email} | "${m.contenu.substring(0, 50)}" | ${m.date_envoi}`));
  }

  await c.end();
}

check().catch(err => console.error('ERREUR:', err));
