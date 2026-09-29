const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/leoni.sqlite'),
  logging: false // Désactive les logs SQL bruts pour garder la console propre
});

module.exports = sequelize;
