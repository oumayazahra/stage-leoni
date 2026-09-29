const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Autorisation = sequelize.define('Autorisation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  salleId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  badgeId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'Autorisations'
});

module.exports = Autorisation;
