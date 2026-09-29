const http = require('http');

const data = JSON.stringify({
  query: 'Quel est le protocole en cas de surchauffe ?',
  salleId: 'salle_main',
  role: 'manager'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/chatbot/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('=== Réponse Gemini ===');
      console.log(parsed.reply || parsed.error || body);
    } catch (e) {
      console.log('Raw:', body);
    }
  });
});

req.on('error', (e) => console.error('Erreur:', e.message));
req.write(data);
req.end();
