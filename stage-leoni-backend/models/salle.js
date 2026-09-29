const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Salle = sequelize.define('Salle', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 22.0
  },
  humidite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50
  },
  siteId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'TNS'
  }
}, {
  timestamps: false
});

module.exports = Salle;
