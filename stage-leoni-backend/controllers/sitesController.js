const Site = require('../models/site');
const Salle = require('../models/salle');

// GET /api/sites — Retourner tous les sites
exports.getSites = async (req, res) => {
  try {
    const sites = await Site.findAll({ order: [['id', 'ASC']] });
    res.json(sites);
  } catch (err) {
    console.error('Erreur getSites:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// GET /api/sites/:siteId/salles — Retourner les salles d'un site donné
exports.getSallesParSite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findByPk(siteId);
    if (!site) {
      return res.status(404).json({ error: `Site "${siteId}" introuvable.` });
    }
    const salles = await Salle.findAll({ where: { siteId }, order: [['id', 'ASC']] });
    res.json({ site, salles });
  } catch (err) {
    console.error('Erreur getSallesParSite:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};
