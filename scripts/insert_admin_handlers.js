
import fs from 'node:fs';

const filePath = 'C:/Users/RODDY NGUEYEP/Desktop/NovaPaid/app/components/admin/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const marker = '  const handlePasswordResetSubmit = async (event: React.FormEvent) => {';
const index = content.indexOf(marker);

if (index === -1) {
  console.error("marker not found!");
  process.exit(1);
}

const newHandlers = `  const handleUpdateResellerRate = async (resellerId: number, currentRate: number) => {
    const next = window.prompt("Nouveau taux de commission revendeur (%) :", String(currentRate));
    if (!next || isNaN(Number(next))) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_reseller_rate", resellerId, rate: Number(next) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Mise à jour impossible.");
      showNotification("Taux de commission mis à jour.");
      fetchSectionData("resellers");
    } catch (e: any) {
      showNotification(e?.message || "Erreur.");
    }
  };

  const handleSendPushAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) return;
    setSendingAnnouncement(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_push_announcement", ...newAnnouncement }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Envoi impossible.");
      showNotification(\`Annonce envoyée à \${data.sentCount} utilisateur(s).\`);
      setNewAnnouncement({ title: "", message: "", targetAudience: "all" });
      fetchSectionData("announcements");
    } catch (e: any) {
      showNotification(e?.message || "Erreur lors de l'envoi.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title.trim()) return;
    setSavingAd(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_ad", ...newAd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Enregistrement impossible.");
      showNotification("Annonce publicitaire enregistrée.");
      setNewAd({ title: "", description: "", linkUrl: "", imageUrl: "", isActive: true, sortOrder: 0 });
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || "Erreur enregistrement.");
    } finally {
      setSavingAd(false);
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!window.confirm("Supprimer cette bannière publicitaire ?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_ad", id: adId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Suppression impossible.");
      showNotification("Bannière supprimée.");
      fetchSectionData("ads");
    } catch (e: any) {
      showNotification(e?.message || "Erreur suppression.");
    }
  };

`;

content = content.slice(0, index) + newHandlers + content.slice(index);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Handlers added successfully to AdminDashboard!");
