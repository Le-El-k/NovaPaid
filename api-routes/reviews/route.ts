import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser } from "../../app/lib/auth/session.ts";

export async function GET() {
  try {
    const reviews = NovaDbService.getApprovedReviews();

    // Calcul des statistiques
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const average = total > 0 ? (sum / total).toFixed(1) : "5.0";
    const verifiedCount = reviews.filter((review) => review.isVerified).length;

    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
    });

    return Response.json({
      success: true,
      reviews,
      stats: {
        total,
        average,
        ratingBreakdown,
        verifiedCount,
      },
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur chargement avis" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) return Response.json({ success: false, error: "Connectez-vous pour proposer un avis." }, { status: 401 });
    const body = await request.json();
    const { authorLocation, rating, serviceTag, reviewText } = body;

    if (!reviewText || String(reviewText).trim().length < 10) {
      return Response.json({ success: false, error: "Votre avis doit contenir au moins 10 caractères." }, { status: 400 });
    }

    const res = NovaDbService.addCustomerReview({
      authorName: user.name.slice(0, 80),
      authorLocation: String(authorLocation || "Afrique Francophone").slice(0, 80),
      rating: Number(rating) || 5,
      serviceTag: String(serviceTag || "Service Général").slice(0, 60),
      reviewText: String(reviewText).slice(0, 1000),
      isVerified: false,
      status: "pending",
    });

    return Response.json({ ...res, message: "Avis envoyé pour modération." }, { status: 201 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur enregistrement" }, { status: 500 });
  }
}
