"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type Language = "fr" | "en";

export const DICTIONARY = {
  fr: {
    // Navigation & Common
    my_account: "Mon espace",
    dashboard: "Tableau de bord",
    boutique: "La boutique",
    my_cards: "Mes cartes",
    transfers: "Transferts",
    history: "Historique",
    funding: "Recharges & Retraits",
    settings: "Paramètres",
    support: "Service client",
    notifications: "Notifications",
    sign_out: "Déconnexion",
    back_to_shop: "Retour à la boutique",
    all_read: "Tout lire",
    no_notifications: "Vous n’avez aucune notification.",
    loading: "Chargement…",
    search: "Rechercher…",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    close: "Fermer",
    edit: "Modifier",
    send: "Envoyer",

    // Cards
    cards_title: "Mes cartes virtuelles",
    cards_subtitle: "cartes gérées de manière sécurisée",
    new_card: "Nouvelle carte",
    create_first_card: "Créer ma première carte",
    no_cards_available: "Aucune carte disponible",
    no_cards_desc: "Créez votre première carte virtuelle Visa ou Mastercard en quelques secondes.",
    card_limit_badge: "cartes",
    card_limit_reached: "Limite atteinte (3/3)",
    card_limit_warning: "Vous possédez 3/3 cartes autorisées. La limite maximale de cartes actives ou gelées par compte est de 3.",
    freeze_card: "Geler ma carte",
    unfreeze_card: "Dégeler ma carte",
    active_card: "Active",
    frozen_card: "Gelée",
    closed_card: "Clôturée",
    card_balance: "Solde disponible",
    card_network: "Réseau",
    card_type: "Type",
    card_status: "Statut",
    transaction_history: "Historique des transactions",
    no_card_tx: "Aucune transaction enregistrée sur cette carte.",
    show_details: "Afficher",
    hide_details: "Masquer",
    flip_card: "Retourner",
    freeze_confirm_title: "Geler cette carte ?",
    freeze_confirm_desc: "Vos paiements en ligne avec cette carte seront immédiatement suspendus jusqu’à son dégel.",
    unfreeze_confirm_title: "Réactiver cette carte ?",
    unfreeze_confirm_desc: "Votre carte sera à nouveau active et utilisable pour vos achats en ligne.",

    // Support
    customer_support: "Service client",
    submit_request: "Envoyer ma réclamation",
    my_support_requests: "Mes réclamations",
    new_support_request: "Nouvelle réclamation",
    in_progress: "En cours de traitement",
    resolved: "Résolu",
    closed: "Fermé",
    waiting_client: "En attente de votre réponse",
    ticket_new: "Nouveau",
    contact_whatsapp: "Contacter sur WhatsApp",
    contact_whatsapp_desc: "Besoin d’aide ? Envoyez votre demande via notre formulaire de support pour bénéficier d’un suivi avec un numéro de ticket. Vous pouvez également nous contacter directement sur WhatsApp.",
    support_channels: "Canaux d'assistance officiels",
    ticket_subject: "Objet de votre message",
    ticket_category: "Nature de votre demande",
    ticket_message: "Description détaillée",
    ticket_ref: "Référence de carte ou transaction (optionnelle)",
    ticket_created_success: "Votre réclamation a bien été enregistrée.",
    ticket_number: "Numéro de ticket",
    reply_placeholder: "Écrivez votre réponse ici…",
    reply_btn: "Répondre",
    ticket_conversation: "Conversation & Échanges",
    no_tickets: "Aucune réclamation enregistrée pour l'instant.",

    // Categories
    // Priorities
    priority_urgent: "Urgente",
    priority_high: "Élevée",
    priority_normal: "Normale",
    priority_low: "Basse",
    full_name: "Nom complet",
    email_address: "Adresse e-mail",
    support_option_a_title: "Option A — Envoyer une réclamation",
    support_option_a_desc: "Formulaire intégré avec numéro de ticket garanti et suivi dans votre espace.",
    support_option_b_title: "Option B — Contacter sur WhatsApp",
    support_option_b_desc: "Discutez en direct avec notre équipe sur notre numéro officiel.",
    support_option_b_notice: "Note : Les messages WhatsApp ne sont pas liés automatiquement au système de tickets.",
    support_email_title: "Support officiel par E-mail",
    support_email_desc: "serviceclient2126@gmail.com",
    support_email_btn: "Écrire un e-mail",
    shop_choose_category: "Choisissez une catégorie pour découvrir ses offres.",
    back_to_categories: "Retour aux catégories",
    view_packs: "Voir les packs",
    starting_from: "À PARTIR DE",
    finalize_order: "Finaliser votre recharge",
    delivery_details: "Coordonnées de livraison",
    change_pack: "Changer de pack",
    search_product: "Rechercher un produit",
    secure_payment_soleaspay: "Paiement sécurisé par SoleasPay • Chiffré SSL",
    complete_info_to_pay: "Complétez les informations pour débloquer le paiement",
    required_fields: "À renseigner :",
    cat_card: "Problème de carte",
    cat_payment: "Paiement en ligne",
    cat_balance: "Solde de compte",
    cat_transaction: "Transaction contestée",
    cat_funding: "Dépôt ou Retrait Mobile Money",
    cat_transfer: "Transfert de fonds",
    cat_shop: "Commande boutique (Jeux, abonnements)",
    cat_security: "Sécurité & Compte",
    cat_other: "Autre demande",
  },
  en: {
    // Navigation & Common
    my_account: "My Account",
    dashboard: "Dashboard",
    boutique: "Shop",
    my_cards: "My Cards",
    transfers: "Transfers",
    history: "History",
    funding: "Top-up & Withdraw",
    settings: "Settings",
    support: "Customer Support",
    notifications: "Notifications",
    sign_out: "Sign Out",
    back_to_shop: "Back to Shop",
    all_read: "Mark all as read",
    no_notifications: "You have no notifications.",
    loading: "Loading…",
    search: "Search…",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    edit: "Edit",
    send: "Send",

    // Cards
    cards_title: "My Virtual Cards",
    cards_subtitle: "cards securely managed",
    new_card: "New Card",
    create_first_card: "Create My First Card",
    no_cards_available: "No Cards Available",
    no_cards_desc: "Create your first virtual Visa or Mastercard in seconds.",
    card_limit_badge: "cards",
    card_limit_reached: "Limit Reached (3/3)",
    card_limit_warning: "You have 3/3 authorized cards. The maximum limit of active or frozen cards per account is 3.",
    freeze_card: "Freeze Card",
    unfreeze_card: "Unfreeze Card",
    active_card: "Active",
    frozen_card: "Frozen",
    closed_card: "Closed",
    card_balance: "Available Balance",
    card_network: "Network",
    card_type: "Type",
    card_status: "Status",
    transaction_history: "Transaction History",
    no_card_tx: "No transactions recorded for this card.",
    show_details: "Show",
    hide_details: "Hide",
    flip_card: "Flip",
    freeze_confirm_title: "Freeze this card?",
    freeze_confirm_desc: "Online payments with this card will be temporarily paused until unfrozen.",
    unfreeze_confirm_title: "Reactivate this card?",
    unfreeze_confirm_desc: "Your card will be active and ready for online purchases.",

    // Support
    customer_support: "Customer Support",
    submit_request: "Submit My Request",
    my_support_requests: "My Support Requests",
    new_support_request: "New Support Request",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    waiting_client: "Awaiting your reply",
    ticket_new: "New",
    contact_whatsapp: "Contact Us on WhatsApp",
    contact_whatsapp_desc: "Need help? Submit your request using our support form to get a tracking ticket. You can also reach us directly on WhatsApp.",
    support_channels: "Official Support Channels",
    ticket_subject: "Subject of your request",
    ticket_category: "Category",
    ticket_message: "Detailed description",
    ticket_ref: "Card or transaction reference (optional)",
    ticket_created_success: "Your request has been successfully recorded.",
    ticket_number: "Ticket Number",
    reply_placeholder: "Write your reply here…",
    reply_btn: "Reply",
    ticket_conversation: "Conversation History",
    no_tickets: "No support requests recorded yet.",

    // Categories
    // Priorities
    priority_urgent: "Urgent",
    priority_high: "High",
    priority_normal: "Normal",
    priority_low: "Low",
    full_name: "Full Name",
    email_address: "Email Address",
    support_option_a_title: "Option A — Submit a Support Ticket",
    support_option_a_desc: "Integrated form with guaranteed ticket ID and tracking in your account.",
    support_option_b_title: "Option B — Contact on WhatsApp",
    support_option_b_desc: "Chat live with our support team on our official number.",
    support_option_b_notice: "Note: WhatsApp messages are not automatically linked to the ticketing system.",
    support_email_title: "Official Email Support",
    support_email_desc: "serviceclient2126@gmail.com",
    support_email_btn: "Send an email",
    shop_choose_category: "Choose a category to discover available offers.",
    back_to_categories: "Back to categories",
    view_packs: "View packs",
    starting_from: "STARTING FROM",
    finalize_order: "Finalize your order",
    delivery_details: "Delivery details",
    change_pack: "Change pack",
    search_product: "Search a product",
    secure_payment_soleaspay: "Secure payment via SoleasPay • SSL Encrypted",
    complete_info_to_pay: "Complete required info to proceed with payment",
    required_fields: "Required:",
    cat_card: "Card Issue",
    cat_payment: "Online Payment",
    cat_balance: "Account Balance",
    cat_transaction: "Disputed Transaction",
    cat_funding: "Mobile Money Deposit or Withdrawal",
    cat_transfer: "Fund Transfer",
    cat_shop: "Shop Order (Games, subs)",
    cat_security: "Security & Account",
    cat_other: "Other Inquiry",
  },
};

const LANG_KEY = "novapaid_lang";

let currentLanguage: Language = "fr";
const listeners = new Set<() => void>();

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {}
  return "fr";
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_KEY, lang);
      document.documentElement.lang = lang;
    }
  } catch {}
  listeners.forEach(fn => fn());
}

export function useLanguage() {
  const [lang, setLang] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    const handleUpdate = () => setLang(currentLanguage);
    listeners.add(handleUpdate);
    setLang(getInitialLanguage());
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const t = (key: keyof typeof DICTIONARY["fr"], fallback?: string): string => {
    const dict = DICTIONARY[lang] || DICTIONARY.fr;
    return dict[key] || fallback || DICTIONARY.fr[key] || String(key);
  };

  return {
    language: lang,
    setLanguage,
    t,
  };
}

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`np-lang-selector ${className}`} role="group" aria-label="Choisir la langue">
      <button
        type="button"
        className={`np-lang-btn ${language === "fr" ? "is-active" : ""}`}
        onClick={() => setLanguage("fr")}
        title="Passer en français"
        aria-pressed={language === "fr"}
      >
        FR
      </button>
      <span className="np-lang-divider">|</span>
      <button
        type="button"
        className={`np-lang-btn ${language === "en" ? "is-active" : ""}`}
        onClick={() => setLanguage("en")}
        title="Switch to English"
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}
