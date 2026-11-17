"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";

type Field =
  | { key: string; group: string; label: string; secret: true; isSet: boolean; preview: string }
  | { key: string; group: string; label: string; secret: false; value: string };

// Admin editor for all runtime config (API keys, emails, numbers) stored in the DB.
export default function AdminIntegrations() {
  const [fields, setFields] = useState<Field[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Send all non-secret fields, and only secret fields the admin actually typed.
      const config: Record<string, string> = {};
      for (const f of fields) {
        if (f.secret) { if (form[f.key] && form[f.key].trim()) config[f.key] = form[f.key].trim(); }
        else config[f.key] = form[f.key] ?? "";
      }
      const j = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_integration_config", config }),
      }).then((r) => r.json());
      if (!j?.success) throw new Error(j?.error || "Échec de l'enregistrement.");
      setMsg({ kind: "ok", text: `Enregistré (${j.changed} paramètre(s)).` });
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Erreur." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "var(--np-text-muted)", display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={16} className="animate-spin" /> Chargement…</div>;
  }

  return (
    <div style={{ padding: "0 0 40px", maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, padding: "11px 14px", borderRadius: 12, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "var(--np-text-secondary)", fontSize: 12.5, lineHeight: 1.5 }}>
        <ShieldCheck size={18} style={{ flex: "0 0 auto", marginTop: 1 }} />
        <span>Ces valeurs sont lues depuis la base de données (repli sur les fichiers .env). Les clés secrètes sont masquées : laissez un champ secret <strong>vide</strong> pour conserver la valeur actuelle. Garde ce panneau réservé aux administrateurs.</span>
      </div>

      {groups.map(([group, list]) => (
        <div key={group} className="np-stat-card" style={{ marginBottom: 18, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontWeight: 700, color: "var(--np-text)", fontSize: 15 }}>
            <KeyRound size={16} /> {group}
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {list.map((f) => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--np-text-secondary)", marginBottom: 5 }}>
                  {f.label}{f.secret && <span style={{ color: "var(--np-text-muted)", fontWeight: 400 }}> — secret{(f as any).isSet ? ` (actuel : ${(f as any).preview})` : " (non défini)"}</span>}
                </label>
                <input
                  className="np-text-input"
                  style={{ width: "100%" }}
                  type={f.secret ? "password" : "text"}
                  value={form[f.key] ?? ""}
                  placeholder={f.secret ? "Laisser vide pour conserver" : ""}
                  autoComplete="off"
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {msg && (
        <div style={{ marginBottom: 14, padding: "10px 13px", borderRadius: 10, fontSize: 13, background: msg.kind === "ok" ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", color: msg.kind === "ok" ? "#10b981" : "#ef4444" }}>
          {msg.text}
        </div>
      )}

      <button type="button" className="np-primary-button" onClick={save} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
      </button>
    </div>
  );
}
