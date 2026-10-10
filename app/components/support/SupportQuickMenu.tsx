"use client";

import { ChevronRight, Coins, CreditCard, Headphones } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playTap } from "@/app/lib/sound";
import { buildSupportWhatsAppHref, SUPPORT_WHATSAPP_CONTACTS } from "@/app/lib/support-whatsapp";

type SupportLanguage = "fr" | "en";

const copy = {
  fr: {
    label: "Ouvrir le support",
    tiktok: "Support TikTok",
    cards: "Support cartes Visa",
    tiktokMessage: "Salut Nova Paid, j'ai besoin d'assistance pour mes pièces TikTok.",
    cardsMessage: "Salut Nova Paid, j'ai besoin d'assistance pour une carte Visa.",
  },
  en: {
    label: "Open support",
    tiktok: "TikTok support",
    cards: "Visa card support",
    tiktokMessage: "Hi Nova Paid, I need help with my TikTok coins.",
    cardsMessage: "Hi Nova Paid, I need help with a Visa card.",
  },
} as const;

export function SupportQuickMenu({ language }: { language: SupportLanguage }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const t = copy[language];
  const contact = SUPPORT_WHATSAPP_CONTACTS[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="support-float-wrap" ref={wrapperRef}>
      {open && (
        <div className="support-quick-menu" role="menu" aria-label={t.label}>
          <a
            href={buildSupportWhatsAppHref(contact.whatsappNumber, t.tiktokMessage)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className="support-quick-action"
            onClick={() => setOpen(false)}
          >
            <span className="support-quick-action-icon"><Coins size={17} /></span>
            <span>{t.tiktok}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </a>
          <a
            href={buildSupportWhatsAppHref(contact.whatsappNumber, t.cardsMessage)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className="support-quick-action"
            onClick={() => setOpen(false)}
          >
            <span className="support-quick-action-icon"><CreditCard size={17} /></span>
            <span>{t.cards}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </a>
        </div>
      )}
      <button
        type="button"
        className="support-float"
        onClick={() => {
          playTap();
          setOpen((isOpen) => !isOpen);
        }}
        aria-label={t.label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.label}
      >
        <Headphones size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
