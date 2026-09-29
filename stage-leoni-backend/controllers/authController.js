const Badge = require('../models/badge');

exports.loginWithBadge = async (req, res) => {
  try {
    const { badgeId } = req.body;
    if (!badgeId) {
      return res.status(400).json({ success: false, message: 'badgeId requis' });
    }
    
    const badge = await Badge.findOne({ where: { badgeId } });
    if (badge) {
      res.json({ success: true, role: badge.role, badgeId: badge.badgeId, salleAttribuee: badge.salleAttribuee });
    } else {
      res.status(401).json({ success: false, message: 'Badge non reconnu' });
    }
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
};