const express = require('express');
const router = express.Router();

// GET /offres - Liste des offres avec pagination et filtres
router.get('/', (req, res) => {
  res.json({ test: 'ok' });
});

module.exports = router;