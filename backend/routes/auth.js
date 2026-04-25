const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, mot_de_passe, role, prenom, nom, nom_entreprise, siret, logo_url } = req.body;

    if (!['candidat', 'entreprise', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Vérifier si email existe déjà
    const [existing] = await pool.execute('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Créer IDs UUID
    const userId = uuidv4();
    const profileId = uuidv4();

    // Insérer utilisateur
    await pool.execute(
      'INSERT INTO utilisateurs (id, nom, prenom, email, mot_de_passe, role, statut) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, nom || '', prenom || '', email, hashedPassword, role, 'actif']
    );

    // Insérer profil selon le rôle
    if (role === 'candidat') {
      await pool.execute(
        'INSERT INTO candidats (id, utilisateur_id) VALUES (?, ?)',
        [profileId, userId]
      );
    } else if (role === 'entreprise') {
      await pool.execute(
        'INSERT INTO entreprises (id, utilisateur_id, nom, logo_url, verifie) VALUES (?, ?, ?, ?, ?)',
        [profileId, userId, nom_entreprise || '', logo_url || null, 0]
      );
    }

    // Générer token
    const token = jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken: token,
      refreshToken: token,
      user: { id: userId, email, role, prenom, nom }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Trouver utilisateur
    const [users] = await pool.execute(
      'SELECT id, email, mot_de_passe, role, nom, prenom FROM utilisateurs WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const user = users[0];

    // Vérifier password
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Générer token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken: token,
      refreshToken: token,
      user: { id: user.id, email: user.email, role: user.role, prenom: user.prenom, nom: user.nom }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;