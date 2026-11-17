// Public runtime configuration for the browser.
//
// Only non-secret, client-safe values (contact email, WhatsApp number, public
// checkout keys, site URL) — sourced from the database so they can be managed
// from the admin panel instead of being baked into the bundle at build time.

import { NovaDbService } from "../../app/lib/db/service.ts";

export async function GET() {
  try {
    return Response.json(
      { success: true, config: NovaDbService.getPublicConfig() },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur" }, { status: 500 });
  }
}
