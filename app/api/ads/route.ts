import { NovaDbService } from "../../lib/db/service.ts";

export async function GET() {
  try {
    const ads = NovaDbService.getPromotionalAds(true);
    return Response.json({ success: true, ads });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur chargement annonces" }, { status: 500 });
  }
}
