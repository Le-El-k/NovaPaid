import { TransferRecord } from "./transfer-types";

/**
 * Génère un reçu de confirmation de transfert NovaPaid au format PDF
 */
export async function downloadTransferReceiptPDF(transfer: TransferRecord): Promise<boolean> {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5", // Format A5 élégant pour les reçus fintech
    });

    const primaryColor = [20, 89, 221]; // #1459dd
    const darkColor = [16, 38, 79]; // #10264f
    const mutedColor = [113, 128, 154]; // #71809a
    const lightBg = [244, 247, 252];
    const successColor = [16, 185, 129]; // #10b981

    // Fond subtil d'en-tête
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(0, 0, 148, 42, "F");

    // Liseré bleu de marque
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 148, 3, "F");

    // Marque NovaPay
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("NovaPaid", 14, 16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("REÇU DE CONFIRMATION DE TRANSFERT", 14, 21);

    // Badge statut
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(96, 12, 38, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.text(transfer.direction === "received" ? "TRANSFERT REÇU" : "TRANSFERT ENVOYÉ", 99, 17.5);

    // Titre Reçu
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("REÇU DE TRANSFERT", 14, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    const dateFormatted = new Date(transfer.createdAt).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "medium",
    });
    doc.text(`Émis le ${dateFormatted}`, 14, 55);

    // Ligne séparatrice
    doc.setDrawColor(223, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 58, 134, 58);

    // Boîte Montant
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(218, 228, 244);
    doc.roundedRect(14, 62, 120, 22, 3, 3, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(transfer.direction === "received" ? "MONTANT REÇU" : "MONTANT ENVOYÉ", 20, 70);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${transfer.amount.toLocaleString("fr-FR")} FCFA`, 20, 78);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Frais appliqués : ${transfer.fee} FCFA (Gratuit)`, 80, 78);

    // Tableau des détails
    let y = 92;
    const addDetailRow = (label: string, value: string, isStrong = false) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(label, 14, y);

      doc.setFont("helvetica", isStrong ? "bold" : "normal");
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(value, 134, y, { align: "right" });

      y += 6.5;
    };

    addDetailRow("Référence transaction", transfer.id, true);
    addDetailRow("Expéditeur", transfer.senderName);
    addDetailRow("Bénéficiaire", transfer.recipientName, true);
    addDetailRow(
      transfer.direction === "received" ? "Identifiant expéditeur" : "Identifiant destinataire",
      [transfer.recipientHandle, transfer.recipientPhone].filter(Boolean).join(" · ") || "Non renseigné"
    );
    if (transfer.note) {
      addDetailRow("Motif de l'opération", transfer.note);
    }
    addDetailRow("Catégorie", transfer.category.toUpperCase());
    addDetailRow("Validation", "Session NovaPaid authentifiée");
    addDetailRow("Statut d'exécution", "DÉBIT & CRÉDIT ATOMIQUES VALIDÉS");

    // Ligne séparatrice
    doc.setDrawColor(223, 230, 240);
    doc.line(14, y + 2, 134, y + 2);

    // Encadré de sécurité & conformité
    y += 8;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, y, 120, 24, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("INFORMATIONS DE TRANSACTION", 18, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("Cette opération est enregistrée dans l’historique NovaPaid.", 18, y + 11);
    doc.text(`Référence : ${transfer.id}`, 18, y + 16);
    doc.text("Pour toute question, communiquez cette référence au support NovaPaid.", 18, y + 20);

    // Pied de page
    doc.setFontSize(6.5);
    doc.setTextColor(150, 160, 175);
    doc.text("NovaPaid · Reçu généré automatiquement · À conserver pour vos dossiers", 74, 198, {
      align: "center",
    });

    // Sauvegarde et téléchargement
    doc.save(`Recu-Transfert-NovaPay-${transfer.id}.pdf`);
    return true;
  } catch (err) {
    console.error("Erreur génération PDF reçu:", err);
    return false;
  }
}
