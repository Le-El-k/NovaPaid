"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Pin, Smile, Paperclip, CheckCheck, User, ShieldCheck } from "lucide-react";

const REACTIONS = ["👍", "❤️", "😂", "🎉"];

export function SupportChat({ ticketId }: { ticketId: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showReactions, setShowReactions] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/support?ticket_id=${ticketId}`);
      const j = await res.json();
      if (j.success) setMessages(j.messages || []);
    } catch {}
  };

  useEffect(() => { fetchMessages(); const iv = setInterval(fetchMessages, 10000); return () => clearInterval(iv); }, [ticketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", ticket_id: ticketId, content: input.trim() }),
      });
      setInput("");
      fetchMessages();
    } catch {}
    finally { setSending(false); }
  };

  const react = async (messageId: number, emoji: string) => {
    setShowReactions(null);
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", message_id: messageId, emoji }),
      });
      fetchMessages();
    } catch {}
  };

  const togglePin = async (messageId: number) => {
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin_message", message_id: messageId }),
      });
      fetchMessages();
    } catch {}
  };

  const formatTime = (d: string) => {
    if (!d) return "";
    try {
      return new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      return new Date(d.replace(" ", "T") + (d.includes("Z") ? "" : "Z")).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    } catch { return d; }
  };

  return (
    <div className="np-support-chat">
      <div className="np-support-chat-messages">
        {messages.length === 0 && <p className="np-support-chat-empty">Aucun message. Démarrez la conversation.</p>}
        {messages.map((msg: any, i: number) => {
          const prevDate = i > 0 ? formatDate(messages[i - 1].created_at) : null;
          const curDate = formatDate(msg.created_at);
          const showDateSep = curDate !== prevDate;
          const isUser = msg.sender_type === "user";
          const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};

          return (
            <div key={msg.id}>
              {showDateSep && <div className="np-support-chat-date-sep">{curDate}</div>}
              <div className={`np-support-chat-msg ${isUser ? "outgoing" : "incoming"}`}>
                <div className="np-support-chat-msg-avatar">
                  {isUser ? <User size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div className="np-support-chat-msg-body">
                  <div className="np-support-chat-msg-header">
                    <span className={`np-support-chat-sender ${isUser ? "" : "admin"}`}>{isUser ? "Vous" : "Support"}</span>
                    <span className="np-support-chat-time">{formatTime(msg.created_at)}</span>
                    {msg.is_pinned ? <Pin size={10} className="np-support-chat-pinned" /> : null}
                  </div>
                  <div className="np-support-chat-msg-content">
                    {msg.content}
                    {msg.attachment_url && (
                      <div className="np-support-chat-attachment">
                        <Paperclip size={12} /> {msg.attachment_name || "Pièce jointe"}
                      </div>
                    )}
                  </div>
                  {Object.keys(reactions).length > 0 && (
                    <div className="np-support-chat-reactions">
                      {Object.entries(reactions).map(([emoji, users]: any) => (
                        <span key={emoji} className="np-support-chat-reaction" onClick={() => react(msg.id, emoji)}>
                          {emoji} {users.length}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="np-support-chat-msg-actions">
                    <button onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)} title="Réagir"><Smile size={12} /></button>
                    <button onClick={() => togglePin(msg.id)} title={msg.is_pinned ? "Désépingler" : "Épingler"}><Pin size={12} /></button>
                    {msg.read_at && <CheckCheck size={12} className="np-support-chat-read" />}
                  </div>
                  {showReactions === msg.id && (
                    <div className="np-support-chat-reaction-picker">
                      {REACTIONS.map(e => <button key={e} onClick={() => react(msg.id, e)}>{e}</button>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="np-support-chat-input">
        <input className="np-text-input" placeholder="Votre message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
        <button className="np-primary-button" disabled={sending || !input.trim()} onClick={sendMessage}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
