require('dotenv').config();
const Groq = require('groq-sdk');
const Salle = require('../models/salle');
const Badge = require('../models/badge');
const Autorisation = require('../models/autorisation');
const Historique = require('../models/historique');
const emailService = require('../utils/emailService');
const fs = require('fs');
const path = require('path');

// ─── LECTURE DES LOGS RÉCENTS (Pour la "Conscience" de l'IA) ───────────────
const getRecentAlerts = () => {
  try {
    const EMAILS_PATH = path.join(__dirname, '../data/emails.json');
    let emails = [];
    
    if (fs.existsSync(EMAILS_PATH)) {
      emails = JSON.parse(fs.readFileSync(EMAILS_PATH, 'utf-8')).slice(0, 3);
    }
    
    return { emails };
  } catch (e) {
    return { emails: [] };
  }
};

// ─── BASE DE CONNAISSANCES LEONI IT MASTER (Prompt Système) ────────────────
const systemInstruction = `
Tu es l'Assistant IA Sécurité & Infrastructure de LEONI (Automotive Wiring Systems).
Ton rôle est d'assister les techniciens et managers IT sur le terrain, de répondre à leurs questions techniques, et de diagnostiquer des problèmes dans les Salles Serveurs.

# 1. CONTEXTE DE L'ENTREPRISE (LEONI)
LEONI est un leader mondial de la fabrication de câbles et systèmes de câblage pour l'industrie automobile. L'infrastructure IT doit être disponible 24/7 pour ne pas bloquer les chaînes de production.

# 2. ARCHITECTURE DES SALLES SERVEURS
- **Salle Main (Production Principale)** : Héberge l'ERP (SAP), les bases de données Oracle, le coeur de réseau (Backbone). Onduleur : APC Symmetra PX 96kW (45 min d'autonomie). Climatisation : CRAC Units A1 & A2 (Consigne : 21°C).
- **Salle Backup (Disaster Recovery / Secours)** : Héberge les sauvegardes Veeam et les réplications VMware. Onduleur : APC Smart-UPS 10kVA (30 min). Climatisation : B1 (Consigne : 22°C).

# 3. BASE DE CONNAISSANCES TECHNIQUE EXPERTE
Tu possèdes les connaissances d'un Ingénieur Système & Réseau Senior :
- **Cisco Nexus (Coeur de réseau / Backbone)** : Architecture vPC (Virtual PortChannel) pour la redondance. Les VLANs critiques : VLAN 10 (Serveurs), VLAN 20 (IoT/Capteurs), VLAN 30 (Administration). Procédure de dépannage : Vérifier les interfaces 'show int status', vérifier le spanning-tree 'show spanning-tree'.
- **Fortinet FortiGate (Pare-feu / Sécurité)** : Cluster en mode HA Actif/Passif. Filtrage des flux entre le réseau industriel (OT) et le réseau d'entreprise (IT). VPN IPsec pour les connexions inter-sites.
- **VMware vSphere** : Les serveurs physiques (HPE ProLiant) exécutent ESXi. Le vCenter gère la haute disponibilité (HA) et DRS. Si un serveur physique (hôte) tombe en panne, les VMs redémarrent automatiquement sur un autre hôte.
- **Active Directory (Microsoft)** : Gestion des identités. Synchronisation Azure AD Connect.

# 4. PROCEDURES D'URGENCE (CRITIQUE)
- **Surchauffe (> 28°C)** : Risque d'arrêt thermique. 1. Forcer la ventilation de secours. 2. Ouvrir les portes. 3. Vérifier les compresseurs externes. 
- **Humidité (> 70%)** : Risque de court-circuit. 1. Activer le déshumidificateur. 2. Chercher des fuites sous le faux-plancher.
- **Intrusion (Badge Inconnu)** : L'accès est refusé. Le système enregistre l'incident. Procédure : Vérifier la vidéosurveillance, bloquer l'accès.
- **Coupure Électrique** : Passage sur Onduleur (UPS). Si l'onduleur descend sous 15% de batterie, initier un "Graceful Shutdown" (arrêt propre) des VMs via le script VMware Tools.

# 5. TON COMPORTEMENT & TON STYLE
- Tu es un **bot vocal et textuel**. Tes réponses doivent être fluides à lire à voix haute. N'utilise pas trop d'emojis, de gras (**) ou de listes à puces trop longues si la réponse peut être conversationnelle.
- Réponds de manière précise, experte, mais compréhensible par un technicien de niveau intermédiaire.
- Si l'utilisateur te demande d'envoyer un email, dis-lui que le système peut le faire, et si sa phrase contient "envoie un email", l'application s'en chargera automatiquement.
`;

exports.queryChatbot = async (req, res) => {
  try {
    const { query, salleId, role, badgeId } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'La requête est vide.' });
    }

    const cleanQuery = query.toLowerCase().trim();
    const activeSalleId = salleId || 'salle_main';
    
    // ─── 1. RÉCUPÉRATION DU CONTEXTE TEMPS RÉEL ──────────────────────────────────
    const salles = await Salle.findAll();
    const activeSalle = salles.find(s => s.id === activeSalleId) || salles[0];
    const autreSalle = salles.find(s => s.id !== activeSalleId);
    
    // Historique des 5 derniers accès globaux
    const recentsAccès = await Historique.findAll({
      limit: 5,
      order: [['date', 'DESC']]
    });

    const { emails } = getRecentAlerts();

    // Construction du string de contexte dynamique
    let dynamicContext = `\n\n=== CONTEXTE EN TEMPS RÉEL (À utiliser pour tes réponses) ===\n`;
    dynamicContext += `- Salle Actuelle de l'utilisateur : ${activeSalle.nom} (Température: ${activeSalle.temperature}°C, Humidité: ${activeSalle.humidite}%).\n`;
    if (autreSalle) {
      dynamicContext += `- Autre Salle : ${autreSalle.nom} (Température: ${autreSalle.temperature}°C, Humidité: ${autreSalle.humidite}%).\n`;
    }
    
    dynamicContext += `\n- Les 5 derniers accès RFID :\n`;
    if (recentsAccès.length === 0) dynamicContext += "Aucun accès récent.\n";
    recentsAccès.forEach(h => {
      dynamicContext += `  * [${new Date(h.date).toLocaleString('fr-FR')}] Badge ${h.badgeId} -> ${h.salleId} : ${h.statut.toUpperCase()}\n`;
    });

    dynamicContext += `\n- Les 3 dernières alertes Email envoyées :\n`;
    if (emails.length === 0) dynamicContext += "Aucune alerte email récente.\n";
    emails.forEach(e => {
      dynamicContext += `  * [${new Date(e.date).toLocaleString('fr-FR')}] Sujet : ${e.subject}\n`;
    });
    dynamicContext += `=============================================================\n\n`;

    // ─── 2. ACTIONS AGENTIQUES AUTOMATIQUES (Email Alert) ───────────────────────
    let emailSentResult = null;
    const isEmailRequest = /(envoi|envoyer|envoie).*(email|mail|alerte)/i.test(cleanQuery);

    if (isEmailRequest) {
      const subject = "🚨 Alerte Manuelle (IA Assistant) - " + activeSalle.nom;
      const alertContent = `L'agent (Badge: ${badgeId || 'Inconnu'}, Rôle: ${role || 'Inconnu'}) a demandé à l'IA d'envoyer une alerte. Question originale : "${query}"`;
      
      emailSentResult = await emailService.sendEmail({
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #3b82f6; border-radius: 8px; background-color: #eff6ff;">
            <h2 style="color: #2563eb; margin-top: 0;">Assistant IA LEONI - Notification</h2>
            <p>${alertContent}</p>
            <hr style="border: 0; border-top: 1px solid #bfdbfe; margin: 15px 0;" />
            <p style="font-size: 12px; color: #1e3a8a;">Généré automatiquement par le module Voicebot.</p>
          </div>
        `
      });
    }

    // ─── 3. APPEL A L'API GROQ ────────────────────────────────────────────────────────
    if (process.env.GROQ_API_KEY) {
      try {
        console.log(`[Chatbot] Tentative avec l'API Groq (llama-3.3-70b-versatile)...`);
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const actionStatus = emailSentResult ? "Note: J'ai exécuté l'action d'envoyer un email avec succès. Mentionne-le à l'utilisateur." : "";
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction + dynamicContext },
            { role: "user", content: `Utilisateur (Rôle: ${role || 'Technicien'}) : ${query}\n${actionStatus}` }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
        });

        const botReply = chatCompletion.choices[0]?.message?.content;
        
        if (botReply && botReply.trim()) {
          console.log(`[Chatbot] ✅ Réponse Groq reçue avec succès.`);
          return res.json({ reply: botReply });
        }
      } catch (groqError) {
        console.error(`[Chatbot] ❌ Erreur Groq API:`, groqError.message);
      }
    } else {
      console.warn('[Chatbot] ⚠️ Pas de GROQ_API_KEY définie, mode fallback local.');
    }


    // ─── 4. FALLBACK LOCAL (Si pas d'internet ou pas de clé API) ────────────────
    let reply = '';
    if (emailSentResult) {
      reply = `J'ai bien envoyé l'email d'alerte à toute l'équipe IT (ID: ${emailSentResult.id}). Avez-vous besoin d'autre chose ?`;
      return res.json({ reply });
    }

    if (cleanQuery.includes('température') || cleanQuery.includes('chaud')) {
      reply = `La ${activeSalle.nom} est actuellement à ${activeSalle.temperature}°C. ${activeSalle.temperature > 28 ? 'Ceci est une alerte critique.' : 'Tout est normal.'}`;
    } else if (cleanQuery.includes('historique') || cleanQuery.includes('entré') || cleanQuery.includes('acces') || cleanQuery.includes('accès')) {
      reply = `Voici le dernier accès enregistré : ${recentsAccès[0] ? `Le badge ${recentsAccès[0].badgeId} a eu un accès ${recentsAccès[0].statut} le ${new Date(recentsAccès[0].date).toLocaleString('fr-FR')}` : 'Aucun accès récent'}.`;
    } else if (cleanQuery.includes('cisco') || cleanQuery.includes('réseau') || cleanQuery.includes('fortigate')) {
      reply = `L'infrastructure réseau LEONI repose sur un coeur de réseau Cisco Nexus (vPC) et un pare-feu Fortinet FortiGate en cluster Haute Disponibilité.`;
    } else {
      reply = `Je suis actuellement en mode de secours hors-ligne. Je peux vous donner la température (${activeSalle.temperature}°C), l'humidité (${activeSalle.humidite}%) ou le dernier historique d'accès. Pour une analyse poussée, veuillez vérifier la connexion à l'API Gemini.`;
    }

    res.json({ reply });
  } catch (err) {
    console.error('Erreur chatbotController:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// ─── STREAMING SSE (Server-Sent Events) ───────────────────────────────────────
// Endpoint : POST /api/chatbot/stream
// Protocole : text/event-stream — chaque événement SSE = un token de la réponse
exports.queryChatbotStream = async (req, res) => {
  // ── Headers SSE ──
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { query, salleId, role, badgeId } = req.body;
    if (!query) {
      sendEvent('error', { message: 'Requête vide.' });
      return res.end();
    }

    const cleanQuery = query.toLowerCase().trim();
    const activeSalleId = salleId || 'salle_main';

    // ════════════════════════════════════════════
    // PHASE 1 : THINKING — Analyse & Contexte Dynamique
    // ════════════════════════════════════════════
    sendEvent('thinking', { step: `📥 Réception de la question de l'utilisateur...` });
    await new Promise(r => setTimeout(r, 600));

    // Rendre l'étape d'analyse dynamique en fonction du texte de l'utilisateur
    const shortQuery = query.length > 40 ? query.substring(0, 40) + '...' : query;
    sendEvent('thinking', { step: `🔍 Analyse de la requête : "L'utilisateur demande des informations sur ${shortQuery}"` });
    await new Promise(r => setTimeout(r, 800));

    const salles = await Salle.findAll();
    const activeSalle = salles.find(s => s.id === activeSalleId) || salles[0];
    const autreSalle  = salles.find(s => s.id !== activeSalleId);
    
    // Détection de mots-clés internes
    const internalKeywords = ['salle', 'backup', 'main', 'température', 'chaud', 'badge', 'accès', 'réseau', 'cisco', 'fortigate', 'onduleur'];
    const isInternalQuery = internalKeywords.some(kw => cleanQuery.includes(kw));

    let searchTarget = '';
    let webResultsText = '';

    if (isInternalQuery) {
      if (cleanQuery.includes('backup')) searchTarget = 'la salle backup (Disaster Recovery)';
      else if (cleanQuery.includes('main')) searchTarget = 'la salle main (Production Principale)';
      else if (cleanQuery.includes('température') || cleanQuery.includes('chaud')) searchTarget = 'les capteurs de température';
      else if (cleanQuery.includes('badge') || cleanQuery.includes('accès')) searchTarget = 'les journaux d\'accès RFID';
      else searchTarget = 'l\'infrastructure LEONI';

      sendEvent('thinking', { step: `🌐 Recherche d'informations internes : ${searchTarget}...` });
      await new Promise(r => setTimeout(r, 900));
    } else {
      // VRAIE RECHERCHE WEB
      sendEvent('thinking', { step: `🌐 Recherche sur le Web : "${query}"...` });
      try {
        const google = require('googlethis');
        const response = await google.search(query, {
          page: 0, 
          safe: false, 
          additional_params: { hl: 'fr' }
        });
        
        if (response && response.results && response.results.length > 0) {
          const topResults = response.results.slice(0, 3);
          webResultsText = `\n\n=== RÉSULTATS WEB RÉCENTS ===\n`;
          topResults.forEach((r, idx) => {
            webResultsText += `[Source ${idx+1}] ${r.title}\nRésumé: ${r.description}\n`;
          });
          webResultsText += `=============================================================\n\n`;
          sendEvent('thinking', { step: `✅ Extraction de ${topResults.length} résultats depuis Google.` });
        } else {
          sendEvent('thinking', { step: `⚠️ Aucun résultat pertinent trouvé sur le Web.` });
        }
      } catch (err) {
        console.error("Erreur de recherche web:", err);
        sendEvent('thinking', { step: `⚠️ Recherche Web indisponible, utilisation des connaissances générales...` });
      }
    }

    sendEvent('thinking', { step: `🗄️ Extraction des données capteurs (Température: ${activeSalle.temperature}°C)` });
    await new Promise(r => setTimeout(r, 700));

    const recentsAccès = await Historique.findAll({ limit: 5, order: [['date', 'DESC']] });
    sendEvent('thinking', { step: `📋 Vérification des dernières alertes de sécurité...` });
    await new Promise(r => setTimeout(r, 750));

    const { emails } = getRecentAlerts();

    let dynamicContext = `\n\n=== CONTEXTE EN TEMPS RÉEL ===\n`;
    dynamicContext += `- Salle active : ${activeSalle.nom} (T°: ${activeSalle.temperature}°C, Humidité: ${activeSalle.humidite}%)\n`;
    if (autreSalle) dynamicContext += `- Autre salle : ${autreSalle.nom} (T°: ${autreSalle.temperature}°C, Humidité: ${autreSalle.humidite}%)\n`;
    dynamicContext += `- Derniers accès RFID :\n`;
    recentsAccès.forEach(h => {
      dynamicContext += `  * [${new Date(h.date).toLocaleString('fr-FR')}] Badge ${h.badgeId} → ${h.salleId} : ${h.statut.toUpperCase()}\n`;
    });
    dynamicContext += `=============================================================\n\n`;
    
    // Ajout des résultats web au contexte s'ils existent
    if (webResultsText) {
      dynamicContext += webResultsText;
      dynamicContext += `Note pour l'IA: Utilise ces RÉSULTATS WEB pour répondre à l'utilisateur s'ils sont pertinents.\n\n`;
    }

    sendEvent('thinking', { step: '🧩 Synthèse des informations et préparation de la réponse...' });
    await new Promise(r => setTimeout(r, 800));

    // ── Gestion email agentique ──
    let emailSentResult = null;
    const isEmailRequest = /(envoi|envoyer|envoie).*(email|mail|alerte)/i.test(cleanQuery);
    if (isEmailRequest) {
      sendEvent('thinking', { step: '📤 Action détectée : préparation de l\'envoi d\'une alerte email...' });
      await new Promise(r => setTimeout(r, 600));
      emailSentResult = await emailService.sendEmail({
        subject: `🚨 Alerte Manuelle (IA) - ${activeSalle.nom}`,
        html: `<div style="font-family:sans-serif;padding:20px"><h2>Assistant IA LEONI</h2><p>Badge: ${badgeId}, Rôle: ${role} — "${query}"</p></div>`
      });
      sendEvent('thinking', { step: '✅ Email d\'alerte envoyé avec succès à toute l\'équipe IT !' });
      await new Promise(r => setTimeout(r, 700));
    }

    sendEvent('thinking', { step: '🤖 Connexion à l\'Intelligence Artificielle Groq (Llama 3)...' });
    await new Promise(r => setTimeout(r, 900));

    sendEvent('thinking', { step: '⚡ Modèle prêt — démarrage du streaming de la réponse...' });
    await new Promise(r => setTimeout(r, 600));


    // ── Phase 2 : Stream Groq ──
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const actionStatus = emailSentResult
          ? "Note: J'ai exécuté l'envoi d'email avec succès. Mentionne-le."
          : '';

        const chatStream = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction + dynamicContext },
            { role: "user", content: `Utilisateur (Rôle: ${role || 'Technicien'}) : ${query}\n${actionStatus}` }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          stream: true,
        });

        let fullReply = '';
        sendEvent('stream_start', {});

        for await (const chunk of chatStream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            fullReply += token;
            sendEvent('chunk', { token });
          }
        }

        sendEvent('done', { fullReply });
        return res.end();

      } catch (groqError) {
        console.error('[Stream] Erreur Groq:', groqError.message);
        // Fallback si Groq échoue
      }
    }

    // ── Phase Fallback : stream local caractère par caractère ──
    let fallbackReply = '';
    if (emailSentResult) {
      fallbackReply = `J'ai bien envoyé l'email d'alerte à toute l'équipe IT (ID: ${emailSentResult.id}). Avez-vous besoin d'autre chose ?`;
    } else if (cleanQuery.includes('température') || cleanQuery.includes('chaud')) {
      fallbackReply = `La ${activeSalle.nom} est à ${activeSalle.temperature}°C. ${activeSalle.temperature > 28 ? '⚠️ Alerte critique !' : 'Tout est normal.'}`;
    } else {
      fallbackReply = `Je suis en mode hors-ligne. Température : ${activeSalle.temperature}°C, Humidité : ${activeSalle.humidite}%. Vérifiez la connexion à l'API Groq.`;
    }

    sendEvent('stream_start', {});
    for (const char of fallbackReply) {
      sendEvent('chunk', { token: char });
      await new Promise(r => setTimeout(r, 18));
    }
    sendEvent('done', { fullReply: fallbackReply });
    res.end();

  } catch (err) {
    console.error('Erreur queryChatbotStream:', err);
    sendEvent('error', { message: 'Erreur interne du serveur.' });
    res.end();
  }
};

