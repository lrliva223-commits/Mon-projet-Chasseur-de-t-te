const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;

    // Étape 1 : trouver tous les interlocuteurs
    const [rows] = await pool.execute(
      `SELECT 
         u.id,
         CASE WHEN u.role = 'entreprise' THEN COALESCE(e.nom, u.prenom) ELSE u.prenom END AS prenom,
         CASE WHEN u.role = 'entreprise' THEN '' ELSE u.nom END AS nom,
         u.role,
         (SELECT contenu FROM messages 
          WHERE (expediteur_id = u.id AND destinataire_id = ?) 
             OR (expediteur_id = ? AND destinataire_id = u.id) 
          ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
         (SELECT date_envoi FROM messages 
          WHERE (expediteur_id = u.id AND destinataire_id = ?) 
             OR (expediteur_id = ? AND destinataire_id = u.id) 
          ORDER BY date_envoi DESC LIMIT 1) AS date_envoi,
         (SELECT COUNT(*) FROM messages 
          WHERE destinataire_id = ? AND expediteur_id = u.id AND lu = 0) AS non_lu
       FROM utilisateurs u
       LEFT JOIN entreprises e ON e.utilisateur_id = u.id
       WHERE u.id != ? AND (
         u.id IN (SELECT expediteur_id FROM messages WHERE destinataire_id = ?)
         OR u.id IN (SELECT destinataire_id FROM messages WHERE expediteur_id = ?)
       )
       ORDER BY date_envoi DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );

    res.json({ conversations: rows });
  } catch (err) {
    console.error('Erreur conversations:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/conversation/:userId', async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;

    await pool.execute(
      'UPDATE messages SET lu = 1 WHERE destinataire_id = ? AND expediteur_id = ?',
      [userId, otherId]
    );

    const [messages] = await pool.execute(
      `SELECT id, expediteur_id, destinataire_id, contenu, lu, date_envoi
       FROM messages
       WHERE (expediteur_id = ? AND destinataire_id = ?) OR (expediteur_id = ? AND destinataire_id = ?)
       ORDER BY date_envoi ASC`,
      [userId, otherId, otherId, userId]
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const expediteur_id = req.user.id;
    const { destinataire_id, contenu } = req.body;

    if (!destinataire_id || !contenu?.trim()) {
      return res.status(400).json({ error: 'Destinataire et contenu requis.' });
    }

    const [users] = await pool.execute('SELECT id, role FROM utilisateurs WHERE id = ?', [destinataire_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Destinataire introuvable.' });
    }
    const destinataire_role = users[0].role;

    // Sécurité : Le candidat ne peut pas envoyer le premier message à une entreprise
    if (req.user.role === 'candidat' && (destinataire_role === 'entreprise' || destinataire_role === 'recruteur')) {
      const [firstMsg] = await pool.execute(
        `SELECT expediteur_id FROM messages 
         WHERE (expediteur_id = ? AND destinataire_id = ?) 
            OR (expediteur_id = ? AND destinataire_id = ?)
         ORDER BY date_envoi ASC LIMIT 1`,
        [expediteur_id, destinataire_id, destinataire_id, expediteur_id]
      );
      
      if (firstMsg.length === 0 || firstMsg[0].expediteur_id === expediteur_id) {
        return res.status(403).json({ error: "Seule l'entreprise ou le recruteur peut initier la conversation." });
      }
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO messages (id, expediteur_id, destinataire_id, contenu) VALUES (?, ?, ?, ?)',
      [id, expediteur_id, destinataire_id, contenu]
    );

    res.json({ message: 'Message envoyé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
