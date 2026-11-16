
import('./app/lib/db/database.ts').then(m => {
  const db = m.getDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  const settings = db.prepare('SELECT * FROM app_settings').all();
  console.log('Settings:', JSON.stringify(settings.slice(0, 5)));
}).catch(e => console.error(e.message));

