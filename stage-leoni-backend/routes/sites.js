const express = require('express');
const router = express.Router();
const sitesController = require('../controllers/sitesController');

// GET /api/sites
router.get('/', sitesController.getSites);

// GET /api/sites/:siteId/salles
router.get('/:siteId/salles', sitesController.getSallesParSite);

module.exports = router;
