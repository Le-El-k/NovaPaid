import { getDatabase } from "../app/lib/db/database.ts";

const db = getDatabase();
const count = (sql) => Number(db.prepare(sql).get()?.count || 0);
const userCount = count("SELECT COUNT(*) AS count FROM users");
const adminCount = count("SELECT COUNT(*) AS count FROM admins");
const nonCustomerUsers = count("SELECT COUNT(*) AS count FROM users WHERE role <> 'customer'");
const emailOverlap = count("SELECT COUNT(*) AS count FROM users u JOIN admins a ON lower(u.email) = lower(a.email)");
const userSessionOwners = new Set(
  db.prepare("PRAGMA foreign_key_list(user_sessions)").all().map((row) => row.table)
);
const adminSessionOwners = new Set(
  db.prepare("PRAGMA foreign_key_list(admin_sessions)").all().map((row) => row.table)
);
const usersAreSeparated =
  nonCustomerUsers === 0 &&
  emailOverlap === 0 &&
  userSessionOwners.has("users") &&
  adminSessionOwners.has("admins");

console.log("Comptes utilisateurs: " + userCount);
console.log("Comptes administrateurs: " + adminCount);
console.log("Rôles admin présents dans users: " + nonCustomerUsers);
console.log("Adresses partagées entre les tables: " + emailOverlap);
console.log("Sessions reliées à la bonne table: " + usersAreSeparated);

if (!usersAreSeparated || adminCount === 0) {
  console.error("Échec: séparation des comptes et sessions incorrecte.");
  process.exitCode = 1;
} else {
  console.log("Séparation des comptes et des sessions validée.");
}
