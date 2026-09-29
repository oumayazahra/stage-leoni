const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

router.post('/query', chatbotController.queryChatbot);
router.post('/stream', chatbotController.queryChatbotStream);

module.exports = router;
