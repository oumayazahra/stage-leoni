const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');

// Récupérer la liste des emails envoyés
router.get('/', (req, res) => {
  try {
    const list = emailService.getEmails();
    res.json(list);
  } catch (err) {
    console.error('Erreur GET /api/emails:', err);
    res.status(500).json({ error: 'Impossible de charger les e-mails.' });
  }
});

// Marquer un email comme lu
router.post('/read', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });
    const success = emailService.markAsRead(id);
    res.json({ success });
  } catch (err) {
    console.error('Erreur POST /api/emails/read:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer un email
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = emailService.deleteEmail(id);
    res.json({ success });
  } catch (err) {
    console.error('Erreur DELETE /api/emails:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
