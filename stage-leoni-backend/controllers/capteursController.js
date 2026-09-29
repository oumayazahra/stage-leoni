const Salle = require('../models/salle');
const Mesure = require('../models/mesure');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');

// Stocker le timestamp des dernières alertes envoyées pour éviter le spam (cooldown de 5 minutes)
const COOLDOWN_MS = 5 * 60 * 1000;
const lastAlerts = {
  salle_main: { temp: 0, hum: 0 },
  salle_backup: { temp: 0, hum: 0 }
};

exports.getCapteurs = async (req, res) => {
  try {
    const { salleId } = req.query;
    if (!salleId) return res.status(400).json({ error: 'salleId requis' });
    
    const salle = await Salle.findOne({ where: { id: salleId } });
    if (!salle) return res.status(404).json({ error: 'Salle inconnue' });
    
    // Simuler une variation douce pour le prototype en cours de consultation
    const nouvelleTemp = parseFloat((salle.temperature + (Math.random() - 0.5) * 0.4).toFixed(1));
    const nouvelleHum = Math.max(10, Math.min(100, Math.round(salle.humidite + (Math.random() - 0.5) * 1.5)));
    
    await salle.update({
      temperature: nouvelleTemp,
      humidite: nouvelleHum
    });

    // Stocker la mesure dans l'historique
    await Mesure.create({
      salleId: salle.id,
      temperature: nouvelleTemp,
      humidite: nouvelleHum
    });
    nettoyerAnciennesMesures(salle.id);

    // Déclencher les alertes automatiques même en mode simulation de navigation
    verifierEtDéclencherAlertes(salle.id, salle.nom, nouvelleTemp, nouvelleHum);
    
    res.json({
      salleId: salle.id,
      nom: salle.nom,
      temperature: nouvelleTemp,
      humidite: nouvelleHum
    });
  } catch (err) {
    console.error('Erreur getCapteurs:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Route appelée par l'ESP32 pour envoyer les vraies mesures
exports.updateCapteurs = async (req, res) => {
  try {
    const { salleId, temperature, humidite } = req.body;
    if (!salleId || temperature === undefined || humidite === undefined) {
      return res.status(400).json({ error: 'salleId, temperature et humidite requis' });
    }
    
    const salle = await Salle.findOne({ where: { id: salleId } });
    if (!salle) return res.status(404).json({ error: 'Salle inconnue' });
    
    const nouvelleTemp = parseFloat(parseFloat(temperature).toFixed(1));
    const nouvelleHum = Math.round(humidite);

    await salle.update({
      temperature: nouvelleTemp,
      humidite: nouvelleHum
    });

    // Stocker la mesure dans l'historique
    await Mesure.create({
      salleId: salle.id,
      temperature: nouvelleTemp,
      humidite: nouvelleHum
    });
    nettoyerAnciennesMesures(salle.id);

    // Déclencher les alertes automatiques
    verifierEtDéclencherAlertes(salleId, salle.nom, nouvelleTemp, nouvelleHum);
    
    res.json({
      success: true,
      message: 'Capteurs mis à jour par IoT',
      salle: {
        id: salle.id,
        nom: salle.nom,
        temperature: salle.temperature,
        humidite: salle.humidite
      }
    });
  } catch (err) {
    console.error('Erreur updateCapteurs:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction utilitaire pour envoyer les e-mails d'alerte en cas de surchauffe ou humidité extrême
function verifierEtDéclencherAlertes(salleId, salleNom, temp, hum) {
  const now = Date.now();
  const state = lastAlerts[salleId] || { temp: 0, hum: 0 };
  
  // 1. Alerte Surchauffe (> 28°C)
  if (temp > 28 && (now - state.temp > COOLDOWN_MS)) {
    state.temp = now;
    lastAlerts[salleId] = state;
    
    // Canal Email
    emailService.sendEmail({
      subject: `🚨 ALERTE CRITIQUE : Surchauffe détectée dans la ${salleNom}`,
      html: `
        <div style="font-family: sans-serif; padding: 25px; border: 2px solid #dc2626; border-radius: 8px; background-color: #fef2f2;">
          <h2 style="color: #dc2626; margin-top: 0; display: flex; align-items: center;">
            ⚠️ Température Surchauffe Critique (${temp}°C)
          </h2>
          <p>Le système de supervision IoT de <strong>LEONI Wiring Systems</strong> a détecté une température anormale dans la <strong>${salleNom}</strong>.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
            <tr style="background-color: #fee2e2;">
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left;">Mesure</th>
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left;">Valeur Actuelle</th>
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left;">Seuil Alerte</th>
            </tr>
            <tr>
              <td style="border: 1px solid #fca5a5; padding: 8px;">Température</td>
              <td style="border: 1px solid #fca5a5; padding: 8px; font-weight: bold; color: #b91c1c;">${temp} °C</td>
              <td style="border: 1px solid #fca5a5; padding: 8px;">28.0 °C</td>
            </tr>
            <tr>
              <td style="border: 1px solid #fca5a5; padding: 8px;">Humidité</td>
              <td style="border: 1px solid #fca5a5; padding: 8px;">${hum} %</td>
              <td style="border: 1px solid #fca5a5; padding: 8px;">70 %</td>
            </tr>
          </table>
          <h3 style="color: #7f1d1d;">Actions Requises Immédiates :</h3>
          <ol style="margin-left: 20px; line-height: 1.6;">
            <li>Vérifier le disjoncteur et l'état des climatiseurs de précision de la salle.</li>
            <li>Ouvrir les portes d'accès pour libérer la chaleur accumulée si nécessaire.</li>
            <li>Enclencher les ventilateurs de secours.</li>
            <li>Aviser le support infrastructures immobilières au plus vite.</li>
          </ol>
          <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 20px 0;" />
          <p style="font-size: 11px; color: #7f1d1d; margin-bottom: 0;">Superviseur Automatique LEONI Control Center - Ne pas répondre à ce message.</p>
        </div>
      `
    });
  }

  // 2. Alerte Humidité (> 70%)
  if (hum > 70 && (now - state.hum > COOLDOWN_MS)) {
    state.hum = now;
    lastAlerts[salleId] = state;
    
    // Canal Email
    emailService.sendEmail({
      subject: `🚨 ALERTE CRITIQUE : Humidité élevée détectée dans la ${salleNom}`,
      html: `
        <div style="font-family: sans-serif; padding: 25px; border: 2px solid #3b82f6; border-radius: 8px; background-color: #eff6ff;">
          <h2 style="color: #1e3a8a; margin-top: 0;">💧 Risque de Condensation / Humidité (${hum}%)</h2>
          <p>Le capteur d'ambiance DHT22 de la <strong>${salleNom}</strong> a relevé un taux d'humidité supérieur aux limites tolérées pour l'électronique de la salle serveur.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
            <tr style="background-color: #dbeafe;">
              <th style="border: 1px solid #bfdbfe; padding: 8px; text-align: left;">Mesure</th>
              <th style="border: 1px solid #bfdbfe; padding: 8px; text-align: left;">Valeur Actuelle</th>
              <th style="border: 1px solid #bfdbfe; padding: 8px; text-align: left;">Seuil Alerte</th>
            </tr>
            <tr>
              <td style="border: 1px solid #bfdbfe; padding: 8px;">Humidité</td>
              <td style="border: 1px solid #bfdbfe; padding: 8px; font-weight: bold; color: #1d4ed8;">${hum} %</td>
              <td style="border: 1px solid #bfdbfe; padding: 8px;">70 %</td>
            </tr>
            <tr>
              <td style="border: 1px solid #bfdbfe; padding: 8px;">Température</td>
              <td style="border: 1px solid #bfdbfe; padding: 8px;">${temp} °C</td>
              <td style="border: 1px solid #bfdbfe; padding: 8px;">-</td>
            </tr>
          </table>
          <h3 style="color: #1e3a8a;">Actions Requises Immédiates :</h3>
          <ol style="margin-left: 20px; line-height: 1.6;">
            <li>Inspecter la salle serveur à la recherche de fuites d'eau ou de condensats.</li>
            <li>Démarrer les déshumidificateurs d'air portables.</li>
            <li>Aviser l'équipe de maintenance technique.</li>
          </ol>
          <hr style="border: 0; border-top: 1px solid #bfdbfe; margin: 20px 0;" />
          <p style="font-size: 11px; color: #1e3a8a; margin-bottom: 0;">Superviseur Automatique LEONI Control Center - Ne pas répondre à ce message.</p>
        </div>
      `
    });

  }
}

// ─── RÉCUPÉRATION DE L'HISTORIQUE DES MESURES ──────────────────────────────
exports.getHistoriqueMesures = async (req, res) => {
  try {
    const { salleId } = req.query;
    if (!salleId) return res.status(400).json({ error: 'salleId requis' });
    
    const limit = parseInt(req.query.limit || '30');
    
    // Si aucun historique n'existe pour cette salle, on peut insérer la valeur actuelle comme point initial
    const count = await Mesure.count({ where: { salleId } });
    if (count === 0) {
      const salle = await Salle.findOne({ where: { id: salleId } });
      if (salle) {
        await Mesure.create({
          salleId,
          temperature: salle.temperature,
          humidite: salle.humidite
        });
      }
    }

    const mesures = await Mesure.findAll({
      where: { salleId },
      order: [['date', 'DESC']],
      limit: limit
    });
    
    res.json(mesures.reverse()); // Renvoyer l'historique du plus ancien au plus récent
  } catch (err) {
    console.error('Erreur getHistoriqueMesures:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// ─── NETTOYAGE DES ANCIENNES MESURES (Pour éviter le gonflement de SQLite) ───
async function nettoyerAnciennesMesures(salleId) {
  try {
    const count = await Mesure.count({ where: { salleId } });
    if (count > 100) {
      const threshold = await Mesure.findOne({
        where: { salleId },
        order: [['date', 'DESC']],
        offset: 99
      });
      if (threshold) {
        await Mesure.destroy({
          where: {
            salleId,
            date: { [Op.lt]: threshold.date }
          }
        });
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage anciennes mesures:', err);
  }
}