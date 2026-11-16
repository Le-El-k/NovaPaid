import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser } from "../../app/lib/auth/session.ts";

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
    const url = new URL(request.url);
    const ticketId = url.searchParams.get("ticket_id");
    if (ticketId) {
      const messages = NovaDbService.listSupportMessages(Number(ticketId));
      NovaDbService.markSupportMessagesRead(Number(ticketId), "user");
      return Response.json({ success: true, messages });
    }
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

    if (body.action === "send_message") {
      const msg = NovaDbService.createSupportMessage({
        ticket_id: Number(body.ticket_id),
        sender_type: "user",
        sender_id: user.id,
        content: String(body.content || ""),
        message_type: body.message_type || "text",
        attachment_url: body.attachment_url,
        attachment_name: body.attachment_name,
        reply_to_id: body.reply_to_id ? Number(body.reply_to_id) : undefined,
      });
      return Response.json({ success: true, ...msg });
    }
    if (body.action === "react") {
      return Response.json(NovaDbService.reactToMessage(Number(body.message_id), String(body.emoji), user.id));
    }
    if (body.action === "pin_message") {
      return Response.json(NovaDbService.togglePinMessage(Number(body.message_id)));
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
