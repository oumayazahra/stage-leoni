const express = require('express');
const router = express.Router();
const accesController = require('../controllers/accesController');

router.get('/', accesController.getHistorique);
router.get('/dernier', accesController.getDernierAcces);
router.get('/badges', accesController.getBadgesAutorises);
router.post('/verifier', accesController.verifierBadge);
router.post('/ajouter-badge', accesController.ajouterBadge);
router.post('/supprimer-badge', accesController.supprimerBadge);

module.exports = router;