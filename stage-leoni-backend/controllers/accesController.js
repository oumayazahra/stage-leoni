const Badge = require('../models/badge');
const Historique = require('../models/historique');
const Autorisation = require('../models/autorisation');
const Salle = require('../models/salle');
const emailService = require('../utils/emailService');

// Cooldown de 5 minutes pour les alertes d'intrusion (dynamique, toutes salles)
const COOLDOWN_MS = 5 * 60 * 1000;
const lastIntrusionAlert = {}; // Clé = salleId, valeur = timestamp dernier envoi


exports.getHistorique = async (req, res) => {
  try {
    const { salleId } = req.query;
    const queryOptions = {
      order: [['date', 'DESC']]
    };
    if (salleId) {
      queryOptions.where = { salleId };
    }
    
    const historique = await Historique.findAll(queryOptions);
    res.json(historique);
  } catch (err) {
    console.error('Erreur getHistorique:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

exports.getDernierAcces = async (req, res) => {
  try {
    const dernier = await Historique.findOne({
      order: [['date', 'DESC']]
    });
    res.json(dernier);
  } catch (err) {
    console.error('Erreur getDernierAcces:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

const { Op } = require('sequelize');

exports.verifierBadge = async (req, res) => {
  try {
    const { badgeId, salleId } = req.body;
    if (!badgeId || !salleId) {
      return res.status(400).json({ error: 'badgeId et salleId requis' });
    }

    const cleanBadgeId = badgeId.trim().toUpperCase();

    // Vérifier si le badge est habilité pour cette salle
    let autorisation = await Autorisation.findOne({ where: { salleId, badgeId: cleanBadgeId } });
    let autorise = !!autorisation;

    // --- Logique "First-Boot Mode" ---
    // Si l'accès est refusé, on vérifie si on doit promouvoir ce badge comme le premier "vrai" manager
    if (!autorise) {
      const isKnownBadge = await Badge.findOne({ where: { badgeId: cleanBadgeId } });
      
      if (!isKnownBadge) {
        // Est-ce le tout premier badge physique inconnu qu'on scanne ? 
        // On vérifie s'il existe déjà un manager autre que le manager par défaut (A1B2C3)
        const countRealManagers = await Badge.count({
          where: {
            role: 'manager',
            badgeId: { [Op.ne]: 'A1B2C3' }
          }
        });

        if (countRealManagers === 0) {
          console.log(`[First-Boot] Premier badge physique détecté : ${cleanBadgeId}. Promotion en Manager !`);
          
          // 1. Créer le badge Manager
          await Badge.create({
            badgeId: cleanBadgeId,
            role: 'manager',
            salleAttribuee: null
          });

          // 2. Lui donner accès à TOUTES les salles
          const salles = await Salle.findAll();
          for (const s of salles) {
            await Autorisation.create({ salleId: s.id, badgeId: cleanBadgeId });
          }

          autorise = true; // On force l'accès puisqu'il vient de devenir manager universel
        }
      }
    }
    // --- Fin Logique First-Boot ---
    
    const nouvelAcces = await Historique.create({
      date: new Date(),
      badgeId: cleanBadgeId,
      salleId,
      statut: autorise ? 'autorisé' : 'refusé'
    });

    // Détection de suspicion d'intrusion (3 refus consécutifs)
    if (!autorise) {
      try {
        // Récupérer les 3 dernières tentatives d'accès de cette salle
        const lesDerniers = await Historique.findAll({
          where: { salleId },
          order: [['date', 'DESC']],
          limit: 3
        });
        
        const allRefused = lesDerniers.length === 3 && lesDerniers.every(h => h.statut === 'refusé');
        const now = Date.now();
        const lastAlertTime = lastIntrusionAlert[salleId] || 0;
        
        if (allRefused && (now - lastAlertTime > COOLDOWN_MS)) {
          lastIntrusionAlert[salleId] = now;
          
          const salle = await Salle.findOne({ where: { id: salleId } });
          const salleNom = salle ? salle.nom : salleId;
          
          emailService.sendEmail({
            subject: `🚨 ALERTE SECURITE : Suspicion d'intrusion dans la ${salleNom}`,
            html: `
              <div style="font-family: sans-serif; padding: 25px; border: 2px solid #dc2626; border-radius: 8px; background-color: #fef2f2;">
                <h2 style="color: #dc2626; margin-top: 0; display: flex; align-items: center;">
                  🔒 Alerte Sécurité - Tentatives d'Accès Suspectes
                </h2>
                <p>Le système de contrôle d'accès intelligent de <strong>LEONI Wiring Systems</strong> a détecté <strong>3 tentatives consécutives refusées</strong> pour la porte de la <strong>${salleNom}</strong>.</p>
                
                <div style="background-color: #fff; padding: 15px; border-radius: 6px; border: 1px solid #fee2e2; margin: 15px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #991b1b;">Historique des 3 dernières tentatives refusées :</h4>
                  <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    ${lesDerniers.map(h => {
                      const timeStr = new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return `<li>Badge presented: <strong style="font-family: monospace; font-size: 14px;">${h.badgeId}</strong> à <strong>${timeStr}</strong> (Refusé)</li>`;
                    }).join('')}
                  </ul>
                </div>
                
                <h3 style="color: #7f1d1d; margin-top: 20px;">Procédure de Sécurité Exigée :</h3>
                <ol style="margin-left: 20px; line-height: 1.6;">
                  <li>Vérifier visuellement l'accès physique de la salle <strong>${salleNom}</strong>.</li>
                  <li>Contacter immédiatement l'équipe de sécurité ou le poste de garde principal.</li>
                  <li>Consulter l'historique d'accès vidéo de la caméra IP orientée vers cette porte.</li>
                  <li>Rechercher l'ID de badge suspect dans le chatbot pour vérifier son propriétaire théorique.</li>
                </ol>
                <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 20px 0;" />
                <p style="font-size: 11px; color: #7f1d1d; margin-bottom: 0;">Centrale de Contrôle d'Accès LEONI - Message automatique.</p>
              </div>
            `
          });
        }
      } catch (errHist) {
        console.error('Erreur lors de la détection intrusion historique:', errHist);
      }
    }

    res.json({
      autorise,
      message: autorise ? 'Accès autorisé - Porte déverrouillée' : 'Accès refusé',
      statut: nouvelAcces.statut
    });
  } catch (err) {
    console.error('Erreur verifierBadge:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Obtenir la liste des badges autorisés pour une salle avec e-mails et rôles
exports.getBadgesAutorises = async (req, res) => {
  try {
    const { salleId } = req.query;
    if (!salleId) return res.status(400).json({ error: 'salleId requis' });
    
    const autorisations = await Autorisation.findAll({ where: { salleId } });
    const badgeIds = autorisations.map(a => a.badgeId);
    
    // Récupérer les informations complètes de chaque badge
    const badges = await Badge.findAll({
      where: { badgeId: badgeIds }
    });
    
    res.json(badges);
  } catch (err) {
    console.error('Erreur getBadgesAutorises:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Ajouter/supprimer badge (réservé au manager)
exports.ajouterBadge = async (req, res) => {
  try {
    const { salleId, badgeId, email, role } = req.body;
    if (!salleId || !badgeId) {
      return res.status(400).json({ error: 'salleId et badgeId requis' });
    }

    const cleanBadgeId = badgeId.trim().toUpperCase();

    // Vérifier si déjà autorisé pour cette salle
    const existe = await Autorisation.findOne({ where: { salleId, badgeId: cleanBadgeId } });
    if (!existe) {
      await Autorisation.create({ salleId, badgeId: cleanBadgeId });
    }
    
    // Rechercher si le badge existe dans le référentiel global
    const badge = await Badge.findOne({ where: { badgeId: cleanBadgeId } });
    if (!badge) {
      await Badge.create({
        badgeId: cleanBadgeId,
        role: role || 'support',
        salleAttribuee: role === 'manager' ? null : salleId,
        email: email ? email.trim() : null
      });
    } else {
      // Mettre à jour l'email et le rôle s'ils sont transmis
      await badge.update({
        email: email !== undefined ? (email ? email.trim() : null) : badge.email,
        role: role !== undefined ? role : badge.role,
        salleAttribuee: role === 'manager' ? null : (role === 'support' ? salleId : badge.salleAttribuee)
      });
    }

    res.json({ success: true, message: `Badge ${cleanBadgeId} configuré avec succès.` });
  } catch (err) {
    console.error('Erreur ajouterBadge:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

exports.supprimerBadge = async (req, res) => {
  try {
    const { salleId, badgeId } = req.body;
    if (!salleId || !badgeId) {
      return res.status(400).json({ error: 'salleId et badgeId requis' });
    }

    const count = await Autorisation.destroy({ where: { salleId, badgeId } });
    if (count > 0) {
      res.json({ success: true, message: `Badge ${badgeId} supprimé des accès pour la salle ${salleId}` });
    } else {
      res.status(444).json({ error: 'Autorisation introuvable pour ce badge dans cette salle' });
    }
  } catch (err) {
    console.error('Erreur supprimerBadge:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};