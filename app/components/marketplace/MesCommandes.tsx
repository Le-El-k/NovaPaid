"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, Check, ChevronRight, Clock, Loader2, MessageSquare,
  Package, RefreshCw, Send, X,
} from "lucide-react";

export function MesCommandes() {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace?section=mes_commandes");
      const data = await res.json();
      if (data.success) setCommandes(data.commandes);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const openDetail = async (cmd: any) => {
    setSelected(cmd);
    setLoadingDetail(true);
    setNewComment("");
    try {
      const res = await fetch(`/api/marketplace?section=commande&id=${cmd.id}`);
      const data = await res.json();
      if (data.success) setDetail(data.commande);
    } catch (e) { console.error(e); }
    setLoadingDetail(false);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_comment", commande_id: selected.id, content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewComment("");
        openDetail(selected);
        notify("Message envoyé");
      }
    } catch { notify("Erreur d'envoi"); }
    setSending(false);
  };

  const fmtPrice = (price: number) => `${Math.round(price).toLocaleString("fr-FR")} FCFA`;

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "#f59e0b" },
    paid: { label: "Payée", color: "#3b82f6" },
    processing: { label: "En traitement", color: "#8b5cf6" },
    delivered: { label: "Livrée", color: "#10b981" },
    completed: { label: "Terminée", color: "#00d4aa" },
    refunded: { label: "Remboursée", color: "#ef4444" },
    cancelled: { label: "Annulée", color: "#6b7280" },
  };

  if (selected && detail) {
    const st = statusMap[detail.status] || statusMap.pending;
    return (
      <div className="np-mes-commandes">
        {notification && <div className="np-marketplace-toast">{notification}</div>}
        <button type="button" className="np-marketplace-back" onClick={() => { setSelected(null); setDetail(null); }}>
          <ArrowLeft size={16} /> Retour à mes commandes
        </button>

        <div className="np-commande-detail">
          <div className="np-commande-detail-header">
            <div>
              <h3>{detail.article_title_snapshot || detail.article_title_live || "Article"}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
                <span style={{ fontSize: 11, opacity: 0.4 }}>#{detail.id}</span>
              </div>
            </div>
            {detail.article_image && (
              <img src={detail.article_image} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
            )}
          </div>

          <div className="np-commande-detail-grid">
            <div><small>Quantité</small><strong>{detail.quantity}</strong></div>
            <div><small>Prix unitaire</small><strong>{fmtPrice(detail.unit_price)}</strong></div>
            <div><small>Total</small><strong>{fmtPrice(detail.unit_price * detail.quantity)}</strong></div>
            <div><small>Paiement</small><strong>{detail.payment_method || "—"}</strong></div>
            <div><small>Date</small><strong>{new Date(detail.created_at).toLocaleDateString("fr-FR")}</strong></div>
            {detail.response && <div style={{ gridColumn: "span 2" }}><small>Réponse</small><p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{detail.response}</p></div>}
          </div>

          {detail.fieldValues && detail.fieldValues.length > 0 && (
            <div className="np-commande-detail-fields">
              <h4>Informations fournies</h4>
              {detail.fieldValues.map((fv: any) => (
                <div key={fv.id} className="np-commande-field-row">
                  <span>{fv.field_label || fv.field_name}</span>
                  <span>{fv.field_value || "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="np-commande-chat">
            <h4><MessageSquare size={14} /> Discussion</h4>
            <div className="np-commande-chat-messages">
              {(!detail.comments || detail.comments.length === 0) && (
                <p style={{ opacity: 0.4, fontSize: 12, textAlign: "center", padding: 16 }}>Aucun message. Posez une question sur votre commande.</p>
              )}
              {detail.comments?.map((c: any) => (
                <div key={c.id} className="np-commande-chat-msg">
                  <strong>{c.user_name || "Anonyme"}</strong>
                  <p>{c.content}</p>
                  <small>{new Date(c.created_at).toLocaleString("fr-FR")}</small>
                </div>
              ))}
            </div>
            <div className="np-commande-chat-input">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendComment()}
                placeholder="Écrire un message..." className="np-text-input" />
              <button type="button" className="np-primary-button" onClick={handleSendComment} disabled={sending || !newComment.trim()}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="np-mes-commandes">
      {notification && <div className="np-marketplace-toast">{notification}</div>}

      <div className="np-marketplace-header">
        <h2>Mes Commandes</h2>
        <button type="button" className="np-admin-fees-refresh" onClick={refresh}><RefreshCw size={14} /></button>
      </div>

      {loading ? (
        <div className="np-marketplace-loading"><Loader2 size={20} className="animate-spin" /> Chargement...</div>
      ) : commandes.length === 0 ? (
        <div className="np-marketplace-empty">
          <Package size={32} />
          <p>Vous n'avez pas encore de commande.</p>
        </div>
      ) : (
        <div className="np-commandes-list">
          {commandes.map((cmd: any) => {
            const st = statusMap[cmd.status] || statusMap.pending;
            return (
              <button key={cmd.id} type="button" className="np-commande-row" onClick={() => openDetail(cmd)}>
                {cmd.article_image && (
                  <img src={cmd.article_image} alt="" className="np-commande-row-img" />
                )}
                <div className="np-commande-row-info">
                  <strong>{cmd.article_title_snapshot || "Article #" + cmd.article_id}</strong>
                  <span style={{ fontSize: 11, opacity: 0.4 }}>{new Date(cmd.created_at).toLocaleDateString("fr-FR")} · Qté: {cmd.quantity}</span>
                </div>
                <div className="np-commande-row-right">
                  <span className="np-marketplace-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
                  <span className="np-commande-row-price">{fmtPrice(cmd.unit_price * cmd.quantity)}</span>
                </div>
                <ChevronRight size={16} style={{ opacity: 0.3 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
