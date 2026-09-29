const express = require('express');
const cors = require('cors');
const initDb = require('./config/initDb');
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/capteurs', require('./routes/capteurs'));
app.use('/api/acces', require('./routes/acces'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/smtp', require('./routes/smtp'));
app.use('/api/sites', require('./routes/sites'));

// Initialiser la base de données SQLite AVANT de démarrer le serveur
(async () => {
  await initDb();
  app.listen(5000, () => console.log('✅ Backend opérationnel sur http://localhost:5000'));
})();
