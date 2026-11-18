"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft, Bot, CheckCircle2, ChevronRight, ExternalLink, Headset, Info,
  Loader2, MessageCircle, Search, Send, Sparkles, X,
} from "lucide-react";
import { getAssetPath } from "@/app/lib/asset-path";

type View = "home" | "answers" | "article" | "announcements" | "contact" | "sent";

type HelpArticle = { id: number; category: string; title: string; slug: string; content: string; excerpt?: string };
type Ad = { id: number; title: string; description?: string; link_url?: string; image_url?: string; created_at?: string };

// Paths where the floating widget should not appear.
function isHiddenPath(path: string): boolean {
  return (
    path === "/" ||
    /^\/(login|register|forgot-password|reset-password|verify-code|verify-email|admin|portal-prive-gestion)(\/|$)/.test(path)
  );
}

export function SupportWidget() {
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");

  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [article, setArticle] = useState<HelpArticle | null>(null);

  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoaded, setAdsLoaded] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contactError, setContactError] = useState("");

  const homeInputRef = useRef<HTMLInputElement>(null);

  // Only mount for authenticated users, and not on auth/landing/admin pages.
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && isHiddenPath(window.location.pathname)) return;
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.user) { setAllowed(true); setUserName(String(d.user.name || "")); }
      })
      .catch(() => {});
  }, []);

  const loadArticles = useCallback(async () => {
    if (articlesLoaded) return;
    try {
      const d = await fetch("/api/help", { cache: "no-store" }).then((r) => r.json());
      if (d?.success) setArticles(Array.isArray(d.articles) ? d.articles : []);
    } catch { /* ignore */ }
    finally { setArticlesLoaded(true); }
  }, [articlesLoaded]);

  const loadAds = useCallback(async () => {
    if (adsLoaded) return;
    try {
      const d = await fetch("/api/ads", { cache: "no-store" }).then((r) => r.json());
      if (d?.success) setAds(Array.isArray(d.ads) ? d.ads : []);
    } catch { /* ignore */ }
    finally { setAdsLoaded(true); }
  }, [adsLoaded]);

  const goAnswers = () => { setView("answers"); setActiveCategory(null); setQuery(""); void loadArticles(); };
  const goAnnouncements = () => { setView("announcements"); void loadAds(); };
  const goContact = () => { setView("contact"); setContactError(""); };

  const submitTicket = async () => {
    if (message.trim().length < 10) { setContactError("Décrivez votre demande (au moins 10 caractères)."); return; }
    setSending(true);
    setContactError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "other", subject: subject.trim(), message: message.trim() }),
      });
      const d = await res.json();
      if (!res.ok || !d?.success) throw new Error(d?.error || "Envoi impossible.");
      setSubject(""); setMessage("");
      setView("sent");
    } catch (e: any) {
      setContactError(e?.message || "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (!mounted || !allowed) return null;

  const firstName = (userName || "").trim().split(/\s+/)[0] || "";
  const categories = [...new Set(articles.map((a) => a.category))];
  const filtered = articles.filter((a) => {
    const q = query.trim().toLowerCase();
    if (activeCategory && a.category !== activeCategory) return false;
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || (a.excerpt || "").toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
  });

  const Header = ({ title, subtitle, icon, onBack, logo }: { title: string; subtitle: string; icon?: React.ReactNode; onBack?: () => void; logo?: boolean }) => (
    <div className="np-sw-header">
      {onBack ? (
        <button type="button" className="np-sw-back" onClick={onBack} aria-label="Retour"><ArrowLeft size={18} /></button>
      ) : null}
      <span className="np-sw-header-icon">
        {logo ? <Image src={getAssetPath("/novapaid-logo-96.png")} alt="" width={30} height={30} /> : icon}
      </span>
      <div className="np-sw-header-titles">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <button type="button" className="np-sw-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button>
    </div>
  );

  return (
    <>
      {open && (
        <div className="np-sw-panel" role="dialog" aria-label="Centre d'aide NovaPaid">
          {view === "home" && (
            <>
              <Header title="NovaPaid" subtitle="Centre d'aide ou conseiller" logo />
              <div className="np-sw-body np-sw-home">
                <div className="np-sw-greeting">
                  <h2>Bonjour {firstName} <span aria-hidden>👋</span></h2>
                  <p>Notre équipe est là pour vous aider !</p>
                </div>
                <button type="button" className="np-sw-cta-primary" onClick={goAnswers}>
                  <span className="np-sw-cta-icon"><Search size={18} /></span>
                  <span className="np-sw-cta-text"><strong>Trouver une réponse</strong><small>Guides et informations à jour · disponible 24/7</small></span>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className="np-sw-cta" onClick={goAnnouncements}>
                  <span className="np-sw-cta-icon is-ann"><Sparkles size={17} /></span>
                  <span className="np-sw-cta-text"><strong>NovaPaid — Annonces</strong></span>
                  <ChevronRight size={17} />
                </button>
                <button type="button" className="np-sw-cta" onClick={goContact}>
                  <span className="np-sw-cta-icon is-contact"><Headset size={17} /></span>
                  <span className="np-sw-cta-text"><strong>Contacter un conseiller</strong></span>
                  <ChevronRight size={17} />
                </button>
              </div>
              <form className="np-sw-home-input" onClick={goContact} onSubmit={(e) => { e.preventDefault(); goContact(); }}>
                <input ref={homeInputRef} type="text" placeholder="Envoyer un message…" readOnly value="" aria-label="Envoyer un message" />
                <button type="submit" aria-label="Écrire"><Send size={16} /></button>
              </form>
            </>
          )}

          {view === "answers" && (
            <>
              <Header title="Assistant d'aide" subtitle="Guides et informations à jour" icon={<Bot size={18} />} onBack={() => setView("home")} />
              <div className="np-sw-subhead">
                <Bot size={16} /><div><strong>Réponses vérifiées</strong><small>{articles.length} guides et informations à jour de votre compte</small></div>
              </div>
              <div className="np-sw-body">
                <div className="np-sw-bot-bubble">Bonjour ! Posez-moi votre question. Je rechercherai la réponse dans les guides officiels et les informations à jour de votre compte.</div>
                {categories.length > 0 && (
                  <div className="np-sw-chips">
                    {categories.map((c) => (
                      <button key={c} type="button" className={`np-sw-chip${activeCategory === c ? " is-active" : ""}`} onClick={() => setActiveCategory(activeCategory === c ? null : c)}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                {!articlesLoaded ? (
                  <div className="np-sw-state"><Loader2 size={18} className="animate-spin" /> Chargement…</div>
                ) : filtered.length === 0 ? (
                  <div className="np-sw-state"><Info size={18} /> Aucune réponse trouvée.</div>
                ) : (
                  <ul className="np-sw-article-list">
                    {filtered.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => { setArticle(a); setView("article"); }}>
                          <span><strong>{a.title}</strong>{a.excerpt && <small>{a.excerpt}</small>}</span>
                          <ChevronRight size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <form className="np-sw-home-input" onSubmit={(e) => e.preventDefault()}>
                <input type="text" placeholder="Posez votre question…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher" />
                <button type="submit" aria-label="Rechercher"><Search size={16} /></button>
              </form>
            </>
          )}

          {view === "article" && article && (
            <>
              <Header title={article.title} subtitle={article.category} icon={<Bot size={18} />} onBack={() => setView("answers")} />
              <div className="np-sw-body"><div className="np-sw-article-content">{article.content}</div></div>
            </>
          )}

          {view === "announcements" && (
            <>
              <Header title="NovaPaid — Annonces" subtitle="Nouveautés et informations" icon={<Sparkles size={18} />} onBack={() => setView("home")} />
              <div className="np-sw-body">
                {!adsLoaded ? (
                  <div className="np-sw-state"><Loader2 size={18} className="animate-spin" /> Chargement…</div>
                ) : ads.length === 0 ? (
                  <div className="np-sw-state"><Sparkles size={18} /> Aucune annonce pour le moment.</div>
                ) : (
                  <div className="np-sw-ann-list">
                    {ads.map((ad) => (
                      <article className="np-sw-ann" key={ad.id}>
                        <div className="np-sw-ann-head"><strong>NovaPaid™</strong>{ad.created_at && <span>{new Date(ad.created_at.replace(" ", "T") + "Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}</div>
                        <h4>{ad.title}</h4>
                        {ad.image_url && <img src={getAssetPath(ad.image_url)} alt="" className="np-sw-ann-img" loading="lazy" />}
                        {ad.description && <p>{ad.description}</p>}
                        {ad.link_url && <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="np-sw-ann-link">En savoir plus <ExternalLink size={13} /></a>}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {view === "contact" && (
            <>
              <Header title="NovaPaid" subtitle="Nouvelle conversation" logo onBack={() => setView("home")} />
              <div className="np-sw-body">
                <p className="np-sw-contact-intro">Décrivez votre demande et notre équipe vous répondra rapidement.</p>
                {contactError && <div className="np-sw-error"><Info size={15} /> {contactError}</div>}
                <label className="np-sw-label">Sujet (optionnel)</label>
                <input className="np-sw-input" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex : Problème de rechargement…" maxLength={120} />
                <label className="np-sw-label">Message <span className="np-sw-req">*</span></label>
                <textarea className="np-sw-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tapez votre message…" rows={5} maxLength={2000} />
                <button type="button" className="np-sw-send-btn" onClick={submitTicket} disabled={sending || message.trim().length < 10}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer le message
                </button>
              </div>
            </>
          )}

          {view === "sent" && (
            <>
              <Header title="NovaPaid" subtitle="Demande envoyée" logo onBack={() => setView("home")} />
              <div className="np-sw-body np-sw-sent">
                <div className="np-sw-sent-icon"><CheckCircle2 size={34} /></div>
                <h3>Message envoyé</h3>
                <p>Notre équipe vous répondra rapidement. Vous recevrez une notification et retrouverez l'échange dans votre espace Support.</p>
                <button type="button" className="np-sw-send-btn" onClick={() => setView("home")}>Retour à l'accueil</button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className={`np-sw-fab${open ? " is-open" : ""}`}
        onClick={() => { setOpen((o) => !o); if (!open) setView("home"); }}
        aria-label={open ? "Fermer le support" : "Ouvrir le support"}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}

export default SupportWidget;
