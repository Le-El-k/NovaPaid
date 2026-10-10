"use client";

import { ExternalLink, X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FaWhatsapp } from "react-icons/fa";
import {
  buildSupportWhatsAppHref,
  SUPPORT_WHATSAPP_CONTACTS,
  type SupportLanguage,
} from "@/app/lib/support-whatsapp";

type WhatsAppContactPickerProps = {
  language: SupportLanguage;
  children: ReactNode;
  className?: string;
  ariaLabel: string;
  title?: string;
  message?: string;
  onOpen?: () => void;
};

const pickerCopy = {
  fr: {
    eyebrow: "WhatsApp Nova Paid",
    title: "Choisissez un service client",
    description: "Sélectionnez le service que vous souhaitez contacter.",
    close: "Fermer le choix du service client",
    openContact: "Contacter {service} sur WhatsApp",
  },
  en: {
    eyebrow: "Nova Paid WhatsApp",
    title: "Choose a customer service",
    description: "Select the service you would like to contact.",
    close: "Close customer service selection",
    openContact: "Contact {service} on WhatsApp",
  },
} as const;

export function WhatsAppContactPicker({
  language,
  children,
  className,
  ariaLabel,
  title,
  message,
  onOpen,
}: WhatsAppContactPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const t = pickerCopy[language];

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) {
        window.requestAnimationFrame(() => trigger.focus());
      }
    };
  }, [open]);

  const triggerClassName = ["whatsapp-picker-trigger", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={title}
      >
        {children}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="whatsapp-picker-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <section
                ref={dialogRef}
                className="whatsapp-picker-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
              >
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="whatsapp-picker-close"
                  onClick={() => setOpen(false)}
                  aria-label={t.close}
                >
                  <X size={18} aria-hidden="true" />
                </button>

                <div className="whatsapp-picker-header">
                  <div className="whatsapp-picker-logo" aria-hidden="true">
                    <FaWhatsapp />
                  </div>
                  <div>
                    <span>{t.eyebrow}</span>
                    <h2 id={titleId}>{t.title}</h2>
                    <p id={descriptionId}>{t.description}</p>
                  </div>
                </div>

                <div className="whatsapp-picker-options">
                  {SUPPORT_WHATSAPP_CONTACTS.map((contact) => {
                    const serviceLabel = contact.label[language];
                    const contactAriaLabel = t.openContact.replace("{service}", serviceLabel);

                    return (
                      <a
                        key={contact.id}
                        href={buildSupportWhatsAppHref(contact.whatsappNumber, message)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-picker-option"
                        onClick={() => setOpen(false)}
                        aria-label={contactAriaLabel}
                      >
                        <span className="whatsapp-picker-option-icon" aria-hidden="true">
                          <FaWhatsapp />
                        </span>
                        <span className="whatsapp-picker-option-copy">
                          <strong>{serviceLabel}</strong>
                          <small>{contact.displayPhone}</small>
                        </span>
                        <ExternalLink size={17} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
