
const fs = require('fs');
const c = fs.readFileSync('app/components/games/VideoGamesSection.tsx', 'utf8');
const lines = c.split(/\r?\n/);
for (let i = 425; i < Math.min(lines.length, 480); i++) {
  console.log((i + 1) + ": " + lines[i]);
}

