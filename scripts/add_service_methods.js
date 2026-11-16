
import fs from 'node:fs';

const filePath = 'C:/Users/RODDY NGUEYEP/Desktop/NovaPaid/app/lib/db/service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = '  loginAdmin(email: string, password: string';
const targetIndex = content.indexOf(targetStr);

if (targetIndex === -1) {
  console.error("target not found!");
  process.exit(1);
}

const methodsToAdd = `  // --- PROGRAMME REVENDEURS (Reseller / Affiliation - PrismCard) ---
  getResellerDashboard(userId: number) {
    const db = getDatabase();
    let reseller = db.prepare("SELECT * FROM resellers WHERE user_id = ?").get(userId) as any;
    if (!reseller) {
      const code = "NP" + userId + randomBytes(3).toString("hex").toUpperCase();
      const ins = db.prepare("INSERT INTO resellers (user_id, referral_code, commission_rate, status, subscription_status) VALUES (?, ?, 5.0, 'active', 'active')").run(userId, code);
      reseller = db.prepare("SELECT * FROM resellers WHERE id = ?").get(Number(ins.lastInsertRowid)) as any;
    }
    const referrals = db.prepare("SELECT id, name, email, phone, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC").all(userId) as any[];
    const commissions = db.prepare("SELECT * FROM reseller_commissions WHERE reseller_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as any[];
    const totalEarnedMinor = (db.prepare("SELECT SUM(commission_minor) as s FROM reseller_commissions WHERE reseller_id = ? AND status = 'paid'").get(userId) as any)?.s || 0;

    return {
      success: true,
      resellerCode: reseller.referral_code,
      commissionRate: reseller.commission_rate,
      status: reseller.status,
      subscriptionStatus: reseller.subscription_status,
      totalEarnedXaf: Math.round(Number(totalEarnedMinor) / 100),
      referralsCount: referrals.length,
      referrals,
      commissions: commissions.map((c: any) => ({
        id: c.id,
        orderType: c.order_type,
        orderRef: c.order_ref,
        amountXaf: Math.round(Number(c.amount_minor) / 100),
        commissionXaf: Math.round(Number(c.commission_minor) / 100),
        status: c.status,
        createdAt: c.created_at,
      })),
    };
  },

  getAdminResellers() {
    const db = getDatabase();
    const rows = db.prepare(\`
      SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             (SELECT count(*) FROM users WHERE referred_by = r.user_id) as referrals_count
      FROM resellers r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.id DESC
    \`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhone: r.user_phone,
      referralCode: r.referral_code,
      commissionRate: r.commission_rate,
      status: r.status,
      subscriptionStatus: r.subscription_status,
      referralsCount: r.referrals_count,
      totalEarnedXaf: Math.round(Number(r.total_earned_minor || 0) / 100),
      createdAt: r.created_at,
    }));
  },

  updateResellerRate(resellerId: number, rate: number, adminId: number) {
    const db = getDatabase();
    if (!Number.isFinite(rate) || rate < 0 || rate > 50) throw new Error("Le taux de commission doit être entre 0% et 50%.");
    db.prepare("UPDATE resellers SET commission_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(rate, resellerId);
    writeAdminAudit(db, adminId, "super_admin", "update_reseller_rate", \`reseller:\${resellerId}\`, \`Nouveau taux : \${rate}%\`);
    return { success: true };
  },

  // --- ANNONCES PUSH (Push Announcements - PrismCard) ---
  getAdminPushAnnouncements() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM push_announcements ORDER BY created_at DESC").all();
  },

  createPushAnnouncement(title: string, message: string, targetAudience: string, adminId: number) {
    const db = getDatabase();
    const cleanTitle = title.trim().slice(0, 100);
    const cleanMessage = message.trim().slice(0, 500);
    if (!cleanTitle || !cleanMessage) throw new Error("Le titre et le message de l'annonce sont requis.");

    const users = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as any[];
    for (const u of users) {
      createUserNotification(db, u.id, "info", cleanTitle, cleanMessage, "/dashboard");
    }

    const ins = db.prepare("INSERT INTO push_announcements (title, message, target_audience, status, sent_count, created_by) VALUES (?, ?, ?, 'sent', ?, ?)")
      .run(cleanTitle, cleanMessage, targetAudience || "all", users.length, adminId);
    writeAdminAudit(db, adminId, "operator", "send_push_announcement", \`announcement:\${ins.lastInsertRowid}\`, \`Envoyé à \${users.length} utilisateur(s)\`);
    return { success: true, id: Number(ins.lastInsertRowid), sentCount: users.length };
  },

  // --- ANNONCES PROMOTIONNELLES / ADS (PrismCard AdController) ---
  getPromotionalAds(activeOnly = true) {
    const db = getDatabase();
    if (activeOnly) {
      return db.prepare("SELECT * FROM promotional_ads WHERE is_active = 1 ORDER BY sort_order ASC, id DESC").all();
    }
    return db.prepare("SELECT * FROM promotional_ads ORDER BY sort_order ASC, id DESC").all();
  },

  savePromotionalAd(data: { id?: number; title: string; description?: string; linkUrl?: string; imageUrl?: string; isActive?: boolean; sortOrder?: number }, adminId: number) {
    const db = getDatabase();
    const cleanTitle = String(data.title || "").trim().slice(0, 120);
    if (!cleanTitle) throw new Error("Le titre de l'annonce est requis.");
    if (data.id) {
      db.prepare("UPDATE promotional_ads SET title = ?, description = ?, link_url = ?, image_url = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(cleanTitle, String(data.description || ""), String(data.linkUrl || ""), String(data.imageUrl || ""), data.isActive === false ? 0 : 1, Number(data.sortOrder || 0), data.id);
      writeAdminAudit(db, adminId, "operator", "update_ad", \`ad:\${data.id}\`, cleanTitle);
      return { success: true, id: data.id };
    }
    const ins = db.prepare("INSERT INTO promotional_ads (title, description, link_url, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)")
      .run(cleanTitle, String(data.description || ""), String(data.linkUrl || ""), String(data.imageUrl || ""), data.isActive === false ? 0 : 1, Number(data.sortOrder || 0));
    writeAdminAudit(db, adminId, "operator", "create_ad", \`ad:\${ins.lastInsertRowid}\`, cleanTitle);
    return { success: true, id: Number(ins.lastInsertRowid) };
  },

  deletePromotionalAd(id: number, adminId: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM promotional_ads WHERE id = ?").run(id);
    writeAdminAudit(db, adminId, "operator", "delete_ad", \`ad:\${id}\`, "Annonce publicitaire supprimée");
    return { success: true };
  },
`;

content = content.slice(0, targetIndex) + methodsToAdd + '\n' + content.slice(targetIndex);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully inserted service methods!");
