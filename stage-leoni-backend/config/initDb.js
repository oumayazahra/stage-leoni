const sequelize = require('./database');
const Site = require('../models/site');
const Salle = require('../models/salle');
const Badge = require('../models/badge');
const Autorisation = require('../models/autorisation');
const Historique = require('../models/historique');
const Mesure = require('../models/mesure');

async function initDb() {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ SQLite - Tables synchronisées (avec architecture Multi-Site).');

    // Vérifier si la base est vide pour insérer les données par défaut
    const siteCount = await Site.count();
    
    if (siteCount === 0) {
      console.log('🌱 SQLite - Base de données vide. Insertion des données initiales (Multi-Site)...');

      // ─────────────────────────────────────────────────────────
      // 1. Insertion des 4 Sites LEONI Tunisie (codes officiels)
      // ─────────────────────────────────────────────────────────
      await Site.bulkCreate([
        { id: 'TNS', nom: 'LEONI Sidi Bou Ali',          localisation: 'Sidi Bou Ali, Sousse'     },
        { id: 'LTN', nom: 'LEONI Messadine (LTN 1-4)',   localisation: 'Messadine, M\'saken, Sousse' },
        { id: 'TNM', nom: 'LEONI Mateur',                 localisation: 'Mateur Nord / Sud, Bizerte' },
        { id: 'TN4', nom: 'LEONI Menzel Hayet',           localisation: 'Menzel Hayet, Monastir'   }
      ]);

      // ─────────────────────────────────────────────────────────
      // 2. Insertion des Salles Serveurs par site
      // ─────────────────────────────────────────────────────────
      await Salle.bulkCreate([
        // — TNS : Sidi Bou Ali (site stage — données réelles) —
        { id: 'salle_main',   nom: 'Salle Main',   temperature: 22.5, humidite: 55, siteId: 'TNS' },
        { id: 'salle_backup', nom: 'Salle Backup',  temperature: 23.0, humidite: 52, siteId: 'TNS' },

        // — LTN : Messadine, Siège Social (LTN 1-4) —
        { id: 'salle_ltn_datacenter',nom: 'DataCenter LTN (Bât. LTN1)',temperature: 20.0, humidite: 48, siteId: 'LTN' },
        { id: 'salle_ltn_reseau',    nom: 'Salle Réseau & Infra',      temperature: 21.5, humidite: 50, siteId: 'LTN' },
        { id: 'salle_ltn_sauvegarde',nom: 'Salle Sauvegarde LTN3',     temperature: 22.0, humidite: 53, siteId: 'LTN' },

        // — TNM : Mateur (Nord + Sud) —
        { id: 'salle_tnm_nord',      nom: 'Salle Serveur Mateur Nord', temperature: 21.0, humidite: 45, siteId: 'TNM' },
        { id: 'salle_tnm_sud',       nom: 'Salle Serveur Mateur Sud',  temperature: 22.0, humidite: 47, siteId: 'TNM' },

        // — TN4 : Menzel Hayet —
        { id: 'salle_tn4_principale',nom: 'Salle Réseau Principale',   temperature: 24.0, humidite: 60, siteId: 'TN4' }
      ]);

      // ─────────────────────────────────────────────────────────
      // 3. Badges : Manager global + Support par site
      // ─────────────────────────────────────────────────────────
      await Badge.bulkCreate([
        // Manager IT — accès tous sites
        { badgeId: 'A1B2C3',  role: 'manager', salleAttribuee: null,                 email: 'manager.it.leoni@yopmail.com'   },
        // Support TNS (Sidi Bou Ali)
        { badgeId: 'D4E5F6',  role: 'support', salleAttribuee: 'salle_main',         email: 'support.tns.main@yopmail.com'   },
        { badgeId: '789XYZ',  role: 'support', salleAttribuee: 'salle_backup',       email: 'support.tns.backup@yopmail.com' },
        // Support LTN (Messadine)
        { badgeId: 'SUPLTN1', role: 'support', salleAttribuee: 'salle_ltn_datacenter',email: 'support.ltn.dc@yopmail.com'    },
        { badgeId: 'SUPLTN2', role: 'support', salleAttribuee: 'salle_ltn_reseau',   email: 'support.ltn.net@yopmail.com'    },
        // Support TNM (Mateur)
        { badgeId: 'SUPTNM',  role: 'support', salleAttribuee: 'salle_tnm_nord',     email: 'support.tnm.nord@yopmail.com'   },
        { badgeId: 'SUPTNM2', role: 'support', salleAttribuee: 'salle_tnm_sud',      email: 'support.tnm.sud@yopmail.com'    },
        // Support TN4 (Menzel Hayet)
        { badgeId: 'SUPTN4',  role: 'support', salleAttribuee: 'salle_tn4_principale',email: 'support.tn4@yopmail.com'       }
      ]);

      // ─────────────────────────────────────────────────────────
      // 4. Autorisations — Manager accède à toutes les salles
      // ─────────────────────────────────────────────────────────
      const toutesLesSalles = await Salle.findAll();
      const autorisationsManager = toutesLesSalles.map(s => ({ salleId: s.id, badgeId: 'A1B2C3' }));

      const autorisationsSupport = [
        { salleId: 'salle_main',           badgeId: 'D4E5F6'  },
        { salleId: 'salle_backup',         badgeId: '789XYZ'  },
        { salleId: 'salle_ltn_datacenter', badgeId: 'SUPLTN1' },
        { salleId: 'salle_ltn_reseau',     badgeId: 'SUPLTN2' },
        { salleId: 'salle_tnm_nord',       badgeId: 'SUPTNM'  },
        { salleId: 'salle_tnm_sud',        badgeId: 'SUPTNM2' },
        { salleId: 'salle_tn4_principale', badgeId: 'SUPTN4'  }
      ];

      await Autorisation.bulkCreate([...autorisationsManager, ...autorisationsSupport]);

      // ─────────────────────────────────────────────────────────
      // 5. Historique d'accès d'exemple (TNS — site principal)
      // ─────────────────────────────────────────────────────────
      await Historique.bulkCreate([
        { date: new Date('2026-06-16T20:00:00.000Z'), badgeId: 'A1B2C3',  salleId: 'salle_main',          statut: 'autorisé' },
        { date: new Date('2026-06-16T20:05:00.000Z'), badgeId: 'UNKNOWN', salleId: 'salle_backup',        statut: 'refusé'   },
        { date: new Date('2026-06-17T08:30:00.000Z'), badgeId: 'SUPLTN1', salleId: 'salle_ltn_datacenter',statut: 'autorisé' },
        { date: new Date('2026-06-17T09:00:00.000Z'), badgeId: 'SUPTNM',  salleId: 'salle_tnm_nord',      statut: 'autorisé' }
      ]);

      console.log('🌱 SQLite - Données de test insérées.');
    } else {
      const managerBadge = await Badge.findOne({ where: { badgeId: 'A1B2C3' } });
      if (managerBadge && !managerBadge.email) {
        await Badge.update({ email: 'manager.it.leoni@yopmail.com' }, { where: { badgeId: 'A1B2C3' } });
        await Badge.update({ email: 'support.sallea@yopmail.com' }, { where: { badgeId: 'D4E5F6' } });
        await Badge.update({ email: 'support.salleb@yopmail.com' }, { where: { badgeId: '789XYZ' } });
        console.log('🌱 SQLite - E-mails mis à jour.');
      }
    }
  } catch (error) {
    console.error('❌ SQLite - Erreur d\'initialisation :', error);
  }
}

module.exports = initDb;
