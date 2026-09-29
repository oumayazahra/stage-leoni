const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true // ex: 'TNS', 'TNM', 'TN4'
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  localisation: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = Site;
