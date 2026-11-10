"use client";

import { useEffect, useState } from "react";
import { Check, Laptop, LockKeyhole, Save, ShieldCheck, User } from "lucide-react";

interface SettingsProfile {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  hasPin?: boolean;
}

export function SettingsSection({
  user,
  onProfileUpdated,
  onOpenSupport,
}: {
  user: SettingsProfile;
  onProfileUpdated?: (profile: SettingsProfile) => void;
  onOpenSupport?: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMessage, setKycMessage] = useState("");
  const [kycDocType, setKycDocType] = useState("identity_card");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [hasPin, setHasPin] = useState(Boolean(user.hasPin));
  const [pinValue, setPinValue] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || "");
    setHasPin(Boolean(user.hasPin));
  }, [user.name, user.phone]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPin(true);
    setPinMessage("");
    setPinError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_pin", currentPassword: pinPassword, pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Impossible d'enregistrer le PIN.");
      setHasPin(true);
      setPinValue("");
      setPinPassword("");
      setPinMessage("Code PIN à 4 chiffres configuré avec succès.");
    } catch (err: any) {
      setPinError(err?.message || "Erreur lors de la configuration du PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  const handleRemovePin = async () => {
    const pwd = window.prompt("Entrez votre mot de passe pour confirmer la suppression du PIN :");
    if (!pwd) return;
    setSavingPin(true);
    setPinMessage("");
    setPinError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_pin", currentPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Suppression impossible.");
      setHasPin(false);
      setPinMessage("Code PIN supprimé.");
    } catch (err: any) {
      setPinError(err?.message || "Erreur de suppression du PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  const handleSubmitKyc = async () => {
    setKycSubmitting(true);
    setKycMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_kyc", documentType: kycDocType }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Demande impossible.");
      setKycMessage("Votre demande KYC a ete soumise. Notre equipe examinera votre dossier.");
    } catch (error: any) {
      setKycMessage("Erreur : " + (error?.message || "Demande impossible."));
    } finally {
      setKycSubmitting(false);
    }
  };

  const kycStatus = {
    approved: { label: "Vérification validée", style: "success" },
    pending: { label: "En attente", style: "warning" },
    under_review: { label: "En cours d’examen", style: "warning" },
    rejected: { label: "À compléter", style: "danger" },
    not_started: { label: "Non démarrée", style: "default" },
  }[user.kycStatus] || { label: user.kycStatus, style: "default" };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", name, phone, currentPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.profile) throw new Error(data?.error || "Enregistrement impossible.");
      const updated = { ...data.profile, role: user.role } as SettingsProfile;
      setName(updated.name);
      setPhone(updated.phone || "");
      setCurrentPassword("");
      onProfileUpdated?.(updated);
      setMessage("Vos informations ont été enregistrées.");
    } catch (cause: any) {
      setError(cause?.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevoking(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_other_sessions" }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || "Impossible de fermer les autres sessions.");
      setMessage(data.revokedCount ? `${data.revokedCount} autre(s) session(s) fermée(s).` : "Aucune autre session active.");
    } catch (cause: any) {
      setError(cause?.message || "Impossible de fermer les autres sessions.");
    } finally {
      setRevoking(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordNext.length < 10 || passwordNext.length > 200) {
      setPasswordError("Le nouveau mot de passe doit contenir entre 10 et 200 caractères.");
      return;
    }
    if (passwordNext !== passwordConfirm) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword: passwordCurrent, newPassword: passwordNext }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || "Impossible de modifier le mot de passe.");
      setPasswordCurrent("");
      setPasswordNext("");
      setPasswordConfirm("");
      setPasswordMessage(`Mot de passe modifié. ${data.revokedCount || 0} autre(s) session(s) fermée(s).`);
    } catch (cause: any) {
      setPasswordError(cause?.message || "Impossible de modifier le mot de passe.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="np-settings-view-container">
      <section className="np-panel np-profile-overview-card">
        <div className="np-profile-avatar-large"><span>{name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span></div>
        <div className="np-profile-overview-info">
          <div className="np-profile-name-row">
            <h2>{name}</h2>
            <span className={`np-badge ${kycStatus.style}`}><ShieldCheck size={14} /> {kycStatus.label}</span>
          </div>
          <p className="np-profile-sub">{user.email} · Portefeuille en XAF</p>
          <div className="np-kyc-perks-row"><span>Compte {user.role === "customer" ? "client" : user.role}</span><span>Statut du dossier : {kycStatus.label}</span></div>
        </div>
      </section>

      <div className="np-settings-columns">
        <section className="np-panel np-settings-card">
          <div className="np-panel-heading">
            <div><span className="np-overline">DONNÉES DU COMPTE</span><h3>Informations personnelles</h3></div>
            <User size={18} className="text-blue-600" />
          </div>
          <form onSubmit={handleSaveProfile} className="np-settings-form">
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-name">Nom complet</label>
              <input id="profile-name" type="text" className="np-text-input" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-email">Email de connexion</label>
              <input id="profile-email" type="email" className="np-text-input" value={user.email} readOnly />
              <small className="np-form-hint">L’adresse email ne peut pas être modifiée ici.</small>
            </div>
            <div className="np-form-group">
              <label className="np-form-label" htmlFor="profile-phone">Numéro de téléphone</label>
              <input id="profile-phone" type="tel" className="np-text-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            {phone !== (user.phone || "") && (
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="profile-current-password">Mot de passe actuel pour confirmer le changement de téléphone</label>
                <input id="profile-current-password" type="password" className="np-text-input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
              </div>
            )}
            <button type="submit" className="np-primary-button np-save-btn" disabled={saving}>
              {saving ? <><Save size={16} /><span>Enregistrement…</span></> : <><Check size={16} /><span>Enregistrer le profil</span></>}
            </button>
            {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          </form>
        </section>

        <div className="np-settings-right-col">
          <section className="np-panel np-settings-card">
            <div className="np-panel-heading">
              <div><span className="np-overline">PROTECTION DU COMPTE</span><h3>Sessions connectées</h3></div>
              <Laptop size={18} className="text-emerald-600" />
            </div>
            <div className="np-session-item active">
              <Laptop size={20} className="np-session-icon" />
              <div className="np-session-info"><strong>Session actuelle</strong><small>Votre appareil est connecté à NovaPaid.</small></div>
              <span className="np-badge success">Active</span>
            </div>
            <p className="np-form-hint mt-3">Vous pouvez fermer toutes les autres sessions. Celle-ci restera ouverte.</p>
            <button type="button" className="np-outline-button mt-3" onClick={handleRevokeOtherSessions} disabled={revoking}>
              <LockKeyhole size={15} /> {revoking ? "Fermeture…" : "Fermer les autres sessions"}
            </button>
            {error && <p role="alert" className="text-sm text-rose-700 mt-2">{error}</p>}
          </section>

          <section className="np-panel np-settings-card">
            <div className="np-panel-heading"><div><span className="np-overline">IDENTIFIANTS</span><h3>Changer le mot de passe</h3></div><LockKeyhole size={18} className="text-blue-600" /></div>
            <form onSubmit={handleChangePassword} className="np-settings-form">
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-current">Mot de passe actuel</label><input id="password-current" className="np-text-input" type="password" autoComplete="current-password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} required /></div>
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-next">Nouveau mot de passe</label><input id="password-next" className="np-text-input" type="password" autoComplete="new-password" minLength={10} maxLength={200} value={passwordNext} onChange={(event) => setPasswordNext(event.target.value)} required /><small className="np-form-hint">10 caractères minimum.</small></div>
              <div className="np-form-group"><label className="np-form-label" htmlFor="password-confirm">Confirmer le nouveau mot de passe</label><input id="password-confirm" className="np-text-input" type="password" autoComplete="new-password" minLength={10} maxLength={200} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required /></div>
              <button type="submit" className="np-outline-button" disabled={changingPassword}>{changingPassword ? "Modification…" : "Modifier le mot de passe"}</button>
              {passwordMessage && <p role="status" className="text-sm text-emerald-700">{passwordMessage}</p>}
              {passwordError && <p role="alert" className="text-sm text-rose-700">{passwordError}</p>}
            </form>
          </section>

          {/* Code PIN de sécurité (PrismCard) */}
          <section className="np-panel np-settings-card">
            <div className="np-panel-heading">
              <div>
                <span className="np-overline">VERROUILLAGE RAPIDE</span>
                <h3>Code PIN de sécurité (4 chiffres)</h3>
              </div>
              <span className={"np-badge " + (hasPin ? "success" : "default")}>
                {hasPin ? "PIN Activé" : "Non configuré"}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Le code PIN permet de valider rapidement vos transactions sensibles et de déverrouiller votre session sans ressaisir votre mot de passe complet.
            </p>
            {hasPin ? (
              <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-700">
                  <strong>Code PIN actif</strong> (••••)
                </div>
                <button type="button" className="np-btn-sm danger" onClick={handleRemovePin} disabled={savingPin}>
                  Désactiver le PIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePin} className="np-settings-form mt-3">
                <div className="np-form-group">
                  <label className="np-form-label">Nouveau code PIN (4 chiffres)</label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    inputMode="numeric"
                    className="np-text-input"
                    style={{ letterSpacing: "8px", fontWeight: "bold", fontSize: "16px" }}
                    placeholder="••••"
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    required
                  />
                </div>
                <div className="np-form-group">
                  <label className="np-form-label">Mot de passe actuel</label>
                  <input
                    type="password"
                    className="np-text-input"
                    value={pinPassword}
                    onChange={(e) => setPinPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="np-outline-button" disabled={savingPin || pinValue.length !== 4}>
                  {savingPin ? "Enregistrement…" : "Activer le code PIN"}
                </button>
              </form>
            )}
            {pinMessage && <p className="text-sm text-emerald-700 mt-2">{pinMessage}</p>}
            {pinError && <p className="text-sm text-rose-700 mt-2">{pinError}</p>}
          </section>

          <section className="np-panel np-settings-card">
            <div className="np-panel-heading"><div><span className="np-overline">VÉRIFICATION D’IDENTITÉ</span><h3>Dossier KYC</h3></div><ShieldCheck size={18} className="text-blue-600" /></div>
            <p className="text-sm text-slate-600">Etat actuel : <strong>{kycStatus.label}</strong></p>
            {(user.kycStatus === "not_started" || user.kycStatus === "rejected") ? (
              <div className="mt-3 space-y-3">
                <p className="np-form-hint">Soumettez une demande de verification. Notre equipe examine votre dossier sous 24-48h.</p>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Type de document</label>
                  <select className="np-text-input w-full" value={kycDocType} onChange={(e) => setKycDocType(e.target.value)}>
                    <option value="identity_card">Carte nationale d identite</option>
                    <option value="passport">Passeport</option>
                    <option value="residence_permit">Titre de sejour</option>
                  </select>
                </div>
                <button type="button" className="np-outline-button" onClick={handleSubmitKyc} disabled={kycSubmitting}>
                  {kycSubmitting ? "Envoi en cours..." : "Soumettre ma demande KYC"}
                </button>
                {kycMessage && <p className={"text-sm mt-2 " + (kycMessage.startsWith("Erreur") ? "text-rose-700" : "text-emerald-700")}>{kycMessage}</p>}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="np-form-hint">Si votre dossier doit etre examine ou corrige, contactez le support.</p>
                {onOpenSupport && <button type="button" className="np-outline-button mt-1" onClick={onOpenSupport}>Contacter le support</button>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
