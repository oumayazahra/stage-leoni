const fs = require('fs');
const path = require('path');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

const EMAILS_FILE_PATH = path.join(__dirname, '../data/emails.json');
const SMTP_CONFIG_FILE = path.join(__dirname, '../data/smtp_config.json');

// Assurer l'existence des fichiers JSON
[EMAILS_FILE_PATH, SMTP_CONFIG_FILE].forEach(filePath => {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
});
if (!fs.existsSync(EMAILS_FILE_PATH)) {
  fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(SMTP_CONFIG_FILE)) {
  fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

/**
 * Lire la configuration SMTP active (fichier JSON > variables d'environnement)
 * Le manager peut override la config .env via l'interface
 */
function getSmtpConfig() {
  let fileConfig = {};
  try {
    const raw = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
    fileConfig = JSON.parse(raw || '{}');
  } catch (_) {}

  return {
    host: fileConfig.host || process.env.SMTP_HOST || '',
    port: parseInt(fileConfig.port || process.env.SMTP_PORT || '587'),
    secure: (fileConfig.secure !== undefined ? fileConfig.secure : process.env.SMTP_SECURE === 'true') || false,
    user: fileConfig.user || process.env.SMTP_USER || '',
    pass: fileConfig.pass || process.env.SMTP_PASS || '',
    fromName: fileConfig.fromName || 'LEONI Alerte Système',
    enabled: !!(fileConfig.user || process.env.SMTP_USER) && !!(fileConfig.pass || process.env.SMTP_PASS)
  };
}

/**
 * Sauvegarder la configuration SMTP depuis l'interface manager
 */
function saveSmtpConfig(config) {
  try {
    const existing = getSmtpConfig();
    const updated = {
      host: config.host || existing.host,
      port: config.port || existing.port,
      secure: config.secure !== undefined ? config.secure : existing.secure,
      user: config.user || existing.user,
      pass: config.pass || existing.pass,
      fromName: config.fromName || existing.fromName || 'LEONI Alerte Système'
    };
    fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    console.log('[Email Service] Configuration SMTP mise à jour.');
    return { success: true };
  } catch (err) {
    console.error('[Email Service] Erreur sauvegarde config SMTP:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Tester la connexion SMTP avec la configuration actuelle
 */
async function testSmtpConnection(testEmail) {
  const config = getSmtpConfig();
  if (!nodemailer) return { success: false, error: 'nodemailer non installé' };
  if (!config.user || !config.pass) return { success: false, error: 'SMTP non configuré (identifiants manquants)' };

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass }
    });

    await transporter.verify();

    // Envoyer un email de test
    const recipient = testEmail || config.user;
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: recipient,
      subject: '✅ LEONI SMTP — Test de connexion réussi',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px;">
          <h2 style="color: #15803d; margin-top: 0;">✅ Connexion SMTP Validée</h2>
          <p>Le serveur SMTP de <strong>LEONI Wiring Systems</strong> est correctement configuré.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
            <tr style="background-color: #dcfce7;">
              <th style="border: 1px solid #86efac; padding: 8px; text-align: left;">Paramètre</th>
              <th style="border: 1px solid #86efac; padding: 8px; text-align: left;">Valeur</th>
            </tr>
            <tr>
              <td style="border: 1px solid #86efac; padding: 8px;">Serveur SMTP</td>
              <td style="border: 1px solid #86efac; padding: 8px;">${config.host}:${config.port}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #86efac; padding: 8px;">Expéditeur</td>
              <td style="border: 1px solid #86efac; padding: 8px;">${config.user}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #86efac; padding: 8px;">Date du test</td>
              <td style="border: 1px solid #86efac; padding: 8px;">${new Date().toLocaleString('fr-FR')}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #4b5563;">Toutes les alertes critiques seront désormais envoyées à tous les agents enregistrés.</p>
        </div>
      `
    });

    console.log(`[Email Service] Test SMTP réussi ! Email de vérification envoyé à ${recipient}`);
    return { success: true, message: `Email de test envoyé à ${recipient}` };
  } catch (err) {
    console.error('[Email Service] Échec test SMTP:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Envoie un email d'alerte à tous les agents ET le manager.
 * Priorité : SMTP réel → simulation locale
 * Si `to` n'est pas spécifié, récupère TOUS les emails des badges en BDD.
 */
async function sendEmail({ to, subject, html, text }) {
  const Badge = require('../models/badge');

  let recipients = to;
  let recipientList = [];

  // Récupérer tous les emails des agents si aucun destinataire spécifié
  if (!recipients) {
    try {
      const allBadges = await Badge.findAll();
      recipientList = allBadges
        .map(b => b.email ? b.email.trim() : null)
        .filter(Boolean);
      
      if (recipientList.length > 0) {
        recipientList = [...new Set(recipientList)]; // Dédupliquer
        recipients = recipientList.join(', ');
      }
    } catch (errDb) {
      console.error('[Email Service] Impossible de récupérer les adresses e-mails des agents :', errDb);
    }
  } else {
    recipientList = [recipients];
  }

  if (!recipients) {
    recipients = process.env.ALERT_EMAIL || 'admin.it@leoni.com';
    recipientList = [recipients];
  }

  const date = new Date().toISOString();
  const id = 'mail_' + Math.random().toString(36).substr(2, 9);
  const emailRecord = {
    id,
    date,
    to: recipients,
    recipientCount: recipientList.length,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
    read: false,
    realSent: false,
    smtpError: null
  };

  // 1. Enregistrer dans la BDD locale (JSON)
  try {
    const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
    const emails = JSON.parse(fileData || '[]');
    emails.unshift(emailRecord);
    fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify(emails, null, 2), 'utf-8');
    console.log(`[Email Service] 📬 Email enregistré pour [${recipients}] (${recipientList.length} destinataire(s)) — ID: ${id}`);
  } catch (err) {
    console.error('[Email Service] Erreur enregistrement email local :', err);
  }

  // 2. Tentative d'envoi SMTP réel
  const smtpConfig = getSmtpConfig();

  if (nodemailer && smtpConfig.enabled) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000
      });

      // Envoyer à tous les destinataires individuellement pour garantir la livraison
      const sendPromises = recipientList.map(email =>
        transporter.sendMail({
          from: `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
          to: email,
          subject,
          text: text || html.replace(/<[^>]*>/g, ''),
          html
        })
      );

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      console.log(`[Email Service] ✅ SMTP Réel : ${successCount}/${recipientList.length} emails envoyés avec succès.`);
      if (failedCount > 0) {
        const errors = results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason?.message || 'Inconnu')
          .join('; ');
        console.warn(`[Email Service] ⚠️ SMTP : ${failedCount} envoi(s) échoué(s) : ${errors}`);
      }

      // Mettre à jour le statut dans le fichier
      try {
        const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
        const emails = JSON.parse(fileData || '[]');
        const idx = emails.findIndex(e => e.id === id);
        if (idx !== -1) {
          emails[idx].realSent = successCount > 0;
          emails[idx].sentCount = successCount;
          fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify(emails, null, 2), 'utf-8');
        }
      } catch (_) {}

      emailRecord.realSent = successCount > 0;
      return { success: true, id, realSent: successCount > 0, sentCount: successCount };

    } catch (err) {
      const errMsg = err.message || 'Erreur SMTP inconnue';
      console.error(`[Email Service] ❌ SMTP Échec: ${errMsg}`);

      // Mettre à jour le statut d'erreur dans le fichier
      try {
        const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
        const emails = JSON.parse(fileData || '[]');
        const idx = emails.findIndex(e => e.id === id);
        if (idx !== -1) {
          emails[idx].smtpError = errMsg;
          fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify(emails, null, 2), 'utf-8');
        }
      } catch (_) {}
    }
  } else if (!smtpConfig.enabled) {
    console.log('[Email Service] ℹ️ SMTP non configuré — simulation locale uniquement. Configurez SMTP dans ⚙️ Gestion des Badges.');
  }

  return { success: true, id, realSent: false };
}

/**
 * Récupère tous les emails enregistrés
 */
function getEmails() {
  try {
    const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
    return JSON.parse(fileData || '[]');
  } catch (err) {
    return [];
  }
}

/**
 * Marque un email comme lu
 */
function markAsRead(id) {
  try {
    const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
    const emails = JSON.parse(fileData || '[]');
    const idx = emails.findIndex(e => e.id === id);
    if (idx !== -1) {
      emails[idx].read = true;
      fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify(emails, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Supprime un email
 */
function deleteEmail(id) {
  try {
    const fileData = fs.readFileSync(EMAILS_FILE_PATH, 'utf-8');
    const emails = JSON.parse(fileData || '[]');
    fs.writeFileSync(EMAILS_FILE_PATH, JSON.stringify(emails.filter(e => e.id !== id), null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  sendEmail,
  getEmails,
  markAsRead,
  deleteEmail,
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection
};
