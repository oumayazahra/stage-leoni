const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mesure = sequelize.define('Mesure', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  salleId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  humidite: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

module.exports = Mesure;
