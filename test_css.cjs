
const fs = require('fs');
const lines = fs.readFileSync('app/globals.css', 'utf8').split('\n');
console.log(lines.slice(8955, 9015).join('\n'));

