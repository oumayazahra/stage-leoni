const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Badge = sequelize.define('Badge', {
  badgeId: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'support' // 'manager' ou 'support'
  },
  salleAttribuee: {
    type: DataTypes.STRING,
    allowNull: true // Peut être null pour le rôle 'manager'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true // Email de l'agent pour recevoir les alertes
  }
}, {
  timestamps: false
});

module.exports = Badge;
