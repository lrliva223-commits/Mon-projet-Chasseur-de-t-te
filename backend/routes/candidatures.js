const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const auth = require('../middleware/auth');

const { upload, uploadErrorHandler } = require('../middleware/upload');

const router = express.Router();

async function getCandidatId(userId) {
  const [rows] = await pool.execute('SELECT id FROM candidats WHERE utilisateur_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

async function getRecruteurId(userId) {
  const [rows] = await pool.execute('SELECT id FROM recruteurs WHERE utilisateur_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

async function getEntrepriseId(userId) {
  const [rows] = await pool.execute('SELECT id FROM entreprises WHERE utilisateur_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

// POST /candidatures - Postuler à une offre
router.post('/', auth, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'lm', maxCount: 1 },
  { name: 'demande', maxCount: 1 }
]), uploadErrorHandler, async (req, res) => {
  console.log('Requête POST /candidatures reçue de:', req.user.email, 'rôle:', req.user.role);
  try {
    const { offre_id } = req.body;
    const userId = req.user.id;

    // Vérifier que c'est un candidat
    if (req.user.role !== 'candidat') {
      return res.status(403).json({ error: 'Seuls les candidats peuvent postuler.' });
    }

    if (!offre_id) {
      return res.status(400).json({ error: 'offre_id est requis.' });
    }

    // req.files contient les fichiers uploadés par multer
    const cvFile = req.files['cv'] ? req.files['cv'][0] : null;
    const lmFile = req.files['lm'] ? req.files['lm'][0] : null;
    const demandeFile = req.files['demande'] ? req.files['demande'][0] : null;

    if (!cvFile) {
      return res.status(400).json({ error: 'Un CV en fichier est requis.' });
    }
    if (!lmFile) {
      return res.status(400).json({ error: 'Une lettre de motivation en fichier est requise.' });
    }

    const candidatId = await getCandidatId(userId);
    console.log('ID Candidat trouvé:', candidatId);
    if (!candidatId) {
      return res.status(404).json({ error: 'Profil candidat non trouvé.' });
    }

    const [offres] = await pool.execute('SELECT id FROM offres_emploi WHERE id = ?', [offre_id]);
    if (offres.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM candidatures WHERE offre_id = ? AND candidat_id = ?',
      [offre_id, candidatId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Vous avez déjà postulé à cette offre.' });
    }

    const candidatureId = uuidv4();
    const cv_url = `/uploads/cv/${cvFile.filename}`;
    const lm_url = `/uploads/lm/${lmFile.filename}`;
    const demande_url = demandeFile ? `/uploads/demande/${demandeFile.filename}` : null;
    
    await pool.execute(
      `INSERT INTO candidatures (id, candidat_id, offre_id, cv_url, lm_url, demande_url, statut) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidatureId, candidatId, offre_id, cv_url, lm_url, demande_url, 'envoyee']
    );

    res.json({ 
      message: 'Candidature envoyée avec succès.',
      candidature_id: candidatureId,
      cv_url,
      lm_url,
      demande_url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
});

// GET /candidatures/mes - Mes candidatures (candidat)
router.get('/mes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'candidat') {
      return res.status(403).json({ error: 'Accès réservé aux candidats.' });
    }

    const candidatId = await getCandidatId(req.user.id);
    if (!candidatId) {
      return res.status(404).json({ error: 'Profil candidat non trouvé.' });
    }

    const [candidatures] = await pool.execute(
      `SELECT c.id, c.statut, c.date_envoi,
              o.id as offre_id, o.titre as offre_titre, o.description, o.localisation, o.type_contrat,
              o.salaire_min, o.salaire_max,
              e.nom as entreprise_nom
       FROM candidatures c
       JOIN offres_emploi o ON c.offre_id = o.id
       LEFT JOIN entreprises e ON o.entreprise_id = e.id
       WHERE c.candidat_id = ?
       ORDER BY c.date_envoi DESC`,
      [candidatId]
    );

    res.json({ candidatures });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /candidatures/offre/:id - Candidatures pour une offre (recruteur/entreprise)
router.get('/offre/:id', auth, async (req, res) => {
  try {
    const offreId = req.params.id;
    const userId = req.user.id;

    const [offres] = await pool.execute('SELECT recruteur_id, entreprise_id FROM offres_emploi WHERE id = ?', [offreId]);
    if (!offres.length) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }
    const offer = offres[0];

    if (req.user.role === 'entreprise') {
      const entrepriseId = await getEntrepriseId(userId);
      if (!entrepriseId || entrepriseId !== offer.entreprise_id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
    } else {
      return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
    }

    const [candidatures] = await pool.execute(
      `SELECT c.id, c.statut, c.date_envoi, c.cv_url, c.lm_url, c.demande_url,
              u.id as candidat_id, u.prenom, u.nom, u.email,
              ca.titre_poste, ca.salaire_min
       FROM candidatures c
       JOIN candidats ca ON c.candidat_id = ca.id
       JOIN utilisateurs u ON ca.utilisateur_id = u.id
       WHERE c.offre_id = ?
       ORDER BY c.date_envoi DESC`,
      [offreId]
    );

    res.json({ candidatures });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /candidatures/:id/statut - Mettre à jour le statut d'une candidature
router.patch('/:id/statut', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const userId = req.user.id;

    if (!['envoyee', 'vue', 'shortlistee', 'entretien', 'refusee', 'acceptee'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const [rows] = await pool.execute(
      `SELECT c.id, o.recruteur_id, o.entreprise_id
       FROM candidatures c
       JOIN offres_emploi o ON o.id = c.offre_id
       WHERE c.id = ?`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Candidature non trouvée.' });
    }

    const application = rows[0];
    if (req.user.role === 'entreprise') {
      const entrepriseId = await getEntrepriseId(userId);
      if (!entrepriseId || entrepriseId !== application.entreprise_id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
    } else {
      return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
    }

    await pool.execute('UPDATE candidatures SET statut = ? WHERE id = ?', [statut, id]);
    res.json({ message: 'Statut mis à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /candidatures/entreprise - Toutes les candidatures de l'entreprise connectée
router.get('/entreprise', auth, async (req, res) => {
  try {
    if (req.user.role !== 'entreprise') {
      return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
    }

    const entrepriseId = await getEntrepriseId(req.user.id);
    if (!entrepriseId) {
      return res.status(404).json({ error: 'Profil entreprise non trouvé.' });
    }

    const [candidatures] = await pool.execute(
      `SELECT c.id, c.statut, c.date_envoi, c.cv_url, c.lm_url, c.demande_url,
              u.id as candidat_id, u.prenom, u.nom, u.email,
              ca.titre_poste, ca.salaire_min,
              o.id as offre_id, o.titre as offre_titre
       FROM candidatures c
       JOIN candidats ca ON c.candidat_id = ca.id
       JOIN utilisateurs u ON ca.utilisateur_id = u.id
       JOIN offres_emploi o ON c.offre_id = o.id
       WHERE o.entreprise_id = ?
       ORDER BY c.date_envoi DESC`,
      [entrepriseId]
    );

    res.json({ candidatures });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
