const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const { upload, uploadErrorHandler } = require('./middleware/upload');

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
// On pointe directement vers le dossier 'frontend' pour que http://localhost:5000/ serve les fichiers du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/offres', require('./routes/offres'));
app.use('/api/v1/entreprises', require('./routes/entreprises'));
app.use('/api/v1/candidatures', require('./routes/candidatures'));
app.use('/api/v1/candidats', require('./routes/candidats'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/messages', require('./routes/messages'));

// Route de test santé
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Chasseur de tête opérationnelle' });
});

// Gestion des erreurs 404 (doit être après les routes statiques et API)
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée.' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Site web disponible sur : http://localhost:${PORT}`);
  console.log(`📊 API backend disponible sur : http://localhost:${PORT}/api/v1`);
  console.log(`==================================================\n`);
});