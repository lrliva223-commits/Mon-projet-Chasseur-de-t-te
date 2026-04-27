const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { upload, uploadErrorHandler } = require('../middleware/upload');

const router = express.Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Récupérer les informations de l'utilisateur actuel
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nom, prenom, email, role, avatar_url, statut, created_at FROM utilisateurs WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * @route   POST /api/v1/users/upload-avatar
 * @desc    Télécharger une photo de profil (universel)
 * @access  Private
 */
router.post('/upload-avatar', auth, upload.single('avatar'), uploadErrorHandler, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier n\'a été envoyé.' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Mettre à jour dans la table principale utilisateurs
    await pool.execute(
      'UPDATE utilisateurs SET avatar_url = ? WHERE id = ?',
      [avatarUrl, req.user.id]
    );

    // Si c'est un candidat, on met aussi à jour la table candidats (pour la rétrocompatibilité)
    if (req.user.role === 'candidat') {
      await pool.execute(
        'UPDATE candidats SET avatar_url = ? WHERE utilisateur_id = ?',
        [avatarUrl, req.user.id]
      );
    }

    res.json({ 
      message: 'Photo de profil mise à jour avec succès.', 
      avatar_url: avatarUrl 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'avatar.' });
  }
});

module.exports = router;
