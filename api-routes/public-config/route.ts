// Configuration publique lue en base (champs « public » de integration_settings).
// Aucun secret n'est renvoyé ici : voir app/lib/integrations.ts.
import { getPublicIntegrationConfig } from "../../app/lib/integrations.ts";

export async function GET() {
  try {
    return Response.json(
      { success: true, config: getPublicIntegrationConfig() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ success: false, config: {} }, { status: 500 });
  }
}
