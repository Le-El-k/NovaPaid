
const http = require('http');
const req = http.get('http://127.0.0.1:3000/cards', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('npvc-root:', body.includes('npvc-root'));
    console.log('npvc-empty:', body.includes('npvc-empty'));
    console.log('npvc-drawer:', body.includes('npvc-drawer'));
    console.log('VirtualCards:', body.includes('VirtualCards'));
    console.log('Mes cartes:', body.includes('Mes cartes'));
  });
});

