const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Historique = sequelize.define('Historique', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  badgeId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  salleId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  statut: {
    type: DataTypes.STRING, // 'autorisé' ou 'refusé'
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'HistoriqueAcces'
});

module.exports = Historique;
