const express = require('express');
const router = express.Router();
const capteursController = require('../controllers/capteursController');

router.get('/', capteursController.getCapteurs);
router.get('/historique', capteursController.getHistoriqueMesures);
router.post('/update', capteursController.updateCapteurs);

module.exports = router;