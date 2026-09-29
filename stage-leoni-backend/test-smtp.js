const http = require('http');

// Remplacez par l'adresse e-mail sur laquelle vous souhaitez recevoir l'e-mail de test
const testEmail = 'oumayazahra.mansour@isimg.tn'; 

const data = JSON.stringify({
  testEmail: testEmail
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/smtp/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log(`Envoi d'une requête de test SMTP vers http://localhost:5000/api/smtp/test pour l'adresse : ${testEmail}...`);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('\n=== Résultat du Test SMTP ===');
      if (res.statusCode === 200 && parsed.success) {
        console.log('✅ Succès :', parsed.message);
      } else {
        console.log('❌ Échec (Statut ' + res.statusCode + ') :', parsed.error || body);
      }
    } catch (e) {
      console.log('Réponse brute du serveur :', body);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur de connexion au serveur backend :', e.message);
});

req.write(data);
req.end();
