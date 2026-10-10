
const fs = require('fs');
const lines = fs.readFileSync('app/layout.tsx', 'utf8').split('\n');
[29, 58].forEach(ln => {
  console.log((ln) + ": " + lines[ln - 1]);
});

