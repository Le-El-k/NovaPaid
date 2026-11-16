import { NovaDbService } from "../../app/lib/db/service.ts";
import { listIntegrationsForAdmin, saveIntegrationValues } from "../../app/lib/integrations.ts";
import { ADMIN_SESSION_COOKIE, clientContext, expiredSessionCookie, getAuthenticatedAdmin, readCookie, sessionCookie } from "../../app/lib/auth/session.ts";

const SECTION_PERMISSION: Record<string, string> = {
  overview: "overview",
  session: "overview",
  revenue: "overview",
  boutique_analytics: "overview",
  transactions: "transactions",
  support: "support",
  users: "users",
  admins: "admins",
  approvals: "approvals",
  kyc: "kyc",
  cards: "cards",
  audit: "audit",
  reviews: "reviews",
  settings: "settings",
  shop: "shop",
  resellers: "users",
  push_announcements: "overview",
  ads: "overview",
  landing_cms: "settings",
  email_settings: "settings",
  email_campaigns: "settings",
  withdrawal_methods: "settings",
  withdrawal_settings: "settings",
  manual_payments: "settings",
  marketing_settings: "settings",
  activities: "audit",
  marketplace_categories: "shop",
  marketplace_articles: "shop",
  marketplace_commandes: "shop",
  user_shops: "shop",
  shop_global_settings: "shop",
  user_security: "users",
  webhook_relays: "settings",
  card_issuing: "settings",
  card_terminations: "cards",
  deposit_help: "settings",
  help_articles: "settings",
  revenue_analytics: "overview",
  global_search: "overview",
  identity_verifications: "kyc",
  integrations: "settings",
};

const ACTION_PERMISSION: Record<string, string> = {
  decide_approval: "approvals",
  review_kyc: "kyc",
  update_user: "users",
  update_wallet: "users",
  adjust_wallet_balance: "users",
  update_admin: "admins",
  create_admin: "admins",
  toggle_card: "cards",
  update_review: "reviews",
  delete_review: "reviews",
  add_review: "reviews",
  update_setting: "settings",
  review_transaction: "transactions",
  update_ticket: "support",
  reply_ticket: "support",
  save_shop_section: "shop",
  set_shop_section_status: "shop",
  delete_shop_section: "shop",
  save_shop_product: "shop",
  set_shop_product_status: "shop",
  delete_shop_product: "shop",
  update_reseller_rate: "users",
  send_push_announcement: "overview",
  save_ad: "overview",
  delete_ad: "overview",
  impersonate_user: "users",
  upsert_landing_cms: "settings",
  delete_landing_cms: "settings",
  upsert_email_setting: "settings",
  create_email_campaign: "settings",
  update_email_campaign_status: "settings",
  delete_email_campaign: "settings",
  upsert_withdrawal_method: "settings",
  delete_withdrawal_method: "settings",
  upsert_withdrawal_setting: "settings",
  upsert_manual_payment: "settings",
  delete_manual_payment: "settings",
  upsert_manual_payment_field: "settings",
  delete_manual_payment_field: "settings",
  upsert_marketing_setting: "settings",
  save_integration: "settings",
  delete_marketing_setting: "settings",
  create_category: "shop",
  update_category: "shop",
  delete_category: "shop",
  upsert_category_field: "shop",
  delete_category_field: "shop",
  create_article: "shop",
  update_article: "shop",
  delete_article: "shop",
  update_commande_status: "shop",
  delete_article_comment: "shop",
  approve_shop: "shop",
  reject_shop: "shop",
  toggle_shop_active: "shop",
  update_shop_commission: "shop",
  update_shop_global_setting: "shop",
  admin_force_reset_password: "users",
  admin_reset_pin: "users",
  admin_revoke_all_sessions: "users",
  admin_clear_trusted_devices: "users",
  admin_clear_webauthn: "users",
  admin_disable_2fa: "users",
  create_announcement: "overview",
  delete_announcement: "overview",
  send_announcement: "overview",
  send_email_campaign: "settings",
  save_email_setting: "settings",
  delete_email_setting: "settings",
  save_help_article: "settings",
  delete_help_article: "settings",
  update_landing_cms: "settings",
  update_marketing: "settings",
  update_deposit_help: "settings",
  update_card_issuing: "settings",
  review_card_termination: "cards",
  create_webhook_relay: "settings",
  delete_webhook_relay: "settings",
  add_webhook_destination: "settings",
  remove_webhook_destination: "settings",
  review_identity: "kyc",
};

function canAccess(admin: { role: string; permissions: string }, permission: string) {
  if (permission === "overview" || permission === "session") return true;
  if (admin.role === "super_admin" || admin.permissions.trim() === "all") return true;
  return admin.permissions.split(",").map((item) => item.trim()).includes(permission);
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "overview";
  if (section === "session") {
    const admin = getAuthenticatedAdmin(request);
    return Response.json({
      success: true,
      authenticated: Boolean(admin),
      admin: admin || null,
      setupRequired: admin ? false : NovaDbService.adminSetupRequired(),
    });
  }

  const admin = getAuthenticatedAdmin(request);
  if (!admin) return Response.json({ success: false, error: "Session administrateur requise." }, { status: 401 });
  const permission = SECTION_PERMISSION[section];
  if (!permission) return Response.json({ success: false, error: "Section inconnue." }, { status: 400 });
  if (!canAccess(admin, permission)) return Response.json({ success: false, error: "Votre rôle ne permet pas d’accéder à cette section." }, { status: 403 });

  try {
    switch (section) {
      case "overview": return Response.json({ success: true, overview: NovaDbService.getAdminOverview() });
      case "transactions": return Response.json({ success: true, transactions: NovaDbService.getAdminTransactions() });
      case "support": return Response.json({ success: true, tickets: NovaDbService.getAdminSupportTickets() });
      case "users": return Response.json({ success: true, users: NovaDbService.getAdminUsers() });
      case "approvals": return Response.json({ success: true, approvals: NovaDbService.getAdminApprovals() });
      case "kyc": return Response.json({ success: true, kycCases: NovaDbService.getAdminKycCases() });
      case "cards": return Response.json({ success: true, cards: NovaDbService.getAdminCards() });
      case "audit": return Response.json({ success: true, auditLogs: NovaDbService.getAdminAuditLogs() });
      case "reviews": return Response.json({ success: true, reviews: NovaDbService.getAdminReviews() });
      case "admins": return Response.json({ success: true, admins: NovaDbService.getAdminAccounts() });
      case "settings": return Response.json({ success: true, settings: NovaDbService.getAdminSettings() });
      case "shop": return Response.json({ success: true, shopCatalog: NovaDbService.getAdminShopCatalog() });
      case "resellers": return Response.json({ success: true, resellers: NovaDbService.getAdminResellers() });
      case "push_announcements": return Response.json({ success: true, announcements: NovaDbService.getAdminPushAnnouncements() });
      case "ads": return Response.json({ success: true, ads: NovaDbService.getPromotionalAds(false) });
      case "revenue": return Response.json({ success: true, stats: NovaDbService.getAdminRevenueStats() });
      case "boutique_analytics": {
        const days = Number(url.searchParams.get("days") || 30);
        return Response.json({ success: true, internet: NovaDbService.getGenyAnalytics(days) });
      }
      case "landing_cms": return Response.json({ success: true, sections: NovaDbService.getLandingPageSettings() });
      case "email_settings": return Response.json({ success: true, settings: NovaDbService.getEmailSettings() });
      case "email_campaigns": return Response.json({ success: true, campaigns: NovaDbService.getEmailCampaigns() });
      case "withdrawal_methods": return Response.json({ success: true, methods: NovaDbService.getWithdrawalMethods() });
      case "withdrawal_settings": return Response.json({ success: true, settings: NovaDbService.getWithdrawalSettings() });
      case "manual_payments": return Response.json({ success: true, apis: NovaDbService.getManualPaymentApis() });
      case "marketing_settings": return Response.json({ success: true, settings: NovaDbService.getMarketingSettings() });
      case "activities": {
        const limit = Number(url.searchParams.get("limit") || 100);
        const offset = Number(url.searchParams.get("offset") || 0);
        return Response.json({ success: true, activities: NovaDbService.getActivities({ limit, offset }) });
      }
      case "marketplace_categories": {
        const categories = NovaDbService.getAllCategories();
        return Response.json({ success: true, categories });
      }
      case "marketplace_articles": {
        const categoryId = url.searchParams.get("category") ? Number(url.searchParams.get("category")) : undefined;
        const search = url.searchParams.get("search") || undefined;
        const articles = NovaDbService.getAllArticles({ categoryId, search });
        return Response.json({ success: true, articles });
      }
      case "marketplace_commandes": {
        const status = url.searchParams.get("status") || undefined;
        const result = NovaDbService.getAllCommandes({ status, limit: 200 });
        return Response.json({ success: true, ...result });
      }
      case "user_shops": {
        const shopStatus = url.searchParams.get("status") || undefined;
        const result = NovaDbService.adminGetAllShops({ status: shopStatus });
        return Response.json({ success: true, shops: result.items, total: result.total });
      }
      case "shop_global_settings": {
        return Response.json({ success: true, settings: NovaDbService.getShopGlobalSettings() });
      }
      case "user_security": {
        const targetUserId = Number(url.searchParams.get("user_id"));
        if (!targetUserId) return Response.json({ success: false, error: "user_id requis" }, { status: 400 });
        return Response.json({ success: true, ...NovaDbService.adminGetUserSecurityInfo(targetUserId) });
      }
      case "webhook_relays": return Response.json({ success: true, relays: NovaDbService.listWebhookRelays() });
      case "card_issuing": return Response.json({ success: true, settings: NovaDbService.getCardIssuingSettings() });
      case "card_terminations": {
        const ctStatus = url.searchParams.get("status") || undefined;
        return Response.json({ success: true, requests: NovaDbService.listCardTerminationRequests(ctStatus) });
      }
      case "deposit_help": return Response.json({ success: true, settings: NovaDbService.getDepositHelpPopup() });
      case "help_articles": return Response.json({ success: true, articles: NovaDbService.listHelpArticles() });
      case "integrations": {
        // Clés des fournisseurs : réservé au super administrateur.
        if (admin.role !== "super_admin") return Response.json({ success: false, error: "Réservé au super administrateur." }, { status: 403 });
        return Response.json({ success: true, integrations: listIntegrationsForAdmin() });
      }
      case "revenue_analytics": {
        const days = Number(url.searchParams.get("days") || 30);
        return Response.json({ success: true, analytics: NovaDbService.getRevenueAnalytics(days) });
      }
      case "global_search": {
        const q = url.searchParams.get("q") || "";
        if (!q.trim()) return Response.json({ success: true, results: { users: [], transactions: [], tickets: [] } });
        return Response.json({ success: true, results: NovaDbService.adminGlobalSearch(q) });
      }
      case "identity_verifications": {
        const ivStatus = url.searchParams.get("status") || undefined;
        return Response.json({ success: true, verifications: NovaDbService.listIdentityVerifications(ivStatus) });
      }
      default: return Response.json({ success: false, error: "Section inconnue." }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur admin" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "");
    if (!requireSameOrigin(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });

    if (action === "login") {
      const ip = clientContext(request).ipAddress || "unknown";
      const email = String(body?.email || "").trim().toLowerCase();
      const retryKey = `admin:${ip}:${email}`;
      const retryAfter = NovaDbService.checkAuthRateLimit(retryKey, 5, 15 * 60 * 1000, 30 * 60 * 1000);
      if (retryAfter) return Response.json({ success: false, error: "Trop d’essais de connexion admin. Réessayez plus tard." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
      const result = NovaDbService.loginAdmin(email, String(body?.password || ""), clientContext(request));
      NovaDbService.clearAuthRateLimit(retryKey);
      return Response.json(
        { success: true, admin: result.admin },
        { headers: { "Set-Cookie": sessionCookie(ADMIN_SESSION_COOKIE, result.sessionToken, 8 * 60 * 60) } }
      );
    }

    if (action === "setup") {
      if (!NovaDbService.adminSetupRequired()) {
        return Response.json({ success: false, error: "L’installation est déjà terminée. Connectez-vous." }, { status: 409 });
      }
      const ip = clientContext(request).ipAddress || "unknown";
      const retryKey = `admin-setup:${ip}`;
      const retryAfter = NovaDbService.checkAuthRateLimit(retryKey, 10, 15 * 60 * 1000, 15 * 60 * 1000);
      if (retryAfter) return Response.json({ success: false, error: "Trop d’essais. Réessayez plus tard." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
      const result = NovaDbService.completeAdminSetup(
        { name: String(body?.name || ""), email: String(body?.email || ""), password: String(body?.password || "") },
        clientContext(request)
      );
      NovaDbService.clearAuthRateLimit(retryKey);
      return Response.json(
        { success: true, admin: result.admin },
        { headers: { "Set-Cookie": sessionCookie(ADMIN_SESSION_COOKIE, result.sessionToken, 8 * 60 * 60) } }
      );
    }

    if (action === "logout") {
      NovaDbService.logoutAdmin(readCookie(request, ADMIN_SESSION_COOKIE));
      return Response.json({ success: true }, { headers: { "Set-Cookie": expiredSessionCookie(ADMIN_SESSION_COOKIE) } });
    }

    const admin = getAuthenticatedAdmin(request);
    if (!admin) return Response.json({ success: false, error: "Session administrateur requise." }, { status: 401 });
    const permission = ACTION_PERMISSION[action];
    if (!permission) return Response.json({ success: false, error: "Action non reconnue." }, { status: 400 });
    if (!canAccess(admin, permission)) return Response.json({ success: false, error: "Votre rôle ne permet pas cette action." }, { status: 403 });

    if (action === "decide_approval") {
      const result = NovaDbService.decideApproval(Number(body.approvalId), body.approve === true, admin.id, String(body.note || ""));
      return Response.json(result);
    }
    if (action === "review_kyc") {
      const result = NovaDbService.reviewKycCase(Number(body.caseId), body.approve === true, String(body.reason || ""), admin.id);
      return Response.json(result);
    }
    if (action === "update_user") {
      const result = NovaDbService.updateUserStatus(Number(body.userId), String(body.status || ""), body.kycStatus ? String(body.kycStatus) : undefined, admin.id);
      return Response.json(result);
    }
    if (action === "update_wallet") {
      const result = NovaDbService.setUserWalletStatus(Number(body.userId), body.status, admin.id);
      return Response.json(result);
    }
    if (action === "adjust_wallet_balance") {
      if (admin.role !== "super_admin") return Response.json({ success: false, error: "Action réservée au super administrateur." }, { status: 403 });
      const result = NovaDbService.adjustUserWalletBalance(
        Number(body.userId),
        String(body.direction || "") as "credit" | "debit",
        Number(body.amountXaf),
        String(body.reason || ""),
        admin.id,
        String(body.idempotencyKey || ""),
      );
      return Response.json(result);
    }
    if (action === "update_admin") {
      if (admin.role !== "super_admin") return Response.json({ success: false, error: "Action réservée au super administrateur." }, { status: 403 });
      const result = NovaDbService.updateAdminAccount(Number(body.adminId), String(body.role || ""), String(body.status || ""), admin.id, body.password === undefined ? undefined : String(body.password));
      return Response.json(result);
    }
    if (action === "create_admin") {
      if (admin.role !== "super_admin") return Response.json({ success: false, error: "Action réservée au super administrateur." }, { status: 403 });
      const result = NovaDbService.createAdminAccount({
        name: String(body.name || ""),
        email: String(body.email || ""),
        phone: String(body.phone || ""),
        role: String(body.role || "operator"),
        password: String(body.password || ""),
      }, admin.id);
      return Response.json(result, { status: 201 });
    }
    if (action === "toggle_card") {
      const result = NovaDbService.toggleCardFreeze(Number(body.cardId), admin.id);
      return Response.json(result);
    }
    if (action === "review_transaction") {
      const result = NovaDbService.reviewAdminTransaction(Number(body.transactionId), body.status, String(body.note || ""), admin.id);
      return Response.json(result);
    }
    if (action === "update_ticket") {
      const result = NovaDbService.updateSupportTicket(Number(body.ticketId), body.status, String(body.resolution || ""), admin.id, body.priority ? (String(body.priority) as "low" | "normal" | "high" | "urgent") : undefined);
      return Response.json(result);
    }
    if (action === "reply_ticket") {
      const result = NovaDbService.addAdminTicketReply(
        admin.id,
        Number(body.ticketId),
        String(body.message || ""),
        Boolean(body.isInternal),
        body.status,
        body.priority
      );
      return Response.json(result);
    }
    if (action === "update_review") {
      const result = NovaDbService.updateReviewStatus(Number(body.reviewId), body.status, admin.id);
      return Response.json(result);
    }
    if (action === "delete_review") {
      const result = NovaDbService.deleteReview(Number(body.reviewId), admin.id);
      return Response.json(result);
    }
    if (action === "add_review") {
      if (!String(body.authorName || "").trim() || String(body.reviewText || "").trim().length < 10) {
        return Response.json({ success: false, error: "Le nom et un avis d’au moins 10 caractères sont requis." }, { status: 400 });
      }
      const result = NovaDbService.addCustomerReview({
        authorName: String(body.authorName || "").slice(0, 80),
        authorLocation: String(body.authorLocation || "").slice(0, 80),
        rating: Number(body.rating) || 5,
        serviceTag: String(body.serviceTag || "Général").slice(0, 60),
        reviewText: String(body.reviewText || "").slice(0, 1000),
        isVerified: false,
        status: "pending",
      });
      return Response.json(result);
    }
    if (action === "update_setting") {
      const result = NovaDbService.updateAdminSetting(String(body.key || ""), body.value, admin.id);
      return Response.json(result);
    }
    if (action === "save_shop_section") {
      const result = NovaDbService.saveShopSection({
        ...(body.id === undefined ? {} : { id: Number(body.id) }),
        name: String(body.name || ""),
        description: String(body.description || ""),
        icon: String(body.icon || "shopping-bag"),
        sortOrder: Number(body.sortOrder ?? 0),
      }, admin.id);
      return Response.json(result, { status: body.id === undefined ? 201 : 200 });
    }
    if (action === "set_shop_section_status") {
      return Response.json(NovaDbService.setShopSectionStatus(Number(body.sectionId), body.isActive === true, admin.id));
    }
    if (action === "delete_shop_section") {
      return Response.json(NovaDbService.deleteShopSection(Number(body.sectionId), admin.id));
    }
    if (action === "save_shop_product") {
      const result = NovaDbService.saveShopProduct({
        ...(body.id === undefined ? {} : { id: Number(body.id) }),
        sectionId: Number(body.sectionId),
        name: String(body.name || ""),
        subtitle: String(body.subtitle || ""),
        description: String(body.description || ""),
        imageUrl: String(body.imageUrl || ""),
        badge: String(body.badge || ""),
        customerLabel: String(body.customerLabel || ""),
        requiresPassword: body.requiresPassword === true,
        sortOrder: Number(body.sortOrder ?? 0),
        offers: body.offers,
      }, admin.id);
      return Response.json(result, { status: body.id === undefined ? 201 : 200 });
    }
    if (action === "set_shop_product_status") {
      return Response.json(NovaDbService.setShopProductStatus(Number(body.productId), body.isActive === true, admin.id));
    }
    if (action === "delete_shop_product") {
      return Response.json(NovaDbService.deleteShopProduct(Number(body.productId), admin.id));
    }
    if (action === "update_reseller_rate") {
      return Response.json(NovaDbService.updateResellerRate(Number(body.resellerId), Number(body.rate), admin.id));
    }
    if (action === "send_push_announcement") {
      return Response.json(NovaDbService.createPushAnnouncement(String(body.title || ""), String(body.message || ""), String(body.targetAudience || "all"), admin.id));
    }
    if (action === "save_ad") {
      return Response.json(NovaDbService.savePromotionalAd(body, admin.id));
    }
    if (action === "delete_ad") {
      return Response.json(NovaDbService.deletePromotionalAd(Number(body.id), admin.id));
    }

    // Phase 3 actions
    if (action === "impersonate_user") {
      if (admin.role !== "super_admin") return Response.json({ success: false, error: "Action réservée au super administrateur." }, { status: 403 });
      const ctx = { ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null, userAgent: request.headers.get("user-agent")?.slice(0, 500) || null };
      const result = NovaDbService.impersonateUser(admin.id, Number(body.userId), ctx);
      return Response.json(result, {
        headers: { "Set-Cookie": `np_user_session=${encodeURIComponent(result.sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200` },
      });
    }
    if (action === "upsert_landing_cms") {
      return Response.json(NovaDbService.upsertLandingPageSetting(body.data));
    }
    if (action === "delete_landing_cms") {
      return Response.json(NovaDbService.deleteLandingPageSetting(Number(body.id)));
    }
    if (action === "upsert_email_setting") {
      return Response.json(NovaDbService.upsertEmailSetting(body.data));
    }
    if (action === "create_email_campaign") {
      return Response.json(NovaDbService.createEmailCampaign(body.data, admin.id));
    }
    if (action === "update_email_campaign_status") {
      return Response.json(NovaDbService.updateEmailCampaignStatus(Number(body.id), String(body.status)));
    }
    if (action === "delete_email_campaign") {
      return Response.json(NovaDbService.deleteEmailCampaign(Number(body.id)));
    }
    if (action === "upsert_withdrawal_method") {
      return Response.json(NovaDbService.upsertWithdrawalMethod(body.data));
    }
    if (action === "delete_withdrawal_method") {
      return Response.json(NovaDbService.deleteWithdrawalMethod(Number(body.id)));
    }
    if (action === "upsert_withdrawal_setting") {
      return Response.json(NovaDbService.upsertWithdrawalSetting(String(body.key), String(body.value)));
    }
    if (action === "upsert_manual_payment") {
      return Response.json(NovaDbService.upsertManualPaymentApi(body.data));
    }
    if (action === "delete_manual_payment") {
      return Response.json(NovaDbService.deleteManualPaymentApi(Number(body.id)));
    }
    if (action === "upsert_manual_payment_field") {
      return Response.json(NovaDbService.upsertManualPaymentField(body.data));
    }
    if (action === "delete_manual_payment_field") {
      return Response.json(NovaDbService.deleteManualPaymentField(Number(body.id)));
    }
    if (action === "upsert_marketing_setting") {
      return Response.json(NovaDbService.upsertMarketingSetting(body.data));
    }
    if (action === "delete_marketing_setting") {
      return Response.json(NovaDbService.deleteMarketingSetting(Number(body.id)));
    }

    // ── Marketplace: Categories ──
    if (action === "create_category") {
      return Response.json(NovaDbService.createCategory(body.data));
    }
    if (action === "update_category") {
      return Response.json(NovaDbService.updateCategory(Number(body.id), body.data));
    }
    if (action === "delete_category") {
      return Response.json(NovaDbService.deleteCategory(Number(body.id)));
    }
    if (action === "upsert_category_field") {
      return Response.json(NovaDbService.upsertCategoryField(body.data));
    }
    if (action === "delete_category_field") {
      return Response.json(NovaDbService.deleteCategoryField(Number(body.id)));
    }

    // ── Marketplace: Articles ──
    if (action === "create_article") {
      return Response.json(NovaDbService.createArticle({ ...body.data, user_id: admin.id }));
    }
    if (action === "update_article") {
      return Response.json(NovaDbService.updateArticle(Number(body.id), body.data));
    }
    if (action === "delete_article") {
      return Response.json(NovaDbService.deleteArticle(Number(body.id)));
    }
    if (action === "delete_article_comment") {
      return Response.json(NovaDbService.deleteArticleComment(Number(body.id)));
    }

    // ── Marketplace: Commandes ──
    if (action === "update_commande_status") {
      return Response.json(NovaDbService.updateCommandeStatus(Number(body.id), body.status, body.response));
    }

    // ── User Shops ──
    if (action === "approve_shop") {
      return Response.json(NovaDbService.approveShop(Number(body.shop_id), admin.id));
    }
    if (action === "reject_shop") {
      return Response.json(NovaDbService.rejectShop(Number(body.shop_id), admin.id, String(body.reason || "")));
    }
    if (action === "toggle_shop_active") {
      return Response.json(NovaDbService.toggleShopActive(Number(body.shop_id)));
    }
    if (action === "update_shop_commission") {
      return Response.json(NovaDbService.updateShopCommission(Number(body.shop_id), Number(body.rate)));
    }
    if (action === "update_shop_global_setting") {
      return Response.json(NovaDbService.updateShopGlobalSetting(String(body.key), String(body.value)));
    }

    if (action === "admin_force_reset_password") {
      return Response.json(NovaDbService.adminForceResetPassword(Number(body.user_id), admin.id, String(body.new_password)));
    }
    if (action === "admin_reset_pin") {
      return Response.json(NovaDbService.adminResetUserPin(Number(body.user_id), admin.id));
    }
    if (action === "admin_revoke_all_sessions") {
      return Response.json(NovaDbService.adminRevokeAllUserSessions(Number(body.user_id)));
    }
    if (action === "admin_clear_trusted_devices") {
      return Response.json(NovaDbService.adminClearUserTrustedDevices(Number(body.user_id)));
    }
    if (action === "admin_clear_webauthn") {
      return Response.json(NovaDbService.adminClearUserWebAuthn(Number(body.user_id)));
    }
    if (action === "admin_disable_2fa") {
      return Response.json(NovaDbService.adminDisableUser2FA(Number(body.user_id)));
    }

    // Phase 7 — Communication
    if (action === "create_announcement") {
      return Response.json({ success: true, ...NovaDbService.createAnnouncement({ title: String(body.title), message: String(body.message), target_audience: body.target_audience, created_by: admin.id }) });
    }
    if (action === "send_announcement") {
      return Response.json(NovaDbService.sendAnnouncement(Number(body.id)));
    }
    if (action === "delete_announcement") {
      return Response.json(NovaDbService.deleteAnnouncement(Number(body.id)));
    }
    if (action === "send_email_campaign") {
      if (body.subject) {
        const created = NovaDbService.createEmailCampaign({ subject: String(body.subject), message: String(body.message), scheduled_for: body.scheduled_for });
        const sendResult = NovaDbService.sendEmailCampaign(Number(created.id));
        return Response.json({ ...sendResult, id: created.id });
      }
      return Response.json(NovaDbService.sendEmailCampaign(Number(body.id)));
    }
    if (action === "save_email_setting") {
      return Response.json({ success: true, ...NovaDbService.saveEmailSetting(body) });
    }
    if (action === "delete_email_setting") {
      return Response.json(NovaDbService.deleteEmailSetting(Number(body.id)));
    }

    // Phase 8 — Fonctionnalités supplémentaires
    if (action === "save_help_article") {
      return Response.json({ success: true, ...NovaDbService.saveHelpArticle(body) });
    }
    if (action === "delete_help_article") {
      return Response.json(NovaDbService.deleteHelpArticle(Number(body.id)));
    }
    if (action === "update_landing_cms") {
      return Response.json(NovaDbService.updateLandingPageSettings(body));
    }
    if (action === "update_marketing") {
      return Response.json(NovaDbService.updateMarketingSettings(body));
    }
    if (action === "update_deposit_help") {
      return Response.json(NovaDbService.updateDepositHelpPopup(body));
    }
    if (action === "update_card_issuing") {
      return Response.json(NovaDbService.updateCardIssuingSettings(body));
    }
    if (action === "review_card_termination") {
      return Response.json(NovaDbService.reviewCardTermination(Number(body.id), String(body.status), body.refund_amount ? Number(body.refund_amount) : undefined));
    }
    if (action === "create_webhook_relay") {
      return Response.json({ success: true, ...NovaDbService.createWebhookRelay({ name: String(body.name), api_key_id: body.api_key_id ? Number(body.api_key_id) : undefined }) });
    }
    if (action === "delete_webhook_relay") {
      return Response.json(NovaDbService.deleteWebhookRelay(Number(body.id)));
    }
    if (action === "add_webhook_destination") {
      return Response.json({ success: true, ...NovaDbService.addWebhookDestination(Number(body.relay_id), String(body.url), body.secret) });
    }
    if (action === "remove_webhook_destination") {
      return Response.json(NovaDbService.removeWebhookDestination(Number(body.id)));
    }
    if (action === "save_integration") {
      if (admin.role !== "super_admin") return Response.json({ success: false, error: "Réservé au super administrateur." }, { status: 403 });
      const values = body?.values && typeof body.values === "object" ? body.values : {};
      const clear = Array.isArray(body?.clear) ? body.clear.map(String) : [];
      return Response.json(saveIntegrationValues(String(body?.provider || ""), values, clear, admin.id));
    }
    if (action === "review_identity") {
      return Response.json(NovaDbService.reviewIdentityVerification(Number(body.id), admin.id, String(body.status), body.reason));
    }

    return Response.json({ success: false, error: "Action non reconnue." }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur de traitement" }, { status: 400 });
  }
}
