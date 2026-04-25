const http = require('http');

// Test 1: Login
function testLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'liva@gmail.com', mot_de_passe: 'password123' });
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/v1/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('=== LOGIN TEST ===');
        console.log('Status:', res.statusCode);
        const result = JSON.parse(body);
        if (result.accessToken) {
          console.log('Login: SUCCESS');
          console.log('User:', JSON.stringify(result.user));
          resolve(result.accessToken);
        } else {
          console.log('Login: FAILED -', result.error);
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test 2: Get candidatures
function testAPI(token, path, label) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/v1' + path,
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(body);
          if (result.error) console.log('ERROR:', result.error);
          else console.log('OK:', JSON.stringify(result).substring(0, 300));
        } catch(e) { console.log('Body:', body.substring(0, 200)); }
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const token = await testLogin();
  if (!token) { console.log('\nImpossible de continuer sans token.'); return; }
  
  await testAPI(token, '/candidatures/mes', 'MES CANDIDATURES');
  await testAPI(token, '/candidats/profil', 'MON PROFIL');
  await testAPI(token, '/messages/conversations', 'MES CONVERSATIONS');
}

run().catch(err => console.error('ERREUR:', err));
