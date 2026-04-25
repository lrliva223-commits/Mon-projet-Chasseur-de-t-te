#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration() {
  try {
    console.log('🚀 Exécution des migrations...');
    
    const migrationFile = path.join(__dirname, 'migrations', 'add_candidature_fields.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    // Split by semicolon to execute multiple statements
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Exécution: ${statement.trim().substring(0, 60)}...`);
        await pool.execute(statement);
      }
    }
    
    console.log('✅ Migrations appliquées avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err.message);
    process.exit(1);
  }
}

runMigration();
