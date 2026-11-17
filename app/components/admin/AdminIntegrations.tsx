"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Save, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

type Field =
  | { key: string; group: string; label: string; secret: true; isSet: boolean; preview: string }
  | { key: string; group: string; label: string; secret: false; value: string };

// Admin editor for all runtime config (API keys, emails, numbers) stored in the DB.
// Visual style mirrors the former provider cards (.np-admin-integrations*), while the
// data/save logic uses the current flat runtime-config backend.
export default function AdminIntegrations() {
  const [fields, setFields] = useState<Field[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const j = await fetch("/api/admin?section=integrations", { cache: "no-store" }).then((r) => r.json());
      const list: Field[] = j?.success ? j.config : [];
      setFields(list);
      const init: Record<string, string> = {};
      for (const f of list) init[f.key] = f.secret ? "" : (f.value || "");
      setForm(init);
    } catch {
      setMsg({ kind: "err", text: "Chargement impossible." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Field[]>();
    for (const f of fields) { if (!map.has(f.group)) map.set(f.group, []); map.get(f.group)!.push(f); }
    return [...map.entries()];
  }, [fields]);

  const save = async (group: string, list: Field[]) => {
    setSaving(group);
    setMsg(null);
    try {
      // Send this group's non-secret fields, and only the secret fields actually typed.
      const config: Record<string, string> = {};
      for (const f of list) {
        if (f.secret) { if (form[f.key] && form[f.key].trim()) config[f.key] = form[f.key].trim(); }
        else config[f.key] = form[f.key] ?? "";
      }
      const j = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_integration_config", config }),
      }).then((r) => r.json());
      if (!j?.success) throw new Error(j?.error || "Échec de l'enregistrement.");
      setMsg({ kind: "ok", text: `${group} : réglages enregistrés.` });
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Erreur." });
    } finally {
      setSaving(null);
    }
  };

  if (loading && fields.length === 0) {
    return <p className="np-admin-integrations-empty" style={{ display: "flex", gap: 8, alignItems: "center", padding: 24 }}><Loader2 size={16} className="animate-spin" /> Chargement…</p>;
  }

  return (
    <div className="np-admin-integrations">
      <div className="np-admin-integrations-head">
        <p>
          Toutes les valeurs (clés API, e-mails, numéros) sont lues depuis la base de données, avec repli sur les
          fichiers <code>.env</code>. Un secret déjà défini n’est jamais réaffiché : laissez le champ <strong>vide</strong> pour le conserver.
        </p>
        <button type="button" className="np-secondary-button" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {msg && (
        <div className={`np-admin-integrations-msg is-${msg.kind === "ok" ? "ok" : "error"}`} role="status">
          {msg.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {msg.text}
        </div>
      )}

      <div className="np-admin-integrations-grid">
        {groups.map(([group, list]) => {
          const configured = list.some((f) => (f.secret ? f.isSet : Boolean((f as any).value)));
          return (
            <section key={group} className="np-panel np-admin-integration-card">
              <header>
                <div>
                  <h3><KeyRound size={16} /> {group}</h3>
                  <p>{list.length} paramètre{list.length > 1 ? "s" : ""}</p>
                </div>
                <span className={`np-admin-integration-badge${configured ? " is-on" : ""}`}>
                  {configured ? "Configuré" : "Non configuré"}
                </span>
              </header>

              <div className="np-admin-integration-fields">
                {list.map((f) => {
                  const id = `integ-${f.key}`;
                  return (
                    <div key={f.key} className="np-admin-integration-field">
                      <label htmlFor={id} className="np-form-label">
                        {f.label}
                        {f.secret && <span className="np-admin-integration-tag">secret</span>}
                      </label>
                      <div className="np-admin-integration-input">
                        <input
                          id={id}
                          className="np-text-input"
                          style={{ width: "100%" }}
                          type={f.secret ? "password" : "text"}
                          value={form[f.key] ?? ""}
                          placeholder={f.secret ? "Laisser vide pour conserver" : ""}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        />
                      </div>
                      {f.secret && (
                        <span className="np-admin-integration-help">
                          {f.isSet ? `Actuel : ${f.preview}` : "Non défini"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <footer>
                <button type="button" className="np-primary-button" onClick={() => save(group, list)} disabled={saving === group} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {saving === group ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
                </button>
              </footer>
            </section>
          );
        })}
      </div>
    </div>
  );
}
