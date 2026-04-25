#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runAllMigrations() {
  try {
    console.log('🚀 Exécution de toutes les migrations...\n');
    
    const migrationDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      const filePath = path.join(migrationDir, file);
      console.log(`📄 Migration: ${file}`);
      
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      // Split by semicolon to execute multiple statements
      const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          console.log(`   → Exécution...`);
          await pool.execute(statement);
        } catch (err) {
          console.error(`   ✗ Erreur: ${err.message}`);
        }
      }
      console.log(`   ✅ Complétée\n`);
    }
    
    console.log('✅ Toutes les migrations ont été exécutées avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err.message);
    process.exit(1);
  }
}

runAllMigrations();
