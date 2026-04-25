// Script de configuration initiale de la base de données
// Usage: node setup-db.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_NAME = process.env.DB_NAME || 'headhunter_db';

async function setupDatabase() {
  console.log('🔧 Configuration de la base de données...');
  console.log('📍 Tentative de connexion à:', process.env.DB_HOST || 'localhost', 'port', process.env.DB_PORT || 3306);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connecté à MySQL');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de données "${DB_NAME}" créée/vérifiée`);
    await connection.end();

    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log(`✅ Connecté à la base de données ${DB_NAME}`);

    const schemaPath = path.join(__dirname, '..', 'chasseur_tete_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    const cleanedSchema = schemaSQL
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--') && !trimmed.toUpperCase().startsWith('DELIMITER');
      })
      .join('\n');

    console.log('📝 Exécution du schéma de base de données (tables uniquement)...');
    try {
      await dbConnection.query(cleanedSchema);
      console.log('✅ Schéma de base de données appliqué avec succès');
    } catch (err) {
      console.log('❌ Erreur lors de l’exécution du schéma :', err.message);
      throw err;
    }

    console.log('👤 Création d\'un utilisateur de test candidat...');
    const testEmail = 'test@candidat.com';
    const testPassword = 'test123';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const testUserId = uuidv4();
    const testCandidatId = uuidv4();

    await dbConnection.execute(
      'INSERT IGNORE INTO utilisateurs (id, nom, prenom, email, mot_de_passe, role, statut) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testUserId, 'Jean', 'Dupont', testEmail, hashedPassword, 'candidat', 'actif']
    );

    const [users] = await dbConnection.execute('SELECT id FROM utilisateurs WHERE email = ?', [testEmail]);
    if (users.length > 0) {
      const activeUserId = users[0].id;
      await dbConnection.execute(
        'INSERT IGNORE INTO candidats (id, utilisateur_id) VALUES (?, ?)',
        [testCandidatId, activeUserId]
      );
      console.log(`✅ Utilisateur de test créé ou vérifié: ${testEmail} / ${testPassword}`);
    } else {
      console.log('⚠️ Impossible de vérifier l’utilisateur de test.');
    }

    await dbConnection.end();
    console.log('🎉 Configuration terminée !');
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:');
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

setupDatabase();
