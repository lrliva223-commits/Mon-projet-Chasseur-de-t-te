const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function reset() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const newPassword = 'password123';
  const hash = await bcrypt.hash(newPassword, 10);
  
  const [result] = await c.execute(
    "UPDATE utilisateurs SET mot_de_passe = ? WHERE email = 'liva@gmail.com'",
    [hash]
  );
  
  console.log('Mot de passe réinitialisé pour liva@gmail.com');
  console.log('Nouveau mot de passe: password123');
  console.log('Lignes modifiées:', result.affectedRows);

  // Verify it works
  const [users] = await c.execute("SELECT mot_de_passe FROM utilisateurs WHERE email = 'liva@gmail.com'");
  const valid = await bcrypt.compare('password123', users[0].mot_de_passe);
  console.log('Vérification:', valid ? 'OK - Le mot de passe fonctionne!' : 'ERREUR');

  await c.end();
}

reset().catch(err => console.error('ERREUR:', err));
