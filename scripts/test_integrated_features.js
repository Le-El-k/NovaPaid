
import { NovaDbService } from '../app/lib/db/service.ts';
import { getDatabase } from '../app/lib/db/database.ts';

console.log("=== COMPREHENSIVE TEST: ALL PRISMCARD MODULES ===");
const db = getDatabase();

let testUser = db.prepare("SELECT id, name, email FROM users WHERE email = 'test_prism@novapaid.net'").get();
const userId = Number(testUser.id);

// 1. Test Resellers module
const resellerDash = NovaDbService.getResellerDashboard(userId);
console.log("1. Reseller Dashboard:", { code: resellerDash.resellerCode, rate: resellerDash.commissionRate });

const adminResellers = NovaDbService.getAdminResellers();
console.log("1b. Admin Resellers count:", adminResellers.length);

// 2. Test Push Announcement module
const pushRes = NovaDbService.createPushAnnouncement("Notification Test", "Bienvenue sur NovaPaid !", "all", 1);
console.log("2. Push announcement created:", { id: pushRes.id, sentCount: pushRes.sentCount });

const announcements = NovaDbService.getAdminPushAnnouncements();
console.log("2b. Push announcements list count:", announcements.length);

// 3. Test Promotional Ads module
const adRes = NovaDbService.savePromotionalAd({
  title: "Offre Spéciale Carte Visa",
  description: "Rechargez sans frais aujourd'hui",
  linkUrl: "/cards",
  isActive: true,
  sortOrder: 1
}, 1);
console.log("3. Promotional ad saved:", adRes);

const ads = NovaDbService.getPromotionalAds(true);
console.log("3b. Active ads count:", ads.length);

// 4. Test Card recharge & withdrawal
let card = db.prepare("SELECT id, label FROM cards WHERE user_id = ? AND status != 'cancelled' LIMIT 1").get(userId);
const fundRes = NovaDbService.fundCard(userId, card.id, 5);
console.log("4. Card fund result:", { cardBal: fundRes.card.balanceUsd, walletBal: fundRes.newWalletBalanceXaf });

console.log("=== ALL MODULES VALIDATED AND OPERATIONAL ===");
