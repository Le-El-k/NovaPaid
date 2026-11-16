import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });

  try {
    const notifications = NovaDbService.getUserNotifications(user.id);
    return Response.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Impossible de récupérer les notifications." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });

  try {
    const body = await request.json();
    if (String(body?.action || "") !== "mark_read") {
      return Response.json({ success: false, error: "Action non reconnue." }, { status: 400 });
    }

    const id = body?.notificationId === undefined ? undefined : Number(body.notificationId);
    return Response.json(NovaDbService.markUserNotificationsRead(user.id, id));
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Impossible de mettre à jour la notification." },
      { status: 400 }
    );
  }
}
