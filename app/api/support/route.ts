import { NovaDbService } from "../../lib/db/service.ts";
import { getAuthenticatedUser } from "../../lib/auth/session.ts";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  try {
    return Response.json({ success: true, tickets: NovaDbService.getUserSupportTickets(user.id) });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Demandes indisponibles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return Response.json({ success: false, error: "Connexion requise." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ success: false, error: "Origine de requête refusée." }, { status: 403 });
  try {
    const body = await request.json();

    // User reply to existing ticket
    if (body.action === "reply" || body.action === "reply_ticket") {
      const ticketId = Number(body.ticketId);
      if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
        return Response.json({ success: false, error: "Numéro de ticket invalide." }, { status: 400 });
      }
      NovaDbService.addUserTicketReply(user.id, ticketId, String(body.message || ""));
      return Response.json({
        success: true,
        tickets: NovaDbService.getUserSupportTickets(user.id),
      });
    }

    // New support ticket
    const retryAfter = NovaDbService.checkAuthRateLimit(`support-ticket:${user.id}`, 10, 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
    if (retryAfter) return Response.json({ success: false, error: "Trop de demandes aujourd’hui. Réessayez demain." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    
    const result = NovaDbService.createSupportTicket(user.id, {
      category: String(body.category || "other"),
      subject: String(body.subject || ""),
      message: String(body.message || ""),
      transactionRef: String(body.transactionRef || ""),
    });
    return Response.json(result, { status: 201 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Envoi de la demande impossible." }, { status: 400 });
  }
}
