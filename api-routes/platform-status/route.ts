import { getDatabase } from "../../app/lib/db/database.ts";

export async function GET() {
  try {
    const row = getDatabase().prepare(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'platform_maintenance_mode'"
    ).get() as { setting_value?: string } | undefined;

    let value: { enabled?: boolean; message?: string } = {};
    try {
      value = JSON.parse(row?.setting_value || "{}");
    } catch {}

    return Response.json({
      success: true,
      maintenance: {
        enabled: value.enabled === true,
        message: String(value.message || "Une maintenance est en cours. Merci de réessayer dans quelques instants."),
      },
    });
  } catch {
    return Response.json({
      success: true,
      maintenance: { enabled: false, message: "" },
    });
  }
}
