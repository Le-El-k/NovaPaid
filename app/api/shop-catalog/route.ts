import { NovaDbService } from "../../lib/db/service.ts";

export async function GET() {
  try {
    return Response.json(
      { success: true, sections: NovaDbService.getPublicShopCatalog() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Le catalogue est momentanément indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
