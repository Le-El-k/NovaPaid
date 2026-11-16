import { getDatabase } from "../app/lib/db/database.ts";

const db = getDatabase();
const legacyAdminRows = Number(
  db.prepare("SELECT COUNT(*) AS count FROM users WHERE role <> 'customer'").get()?.count || 0
);
const adminRows = Number(
  db.prepare("SELECT COUNT(*) AS count FROM admins").get()?.count || 0
);
const duplicateEmails = Number(
  db.prepare("SELECT COUNT(*) AS count FROM users u JOIN admins a ON lower(u.email) = lower(a.email)").get()?.count || 0
);

console.log("Comptes administrateurs séparés: " + adminRows);
console.log("Anciens comptes admin encore présents dans users: " + legacyAdminRows);
console.log("Adresses utilisées dans les deux tables: " + duplicateEmails);

if (legacyAdminRows || duplicateEmails) {
  console.error("Migration non effectuée: examen manuel requis pour préserver les comptes existants.");
  process.exitCode = 1;
} else {
  console.log("Aucune migration destructive nécessaire.");
}
