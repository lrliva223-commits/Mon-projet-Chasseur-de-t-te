const http = require('http');
const fs = require('fs');
const path = require('path');

async function testPostulation() {
  // 1. Login to get token
  const loginData = JSON.stringify({ email: 'liva@gmail.com', mot_de_passe: 'password123' });
  const token = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/v1/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body).accessToken));
    });
    req.write(loginData);
    req.end();
  });

  if (!token) { console.log('Login failed'); return; }
  console.log('Token obtained');

  // 2. Prepare FormData-like request
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const offre_id = '84204b2c-4012-4c83-b14f-586f97bd7304';
  
  // Create a dummy CV file content
  const cvContent = 'Fake CV content';
  const lmContent = 'Fake LM content';

  let body = `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="offre_id"\r\n\r\n${offre_id}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="cv"; filename="cv.pdf"\r\n`;
  body += `Content-Type: application/pdf\r\n\r\n${cvContent}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="lm"; filename="lm.pdf"\r\n`;
  body += `Content-Type: application/pdf\r\n\r\n${lmContent}\r\n`;
  body += `--${boundary}--\r\n`;

  const req = http.request({
    hostname: 'localhost', port: 5000, path: '/api/v1/candidatures',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let responseBody = '';
    res.on('data', chunk => responseBody += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', responseBody);
    });
  });

  req.write(body);
  req.end();
}

testPostulation();
