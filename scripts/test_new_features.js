import { getDatabase } from "../app/lib/db/database.ts";
import { NovaDbService } from "../app/lib/db/service.ts";

const db = getDatabase();
let reviewId = null;

try {
  const reviews = NovaDbService.getApprovedReviews();
  console.log("Avis publics récupérés: " + reviews.length);

  const created = NovaDbService.addCustomerReview({
    authorName: "Test automatisé NovaPaid",
    authorLocation: "Test local",
    rating: 5,
    serviceTag: "Validation plateforme",
    reviewText: "Avis temporaire créé puis supprimé pendant la vérification.",
  });
  reviewId = Number(created.id);
  console.log("Création d’un avis temporaire: réussie");

  const adminReviews = NovaDbService.getAdminReviews();
  console.log("Avis consultables dans l’espace admin: " + adminReviews.length);

  const admins = Number(db.prepare("SELECT COUNT(*) AS count FROM admins").get()?.count || 0);
  const adminsInUsers = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role <> 'customer'").get()?.count || 0);
  if (admins === 0 || adminsInUsers !== 0) throw new Error("Séparation utilisateurs/admin incorrecte.");

  console.log("Séparation des comptes: réussie");
} catch (error) {
  console.error("Échec de vérification:", error?.message || "erreur inattendue");
  process.exitCode = 1;
} finally {
  if (reviewId) {
    try {
      NovaDbService.deleteReview(reviewId, 1);
      console.log("Données temporaires supprimées.");
    } catch {
      console.error("Le nettoyage de l’avis temporaire a échoué.");
      process.exitCode = 1;
    }
  }
}
