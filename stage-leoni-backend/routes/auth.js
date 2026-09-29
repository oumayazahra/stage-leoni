const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login-badge', authController.loginWithBadge);

module.exports = router;