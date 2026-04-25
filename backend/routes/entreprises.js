const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /entreprises/populaires - Liste publique des entreprises avec nombre d'offres actives
router.get('/populaires', async (req, res) => {
  try {
    const [entreprises] = await pool.execute(
      `SELECT
         e.id,
         e.nom,
         e.secteur,
         e.logo_url,
         COUNT(o.id) AS offres_disponibles
       FROM entreprises e
       LEFT JOIN offres_emploi o ON o.entreprise_id = e.id AND o.statut = 'active'
       GROUP BY e.id, e.nom, e.secteur, e.logo_url
       ORDER BY offres_disponibles DESC, e.nom
       LIMIT 8`
    );
    res.json({ entreprises });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /entreprises/:id - Détails d'une entreprise
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [entreprises] = await pool.execute(
      'SELECT id, nom, secteur, adresse, taille, logo_url FROM entreprises WHERE id = ?',
      [id]
    );
    
    if (entreprises.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée.' });
    }
    
    res.json(entreprises[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
