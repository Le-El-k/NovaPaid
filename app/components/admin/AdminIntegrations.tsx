"use client";

// Admin → Intégrations : clés et réglages des fournisseurs, stockés en base
// (table integration_settings). Les secrets ne sont jamais renvoyés en clair :
// on affiche seulement s'ils sont définis, et un champ vide les conserve.
import { useEffect, useState } from "react";
import { Check, KeyRound, RefreshCw, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

type Field = {
  key: string;
  label: string;
  secret: boolean;
  public: boolean;
  help: string;
  placeholder: string;
  options: string[] | null;
  defaultValue: string;
  isSet: boolean;
  value: string;
  masked: string;
  updatedAt: string | null;
};

type Provider = { id: string; name: string; description: string; fields: Field[] };

export function AdminIntegrations() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const applyProviders = (list: Provider[]) => {
    setProviders(list);
    const next: Record<string, Record<string, string>> = {};
    for (const p of list) {
      next[p.id] = {};
      for (const f of p.fields) next[p.id][f.key] = f.secret ? "" : f.value;
    }
    setDrafts(next);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?section=integrations");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Chargement impossible.");
      applyProviders(json.integrations);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (provider: Provider, clear: string[] = []) => {
    setSaving(provider.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_integration", provider: provider.id, values: drafts[provider.id] || {}, clear }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Enregistrement impossible.");
      applyProviders(json.integrations);
      setMessage({ type: "ok", text: `${provider.name} : réglages enregistrés.` });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(null);
    }
  };

  const setDraft = (providerId: string, key: string, value: string) =>
    setDrafts((d) => ({ ...d, [providerId]: { ...(d[providerId] || {}), [key]: value } }));

  return (
    <div className="np-admin-integrations">
      <div className="np-admin-integrations-head">
        <p>
          Toutes les clés sont stockées en base, aucune dans un fichier <code>.env</code>. Un secret déjà défini
          n’est jamais réaffiché : laissez le champ vide pour le conserver.
        </p>
        <button type="button" className="np-secondary-button" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {message && (
        <div className={`np-admin-integrations-msg is-${message.type}`} role="status">
          {message.type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}

      {loading && providers.length === 0 ? (
        <p className="np-admin-integrations-empty">Chargement…</p>
      ) : (
        <div className="np-admin-integrations-grid">
          {providers.map((p) => {
            const configured = p.fields.some((f) => f.isSet);
            return (
              <section key={p.id} className="np-panel np-admin-integration-card">
                <header>
                  <div>
                    <h3><KeyRound size={16} /> {p.name}</h3>
                    <p>{p.description}</p>
                  </div>
                  <span className={`np-admin-integration-badge${configured ? " is-on" : ""}`}>
                    {configured ? "Configuré" : "Non configuré"}
                  </span>
                </header>

                <div className="np-admin-integration-fields">
                  {p.fields.map((f) => {
                    const id = `integ-${p.id}-${f.key}`;
                    const draft = drafts[p.id]?.[f.key] ?? "";
                    return (
                      <div key={f.key} className="np-admin-integration-field">
                        <label htmlFor={id} className="np-form-label">
                          {f.label}
                          {f.secret && <span className="np-admin-integration-tag">secret</span>}
                          {f.public && <span className="np-admin-integration-tag is-public">public</span>}
                        </label>
                        <div className="np-admin-integration-input">
                          {f.options ? (
                            <select id={id} className="np-text-input" value={draft || f.defaultValue} onChange={(e) => setDraft(p.id, f.key, e.target.value)}>
                              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              id={id}
                              className="np-text-input"
                              type={f.secret ? "password" : "text"}
                              autoComplete="off"
                              spellCheck={false}
                              value={draft}
                              placeholder={f.secret ? (f.isSet ? `Défini (${f.masked}) — vide = conserver` : "Non défini") : f.placeholder}
                              onChange={(e) => setDraft(p.id, f.key, e.target.value)}
                            />
                          )}
                          {f.secret && f.isSet && (
                            <button type="button" className="np-icon-button" title="Effacer ce secret" aria-label={`Effacer ${f.label}`}
                              disabled={saving === p.id}
                              onClick={() => { if (confirm(`Effacer « ${f.label} » pour ${p.name} ?`)) save(p, [f.key]); }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {f.help && <small className="np-admin-integration-help">{f.help}</small>}
                      </div>
                    );
                  })}
                </div>

                <footer>
                  <button type="button" className="np-primary-button" disabled={saving === p.id} onClick={() => save(p)}>
                    <Check size={14} /> {saving === p.id ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </footer>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
