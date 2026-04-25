const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { upload, uploadErrorHandler } = require('../middleware/upload');

const router = express.Router();

async function getCandidatId(userId) {
  const [rows] = await pool.execute('SELECT id FROM candidats WHERE utilisateur_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

router.get('/profil', auth, async (req, res) => {
  try {
    if (req.user.role !== 'candidat') {
      return res.status(403).json({ error: 'Accès réservé aux candidats.' });
    }

    const candidatId = await getCandidatId(req.user.id);
    if (!candidatId) {
      return res.status(404).json({ error: 'Profil candidat non trouvé.' });
    }

    const [rows] = await pool.execute(
      `SELECT c.titre_poste, c.resume, c.disponibilite, c.salaire_min, c.cv_url, c.avatar_url,
              u.nom, u.prenom, u.email
       FROM candidats c
       JOIN utilisateurs u ON c.utilisateur_id = u.id
       WHERE c.id = ?`,
      [candidatId]
    );

    res.json({ profil: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/profil', auth, async (req, res) => {
  try {
    if (req.user.role !== 'candidat') {
      return res.status(403).json({ error: 'Accès réservé aux candidats.' });
    }

    const candidatId = await getCandidatId(req.user.id);
    if (!candidatId) {
      return res.status(404).json({ error: 'Profil candidat non trouvé.' });
    }

    const { titre_poste, resume, disponibilite, salaire_min } = req.body;
    await pool.execute(
      `UPDATE candidats SET titre_poste = ?, resume = ?, disponibilite = ?, salaire_min = ? WHERE id = ?`,
      [titre_poste || null, resume || null, disponibilite || null, salaire_min ? parseInt(salaire_min) : null, candidatId]
    );

    const [rows] = await pool.execute('SELECT titre_poste, resume, disponibilite, salaire_min, cv_url FROM candidats WHERE id = ?', [candidatId]);
    res.json({ message: 'Profil mis à jour avec succès.', profil: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/upload-cv', auth, upload.single('cv'), uploadErrorHandler, async (req, res) => {
  try {
    if (req.user.role !== 'candidat') return res.status(403).json({ error: 'Accès réservé.' });
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant.' });
    const candidatId = await getCandidatId(req.user.id);
    const cvUrl = `/uploads/cv/${req.file.filename}`;
    await pool.execute('UPDATE candidats SET cv_url = ? WHERE id = ?', [cvUrl, candidatId]);
    res.json({ message: 'CV téléchargé.', cv_url: cvUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload-avatar', auth, upload.single('avatar'), uploadErrorHandler, async (req, res) => {
  try {
    if (req.user.role !== 'candidat') return res.status(403).json({ error: 'Accès réservé.' });
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant.' });
    const candidatId = await getCandidatId(req.user.id);
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.execute('UPDATE candidats SET avatar_url = ? WHERE id = ?', [avatarUrl, candidatId]);
    res.json({ message: 'Photo mise à jour.', avatar_url: avatarUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
