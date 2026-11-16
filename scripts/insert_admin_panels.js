
import fs from 'node:fs';

const filePath = 'C:/Users/RODDY NGUEYEP/Desktop/NovaPaid/app/components/admin/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const marker = '{activeTab === "settings" && (\n            <div className="np-admin-settings-layout">';
let index = content.indexOf(marker);

if (index === -1) {
  // Try CRLF
  const markerCRLF = '{activeTab === "settings" && (\r\n            <div className="np-admin-settings-layout">';
  index = content.indexOf(markerCRLF);
}

if (index === -1) {
  console.error("marker still not found!");
  process.exit(1);
}

const newPanels = `{/* REVENDEURS / AFFILIATION (PrismCard) */}
          {activeTab === "resellers" && (
            <div className="np-panel np-admin-table-panel">
              <div className="np-panel-heading">
                <div>
                  <span className="np-overline">AFFILIATION & PARTENAIRES</span>
                  <h2>Programme Revendeurs ({resellers.length})</h2>
                  <p className="np-admin-card-desc">Gérez les codes d'affiliation, les filleuls rattachés et les commissions générées.</p>
                </div>
              </div>
              <div className="np-admin-table-wrap">
                <table className="np-admin-table">
                  <thead>
                    <tr>
                      <th>Revendeur</th>
                      <th>Code Filleul</th>
                      <th>Taux Commission</th>
                      <th>Filleuls Inscrits</th>
                      <th>Total Gagné</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resellers.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.userName}</strong>
                          <small className="block text-slate-400">{r.userEmail}</small>
                        </td>
                        <td><code>{r.referralCode}</code></td>
                        <td><strong>{r.commissionRate}%</strong></td>
                        <td><span className="np-badge success">{r.referralsCount} client(s)</span></td>
                        <td><strong>{r.totalEarnedXaf.toLocaleString("fr-FR")} FCFA</strong></td>
                        <td><span className={"np-badge " + (r.status === "active" ? "success" : "danger")}>{r.status}</span></td>
                        <td>
                          <button type="button" className="np-btn-sm outline" onClick={() => handleUpdateResellerRate(r.id, r.commissionRate)}>
                            Modifier taux
                          </button>
                        </td>
                      </tr>
                    ))}
                    {resellers.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 py-6">Aucun revendeur inscrit pour le moment.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANNONCES PUSH (PrismCard) */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div className="np-panel p-6">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">DIFFUSION EN MASSE</span>
                    <h2>Nouvelle Annonce Push</h2>
                  </div>
                </div>
                <form onSubmit={handleSendPushAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de l'annonce</label>
                      <input
                        type="text"
                        className="np-text-input w-full"
                        placeholder="Ex: Nouveauté : Rechargez vos cartes en 1 clic !"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Cible</label>
                      <select
                        className="np-text-input w-full"
                        value={newAnnouncement.targetAudience}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetAudience: e.target.value })}
                      >
                        <option value="all">Tous les utilisateurs actifs</option>
                        <option value="verified">Comptes vérifiés KYC</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Message</label>
                    <textarea
                      className="np-text-input w-full"
                      rows={3}
                      placeholder="Contenu de la notification envoyée aux utilisateurs..."
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                      required
                      maxLength={500}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="np-btn-sm success" disabled={sendingAnnouncement}>
                      <Send size={14} />
                      <span>{sendingAnnouncement ? "Diffusion en cours…" : "Diffuser l'annonce push"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">HISTORIQUE</span>
                    <h2>Annonces diffusées ({announcements.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Titre</th>
                        <th>Message</th>
                        <th>Audience</th>
                        <th>Destinataires</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map((a) => (
                        <tr key={a.id}>
                          <td><small>{new Date(a.created_at).toLocaleString("fr-FR")}</small></td>
                          <td><strong>{a.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{a.message}</span></td>
                          <td><code>{a.target_audience}</code></td>
                          <td><span className="np-badge success">{a.sent_count} reçu(s)</span></td>
                          <td><span className="np-badge success">{a.status}</span></td>
                        </tr>
                      ))}
                      {announcements.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-500 py-6">Aucune annonce diffusée.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PUBLICITÉS & BANNIÈRES (PrismCard AdController) */}
          {activeTab === "ads" && (
            <div className="space-y-6">
              <div className="np-panel p-6">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">MARKETING & BANNIÈRES</span>
                    <h2>Ajouter une bannière promotionnelle</h2>
                  </div>
                </div>
                <form onSubmit={handleSaveAd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de la campagne</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Ex: -50% sur les cartes Mastercard ce weekend"
                      value={newAd.title}
                      onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Lien de destination (URL)</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Ex: /cards ou /boutique"
                      value={newAd.linkUrl}
                      onChange={(e) => setNewAd({ ...newAd, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Description / Accroche</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="Description courte affichée sur la bannière"
                      value={newAd.description}
                      onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">URL Image / Bannière (facultatif)</label>
                    <input
                      type="text"
                      className="np-text-input w-full"
                      placeholder="https://..."
                      value={newAd.imageUrl}
                      onChange={(e) => setNewAd({ ...newAd, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="submit" className="np-btn-sm success" disabled={savingAd}>
                      <Plus size={14} />
                      <span>{savingAd ? "Enregistrement…" : "Publier la bannière"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="np-panel np-admin-table-panel">
                <div className="np-panel-heading">
                  <div>
                    <span className="np-overline">CAMPAGNES ACTIVES</span>
                    <h2>Bannières & Publicités ({ads.length})</h2>
                  </div>
                </div>
                <div className="np-admin-table-wrap">
                  <table className="np-admin-table">
                    <thead>
                      <tr>
                        <th>Titre</th>
                        <th>Description</th>
                        <th>Lien</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad) => (
                        <tr key={ad.id}>
                          <td><strong>{ad.title}</strong></td>
                          <td><span className="text-xs text-slate-300">{ad.description || "—"}</span></td>
                          <td><code>{ad.link_url || "—"}</code></td>
                          <td><span className={"np-badge " + (ad.is_active ? "success" : "default")}>{ad.is_active ? "Active" : "Désactivée"}</span></td>
                          <td>
                            <button type="button" className="np-btn-sm danger" onClick={() => handleDeleteAd(ad.id)}>
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {ads.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-slate-500 py-6">Aucune bannière publicitaire configurée.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          `;

content = content.slice(0, index) + newPanels + content.slice(index);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Panels added successfully!");
