const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /offres - Créer une offre (entreprise uniquement)
router.post('/', auth, async (req, res) => {
  try {
    const {
      titre,
      description,
      localisation,
      type_contrat = 'CDI',
      salaire_min,
      salaire_max
    } = req.body;

    if (!titre || !description) {
      return res.status(400).json({ error: 'Titre et description requis.' });
    }

    const userId = req.user.id;
    let entrepriseId = null;

    if (req.user.role === 'entreprise') {
      const [rows] = await pool.execute('SELECT id FROM entreprises WHERE utilisateur_id = ?', [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Profil entreprise non trouvé.' });
      }
      entrepriseId = rows[0].id;
    } else {
      return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO offres_emploi (id, recruteur_id, entreprise_id, titre, description, localisation, type_contrat, salaire_min, salaire_max, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        null,
        entrepriseId,
        titre,
        description,
        localisation || null,
        type_contrat,
        salaire_min ? parseInt(salaire_min) : null,
        salaire_max ? parseInt(salaire_max) : null,
        'active'
      ]
    );

    res.status(201).json({
      message: 'Offre créée avec succès.',
      offre: {
        id,
        recruteur_id: null,
        entreprise_id: entrepriseId,
        titre,
        description,
        localisation,
        type_contrat,
        salaire_min: salaire_min ? parseInt(salaire_min) : null,
        salaire_max: salaire_max ? parseInt(salaire_max) : null,
        statut: 'active'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /offres - Liste des offres avec pagination et filtres
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      localisation,
      type_contrat,
      salaire_min,
      entreprise_id
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE o.statut = ?';
    const params = ['active'];

    if (search) {
      whereClause += ' AND (o.titre LIKE ? OR o.description LIKE ? OR e.nom LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (localisation) {
      whereClause += ' AND o.localisation LIKE ?';
      params.push(`%${localisation}%`);
    }

    if (type_contrat) {
      whereClause += ' AND o.type_contrat = ?';
      params.push(type_contrat);
    }

    if (salaire_min) {
      whereClause += ' AND o.salaire_min >= ?';
      params.push(parseInt(salaire_min, 10));
    }

    if (entreprise_id) {
      whereClause += ' AND o.entreprise_id = ?';
      params.push(entreprise_id);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM offres_emploi o
       LEFT JOIN entreprises e ON o.entreprise_id = e.id
       ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    const [offres] = await pool.execute(
      `SELECT
         o.id,
         o.titre,
         o.description,
         o.localisation,
         o.type_contrat,
         o.salaire_min,
         o.salaire_max,
         o.date_publication,
         o.entreprise_id,
         o.recruteur_id,
         e.nom as entreprise_nom,
         e.secteur as entreprise_secteur,
         CONCAT(ur.prenom, ' ', ur.nom) as recruteur_nom,
         ur.prenom as recruteur_prenom
       FROM offres_emploi o
       LEFT JOIN entreprises e ON o.entreprise_id = e.id
       LEFT JOIN recruteurs r ON o.recruteur_id = r.id
       LEFT JOIN utilisateurs ur ON r.utilisateur_id = ur.id
       ${whereClause}
       ORDER BY o.date_publication DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({
      offres,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Erreur dans GET /offres:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Erreur serveur.', details: err.message, stack: err.stack });
  }
});

// GET /offres/mes - Offres de l'entreprise connectée
router.get('/mes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let whereClause = '';
    let params = [];

    if (req.user.role === 'entreprise') {
      const [rows] = await pool.execute('SELECT id FROM entreprises WHERE utilisateur_id = ?', [userId]);
      if (!rows.length) return res.status(404).json({ error: 'Profil entreprise non trouvé.' });
      whereClause = 'o.entreprise_id = ?';
      params = [rows[0].id];
    } else {
      return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
    }

    const [offres] = await pool.execute(
      `SELECT
         o.id,
         o.titre,
         o.description,
         o.localisation,
         o.type_contrat,
         o.salaire_min,
         o.salaire_max,
         o.date_publication,
         o.statut,
         COUNT(c.id) as nb_candidatures
       FROM offres_emploi o
       LEFT JOIN candidatures c ON c.offre_id = o.id
       WHERE ${whereClause}
       GROUP BY o.id, o.titre, o.description, o.localisation, o.type_contrat, o.salaire_min, o.salaire_max, o.date_publication, o.statut
       ORDER BY o.date_publication DESC`,
      params
    );

    res.json({ offres });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /offres/:id - Supprimer une offre
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [offres] = await pool.execute('SELECT recruteur_id, entreprise_id FROM offres_emploi WHERE id = ?', [id]);
    if (!offres.length) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    const offer = offres[0];
    if (req.user.role === 'admin') {
      // Admin bypasses checks
    } else if (req.user.role === 'entreprise') {
      const [rows] = await pool.execute('SELECT id FROM entreprises WHERE utilisateur_id = ?', [userId]);
      if (!rows.length || rows[0].id !== offer.entreprise_id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
    } else {
      return res.status(403).json({ error: 'Accès réservé aux entreprises et administrateurs.' });
    }

    await pool.execute('DELETE FROM offres_emploi WHERE id = ?', [id]);
    res.json({ message: 'Offre supprimée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /offres/:id - Détails d'une offre
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [offres] = await pool.execute(
      `SELECT
        o.id,
        o.titre,
        o.description,
        o.localisation,
        o.type_contrat,
        o.salaire_min,
        o.salaire_max,
        o.date_publication,
        e.nom as entreprise_nom,
        e.secteur as entreprise_secteur,
        e.taille as entreprise_taille,
        CONCAT(ur.prenom, ' ', ur.nom) as recruteur_nom,
        r.specialite as recruteur_specialite,
        r.cabinet as recruteur_cabinet
       FROM offres_emploi o
       LEFT JOIN entreprises e ON o.entreprise_id = e.id
       LEFT JOIN recruteurs r ON o.recruteur_id = r.id
       LEFT JOIN utilisateurs ur ON r.utilisateur_id = ur.id
       WHERE o.id = ? AND o.statut = 'active'`,
      [id]
    );

    if (offres.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    res.json(offres[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
