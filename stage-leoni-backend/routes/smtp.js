const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');

/**
 * GET /api/smtp/config
 * Récupère la config SMTP actuelle (sans le mot de passe)
 */
router.get('/config', (req, res) => {
  try {
    const config = emailService.getSmtpConfig();
    // Ne pas exposer le mot de passe en clair
    res.json({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      fromName: config.fromName,
      enabled: config.enabled,
      hasPassword: !!config.pass
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lecture configuration SMTP.' });
  }
});

/**
 * POST /api/smtp/config
 * Sauvegarde la configuration SMTP (réservé au manager)
 */
router.post('/config', (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName } = req.body;
    
    if (!host || !user) {
      return res.status(400).json({ error: 'host et user (email expéditeur) sont obligatoires.' });
    }

    const result = emailService.saveSmtpConfig({ host, port, secure, user, pass, fromName });
    
    if (result.success) {
      res.json({ success: true, message: 'Configuration SMTP sauvegardée avec succès.' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error('Erreur POST /api/smtp/config:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde SMTP.' });
  }
});

/**
 * POST /api/smtp/test
 * Teste la connexion SMTP et envoie un email de confirmation
 */
router.post('/test', async (req, res) => {
  try {
    const { testEmail } = req.body;
    const result = await emailService.testSmtpConnection(testEmail);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error('Erreur POST /api/smtp/test:', err);
    res.status(500).json({ error: 'Erreur lors du test SMTP.' });
  }
});

module.exports = router;
