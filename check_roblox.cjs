
const fs = require('fs');
const lines = fs.readFileSync('app/components/games/VideoGamesSection.tsx', 'utf8').split('\n');
console.log(lines.slice(625, 650).map((l, i) => (626 + i) + ": " + l).join('\n'));

