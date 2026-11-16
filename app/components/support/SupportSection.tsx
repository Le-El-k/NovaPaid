"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Headphones,
  Info,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/app/lib/i18n";

interface SupportSectionProps {
  initialTxRef?: string;
}

const OFFICIAL_EMAIL = "novapaid@novapaid.net";
const OFFICIAL_WHATSAPP_NUMBER = "+237 657887403";
const OFFICIAL_WHATSAPP_URL = "https://wa.me/237657887403";

export function SupportSection({ initialTxRef = "" }: SupportSectionProps) {
  const { t, language } = useLanguage();

  // User Profile prefill
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);

  // Form State
  const [ticketCategory, setTicketCategory] = useState("card");
  const [transactionRef, setTransactionRef] = useState(initialTxRef);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicketRef, setSubmittedTicketRef] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ticketError, setTicketError] = useState("");

  // Tickets List State
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  // Client Reply to Ticket State
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<string | null>(null);

  // FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Load Profile to prefill form
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setUserProfile({ name: data.profile.name || "", email: data.profile.email || "" });
        }
      })
      .catch(() => {});
  }, []);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      }
    } catch {
      // Keep silent on background load
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || isSending) return;
    setTicketError("");
    setIsSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: ticketCategory, transactionRef, subject, message }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || (language === "en" ? "Failed to submit request." : "Envoi de la réclamation impossible."));
      }
      setSubmittedTicketRef(data.publicRef || data.ticket?.publicRef || "TICK-" + Date.now().toString().slice(-6));
      setIsSubmitted(true);
      setSubject("");
      setMessage("");
      setTransactionRef("");
      loadTickets();
    } catch (error: any) {
      setTicketError(error?.message || (language === "en" ? "Connection error." : "Erreur de connexion."));
    } finally {
      setIsSending(false);
    }
  };

  const handleClientReply = async (ticketId: number) => {
    if (!replyMessage.trim() || isReplying) return;
    setIsReplying(true);
    setReplyFeedback(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", ticketId, message: replyMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || (language === "en" ? "Could not send reply." : "Impossible d'envoyer la réponse."));
      }
      setReplyMessage("");
      setReplyFeedback(language === "en" ? "Your reply has been sent." : "Votre réponse a été transmise au support.");
      await loadTickets();
    } catch (err: any) {
      setReplyFeedback(err?.message || (language === "en" ? "Error sending reply." : "Erreur lors de l'envoi."));
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return { label: t("in_progress"), className: "is-progress" };
      case "waiting_client":
        return { label: t("waiting_client"), className: "is-waiting" };
      case "resolved":
        return { label: t("resolved"), className: "is-resolved" };
      case "closed":
        return { label: t("closed"), className: "is-closed" };
      default:
        return { label: t("ticket_new"), className: "is-new" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { label: t("priority_urgent"), className: "is-urgent" };
      case "high":
        return { label: t("priority_high"), className: "is-high" };
      case "low":
        return { label: t("priority_low"), className: "is-low" };
      default:
        return { label: t("priority_normal"), className: "is-normal" };
    }
  };

  const faqItems = [
    {
      q: language === "en" ? "How do I use my virtual card for online purchases?" : "Comment utiliser ma carte virtuelle NovaPaid pour mes achats en ligne ?",
      a: language === "en" ? "Open the Cards section to view your card details. Your card is ready for 3D Secure online transactions on all supported merchant sites." : "Consultez l'espace Cartes pour afficher vos informations. Votre carte est compatible 3D Secure pour tous vos achats sur les sites marchands autorisés."
    },
    {
      q: language === "en" ? "How does freezing and unfreezing a card work?" : "Comment fonctionne le gel et dégel temporaire d'une carte ?",
      a: language === "en" ? "In the Cards section, click 'Freeze Card' to instantly block all transactions. You can unfreeze it at any time with a single click." : "Dans l'espace Cartes, cliquez sur 'Geler ma carte' pour suspendre immédiatement les débits. Vous pouvez la réactiver instantanément d'un simple clic."
    },
    {
      q: language === "en" ? "What is the maximum limit of cards per account?" : "Quelle est la limite maximale de cartes par compte ?",
      a: language === "en" ? "You can possess a maximum of 3 cards (active or frozen). Freezing a card does not free up a slot." : "Chaque compte utilisateur peut détenir un maximum strict de 3 cartes virtuelles (actives ou gelées). Le gel d'une carte ne libère pas de place."
    },
    {
      q: language === "en" ? "How long does a Mobile Money deposit or withdrawal take?" : "Combien de temps prend un rechargement ou retrait Mobile Money ?",
      a: language === "en" ? "Transactions via Orange Money and MTN Mobile Money are processed automatically and credited once confirmed by our financial network." : "Les opérations Orange Money et MTN Mobile Money sont traitées automatiquement et créditées dès confirmation par notre réseau partenaire."
    },
    {
      q: language === "en" ? "How are support requests tracked?" : "Comment sont traitées les réclamations et demandes de support ?",
      a: language === "en" ? "Submitting a ticket generates a unique ticket ID. Our team investigates and replies directly in your account tracking space." : "Toute réclamation génère un numéro de ticket officiel. Notre équipe dédiée vous répond directement dans votre espace de suivi."
    }
  ];

  return (
    <div className="np-support-view-container">
      {/* En-tête officiel de l'assistance */}
      <div className="np-support-hero-banner">
        <div>
          <span className="np-overline">{t("support_channels")}</span>
          <h1 className="np-support-hero-title">{t("customer_support")}</h1>
          <p className="np-support-hero-desc">
            {language === "en"
              ? "Need help? Submit your request via our support form for ticket tracking, or reach us directly on WhatsApp."
              : "Besoin d’aide ? Envoyez votre demande via notre formulaire de support pour bénéficier d’un suivi avec un numéro de ticket. Vous pouvez également nous contacter directement sur WhatsApp."}
          </p>
        </div>
      </div>

      {/* Cartes de contact officielles : WhatsApp, E-mail, Urgence */}
      <section className="np-support-channels-grid">
        {/* OPTION B : WhatsApp Direct */}
        <div className="np-channel-card whatsapp">
          <div className="np-channel-icon whatsapp">
            <MessageCircle size={24} />
          </div>
          <div className="np-channel-content">
            <span className="np-badge live">{t("support_option_b_title")}</span>
            <h3>WhatsApp : {OFFICIAL_WHATSAPP_NUMBER}</h3>
            <p>{t("support_option_b_desc")}</p>
            <small className="np-channel-subnote">{t("support_option_b_notice")}</small>
            <a
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="np-channel-link"
            >
              <span>{t("contact_whatsapp")}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* E-mail officiel */}
        <div className="np-channel-card email">
          <div className="np-channel-icon email">
            <Mail size={24} />
          </div>
          <div className="np-channel-content">
            <span className="np-badge default">{t("support_email_title")}</span>
            <h3>{OFFICIAL_EMAIL}</h3>
            <p>
              {language === "en"
                ? "Official email for administrative inquiries and formal correspondence."
                : "Adresse officielle pour vos démarches administratives et questions formelles."}
            </p>
            <a href={"mailto:" + OFFICIAL_EMAIL} className="np-channel-link">
              <span>{t("support_email_btn")}</span>
              <ChevronRight size={15} />
            </a>
          </div>
        </div>

        {/* Urgence Sécurité Cartes */}
        <div className="np-channel-card emergency">
          <div className="np-channel-icon emergency">
            <ShieldAlert size={24} />
          </div>
          <div className="np-channel-content">
            <span className="np-badge danger">{language === "en" ? "Security Action" : "Urgence Sécurité"}</span>
            <h3>{language === "en" ? "Freeze My Card" : "Geler ma carte"}</h3>
            <p>
              {language === "en"
                ? "Suspect unauthorized activity? Freeze your card in one click from your account."
                : "Activité suspecte ? Gelez instantanément votre carte en un clic depuis votre espace."}
            </p>
            <a href="/cards" className="np-channel-link np-text-danger">
              <span>{t("my_cards")}</span>
              <ChevronRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* Grille Principale : Option A (Formulaire de réclamation) + Mes Réclamations */}
      <div className="np-support-main-grid">
        {/* OPTION A : FORMULAIRE DE RÉCLAMATION OFFICIEL */}
        <section className="np-panel np-support-form-panel">
          <div className="np-panel-heading">
            <div>
              <span className="np-overline">{t("support_option_a_title")}</span>
              <h2>{t("new_support_request")}</h2>
              <p className="np-form-hint" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>{t("support_option_a_desc")}</p>
            </div>
            <Headphones size={22} className="np-icon-accent" />
          </div>

          {isSubmitted ? (
            <div className="np-ticket-success">
              <span className="np-receipt-icon success">
                <CheckCircle2 size={40} className="np-icon-success" />
              </span>
              <h3>{t("ticket_created_success")}</h3>
              <p>
                {language === "en"
                  ? "Your request has been securely recorded. Our team will review it and reply in your account."
                  : "Votre demande a été enregistrée avec succès. Notre équipe va l'examiner et vous répondre directement dans votre espace."}
              </p>
              <div className="np-ticket-meta">
                <span>{t("ticket_number")} :</span>
                <strong>{submittedTicketRef}</strong>
              </div>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  type="button"
                  className="np-outline-button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmittedTicketRef("");
                  }}
                >
                  {language === "en" ? "Submit another request" : "Ouvrir une autre réclamation"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="np-ticket-form">
              {/* Informations préremplies du compte */}
              {userProfile && (
                <div className="np-form-readonly-row">
                  <div className="np-readonly-field">
                    <small>{t("full_name")}</small>
                    <strong>{userProfile.name}</strong>
                  </div>
                  <div className="np-readonly-field">
                    <small>{t("email_address")}</small>
                    <strong>{userProfile.email}</strong>
                  </div>
                </div>
              )}

              {/* Catégorie */}
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="ticket-category">
                  {t("ticket_category")}
                </label>
                <select
                  id="ticket-category"
                  className="np-text-input"
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                >
                  <option value="card">{t("cat_card")}</option>
                  <option value="payment">{t("cat_payment")}</option>
                  <option value="balance">{t("cat_balance")}</option>
                  <option value="transaction">{t("cat_transaction")}</option>
                  <option value="funding">{t("cat_funding")}</option>
                  <option value="transfer">{t("cat_transfer")}</option>
                  <option value="shop">{t("cat_shop")}</option>
                  <option value="security">{t("cat_security")}</option>
                  <option value="other">{t("cat_other")}</option>
                </select>
              </div>

              {/* Référence optionnelle */}
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="ticket-ref">
                  {t("ticket_ref")}
                </label>
                <input
                  id="ticket-ref"
                  type="text"
                  className="np-text-input"
                  placeholder="Ex : TRF-20261024-001 / CARTE-4532"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>

              {/* Objet */}
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="ticket-subject">
                  {t("ticket_subject")}
                </label>
                <input
                  id="ticket-subject"
                  type="text"
                  className="np-text-input"
                  placeholder={language === "en" ? "E.g.: Question regarding card payment" : "Ex : Question concernant le paiement par carte"}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Description détaillée */}
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="ticket-message">
                  {t("ticket_message")}
                </label>
                <textarea
                  id="ticket-message"
                  className="np-text-input textarea"
                  rows={4}
                  placeholder={
                    language === "en"
                      ? "Explain the problem in detail. Never include your PIN, CVV, or full card number."
                      : "Décrivez précisément votre problème. N'indiquez jamais votre code secret, CVV ou mot de passe."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {ticketError && <p role="alert" className="np-msg-error" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{ticketError}</p>}

              <button type="submit" className="np-primary-button np-submit-btn" disabled={isSending}>
                {isSending ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                <span>{isSending ? t("loading") : t("submit_request")}</span>
              </button>
            </form>
          )}
        </section>

        {/* SUIVI PERSONNEL DES RÉCLAMATIONS (MES DEMANDES & CONVERSATION) */}
        <section className="np-panel np-support-tickets-panel">
          <div className="np-panel-heading">
            <div>
              <span className="np-overline">{t("my_account")}</span>
              <h2>{t("my_support_requests")} ({tickets.length})</h2>
            </div>
            <button
              type="button"
              className="np-icon-btn-sm"
              onClick={loadTickets}
              title={language === "en" ? "Refresh list" : "Actualiser la liste"}
            >
              <RefreshCw size={14} className={ticketsLoading ? "spin" : ""} />
            </button>
          </div>

          <div className="np-tickets-list-wrap">
            {ticketsLoading ? (
              <div className="np-tickets-empty">
                <RefreshCw size={18} className="spin np-icon-accent" style={{ marginBottom: "0.5rem" }} />
                <p>{t("loading")}</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="np-tickets-empty">
                <MessageSquare size={28} className="np-icon-muted" style={{ marginBottom: "0.5rem" }} />
                <p>{t("no_tickets")}</p>
              </div>
            ) : (
              <div className="np-tickets-accordion">
                {tickets.map((ticket) => {
                  const isExpanded = expandedTicketId === ticket.id;
                  const statusInfo = getStatusBadge(ticket.status);
                  const priorityInfo = getPriorityBadge(ticket.priority);

                  return (
                    <article key={ticket.id} className={"np-ticket-item " + (isExpanded ? "is-expanded" : "")}>
                      <header
                        className="np-ticket-item-header"
                        onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                      >
                        <div className="np-ticket-item-title-block">
                          <div className="flex items-center gap-2">
                            <code>{ticket.publicRef}</code>
                            <span className={"np-status-tag " + statusInfo.className}>
                              {statusInfo.label}
                            </span>
                            <span className={"np-priority-tag " + priorityInfo.className}>
                              {priorityInfo.label}
                            </span>
                          </div>
                          <strong>{ticket.subject}</strong>
                          <small>
                            {new Date(ticket.createdAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {ticket.transactionRef ? " · Réf : " + ticket.transactionRef : ""}
                          </small>
                        </div>
                        <div className="np-ticket-expand-icon">
                          <ChevronDown size={17} className={"transition-transform " + (isExpanded ? "rotate-180" : "")} />
                        </div>
                      </header>

                      {/* Conversation thread when expanded */}
                      {isExpanded && (
                        <div className="np-ticket-conversation-body">
                          {/* Résumé de résolution si résolu */}
                          {ticket.resolution && (
                            <div className="np-ticket-resolution-banner">
                              <CheckCircle2 size={16} className="np-icon-success" style={{ flexShrink: 0 }} />
                              <div>
                                <strong>{language === "en" ? "Resolution Note :" : "Note de résolution :"}</strong>
                                <p>{ticket.resolution}</p>
                              </div>
                            </div>
                          )}

                          {/* Message initial */}
                          <div className="np-conversation-thread">
                            <div className="np-msg-bubble is-client">
                              <div className="np-msg-meta">
                                <span className="np-msg-sender">{userProfile?.name || (language === "en" ? "You" : "Vous")}</span>
                                <span className="np-msg-time">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <p className="np-msg-text">{ticket.message}</p>
                            </div>

                            {/* Échanges additionnels */}
                            {Array.isArray(ticket.messages) &&
                              ticket.messages.map((m: any) => {
                                const isAdmin = m.senderType === "admin";
                                return (
                                  <div key={m.id} className={"np-msg-bubble " + (isAdmin ? "is-admin" : "is-client")}>
                                    <div className="np-msg-meta">
                                      <span className="np-msg-sender">
                                        {isAdmin ? (
                                          <span className="np-support-admin-name">
                                            <ShieldCheck size={13} /> {m.senderName || "Support NovaPaid"}
                                          </span>
                                        ) : (
                                          m.senderName || (language === "en" ? "You" : "Vous")
                                        )}
                                      </span>
                                      <span className="np-msg-time">
                                        {new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) +
                                          " " +
                                          new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <p className="np-msg-text">{m.message}</p>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Répondre au ticket si pas clôturé */}
                          {ticket.status !== "closed" ? (
                            <div className="np-ticket-reply-box">
                              <textarea
                                className="np-text-input textarea"
                                rows={2}
                                placeholder={t("reply_placeholder")}
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                              />
                              <div className="flex justify-between items-center mt-2">
                                {replyFeedback && <span className="np-reply-feedback">{replyFeedback}</span>}
                                <button
                                  type="button"
                                  className="np-primary-button np-btn-sm ml-auto"
                                  onClick={() => handleClientReply(ticket.id)}
                                  disabled={isReplying || !replyMessage.trim()}
                                >
                                  {isReplying ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                                  <span>{t("reply_btn")}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="np-ticket-closed-notice">
                              <Lock size={13} /> {language === "en" ? "This ticket is closed." : "Ce ticket est clôturé."}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section FAQ intégrée */}
          <div className="np-faq-accordion np-faq-section">
            <h3 className="np-faq-heading">Foire aux questions (FAQ)</h3>
            {faqItems.map((item, idx) => (
              <div key={idx} className={"np-faq-accordion-item " + (activeFaq === idx ? "open" : "")}>
                <button
                  type="button"
                  className="np-faq-accordion-header"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <span className="np-faq-question">{item.q}</span>
                  <ChevronDown size={15} className={"np-faq-chevron " + (activeFaq === idx ? "open" : "")} />
                </button>
                {activeFaq === idx && <div className="np-faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
