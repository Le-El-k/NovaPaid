"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Users, TrendingUp, Award, DollarSign, ArrowUpRight, Share2, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

export function ResellerSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/resellers")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const referralUrl = typeof window !== "undefined" && data?.resellerCode
    ? `${window.location.origin}/register?ref=${data.resellerCode}`
    : "";

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Chargement de votre espace revendeur…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="np-panel p-6" style={{ background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.06) 100%)" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="np-overline text-indigo-600 font-bold text-xs uppercase tracking-wider">PROGRAMME REVENDEUR</span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-1">Espace Partenaire & Affiliation</h1>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Partagez votre lien d'affiliation et touchez des commissions en temps réel sur les opérations de vos filleuls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="np-badge success font-bold">Taux actif : {data?.commissionRate || 5}%</span>
          </div>
        </div>
      </div>

      {/* Referral Link & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Referral Link Card */}
        <div className="np-panel p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={16} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">Votre lien de parrainage exclusif</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Tout utilisateur s'inscrivant avec ce lien devient automatiquement votre filleul officiel.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="np-text-input flex-1 font-mono text-xs text-indigo-600 font-bold"
            />
            <button
              type="button"
              className="np-btn-sm success"
              onClick={handleCopy}
              style={{ padding: "0 16px" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copié !" : "Copier"}</span>
            </button>
          </div>
        </div>

        {/* Total Earned Card */}
        <div className="np-panel p-5 flex flex-col justify-between" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Total commissions perçues</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <strong className="text-2xl font-bold text-slate-800 mt-2">
            {(data?.totalEarnedXaf || 0).toLocaleString("fr-FR")} <small className="text-xs text-slate-500 font-normal">FCFA</small>
          </strong>
          <small className="text-[11px] text-emerald-700 mt-2">Crédit automatique sur votre portefeuille</small>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="np-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Filleuls actifs</span>
            <strong className="text-lg font-bold text-slate-800">{data?.referralsCount || 0} client(s)</strong>
          </div>
        </div>

        <div className="np-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 grid place-items-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Taux de rémunération</span>
            <strong className="text-lg font-bold text-purple-600">{data?.commissionRate || 5}%</strong>
          </div>
        </div>

        <div className="np-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Statut revendeur</span>
            <strong className="text-lg font-bold text-emerald-600 capitalize">{data?.status === "active" ? "Certifié" : data?.status}</strong>
          </div>
        </div>
      </div>

      {/* Referrals & Commissions Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referrals Table */}
        <div className="np-panel p-5">
          <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <span>Mes filleuls inscrits ({data?.referrals?.length || 0})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-2">Filleul</th>
                  <th className="py-2">Date inscription</th>
                </tr>
              </thead>
              <tbody>
                {data?.referrals?.map((ref: any) => (
                  <tr key={ref.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-700">{ref.name}</td>
                    <td className="py-2.5 text-slate-400">{new Date(ref.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
                {(!data?.referrals || data.referrals.length === 0) && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-slate-400">
                      Aucun filleul rattaché pour l'instant. Partagez votre lien d'affiliation !
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="np-panel p-5">
          <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-600" />
            <span>Historique des commissions ({data?.commissions?.length || 0})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-2">Opération</th>
                  <th className="py-2">Commission</th>
                  <th className="py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data?.commissions?.map((comm: any) => (
                  <tr key={comm.id} className="border-b border-slate-100">
                    <td className="py-2.5 text-slate-700">
                      <strong>{comm.orderType}</strong>
                      <small className="block text-slate-400">{comm.orderRef}</small>
                    </td>
                    <td className="py-2.5 font-bold text-emerald-600">+{comm.commissionXaf.toLocaleString("fr-FR")} FCFA</td>
                    <td className="py-2.5">
                      <span className="np-badge success">{comm.status}</span>
                    </td>
                  </tr>
                ))}
                {(!data?.commissions || data.commissions.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      Aucune commission enregistrée pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
