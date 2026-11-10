import { NovaDbService } from "../../lib/db/service";
import { getAuthenticatedUser } from "../../lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "articles";

  try {
    if (section === "categories") {
      const categories = NovaDbService.getAllCategories(true);
      return Response.json({ success: true, categories });
    }

    if (section === "article") {
      const id = Number(url.searchParams.get("id"));
      if (!id) return Response.json({ success: false, error: "ID requis" }, { status: 400 });
      const article = NovaDbService.getArticleById(id);
      if (!article) return Response.json({ success: false, error: "Article introuvable" }, { status: 404 });
      const views = NovaDbService.getArticleViewCount(id);
      return Response.json({ success: true, article, views });
    }

    if (section === "articles") {
      const categoryId = url.searchParams.get("category") ? Number(url.searchParams.get("category")) : undefined;
      const search = url.searchParams.get("search") || undefined;
      const articles = NovaDbService.getAllArticles({ categoryId, activeOnly: true, search });
      return Response.json({ success: true, articles });
    }

    if (section === "mes_commandes") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });
      const commandes = NovaDbService.getUserCommandes(user.id);
      return Response.json({ success: true, commandes });
    }

    if (section === "commande") {
      const user = getAuthenticatedUser(request);
      if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });
      const id = Number(url.searchParams.get("id"));
      const commande = NovaDbService.getCommandeById(id);
      if (!commande || (commande as any).user_id !== user.id) {
        return Response.json({ success: false, error: "Commande introuvable" }, { status: 404 });
      }
      return Response.json({ success: true, commande });
    }

    return Response.json({ success: false, error: "Section inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "create_commande") {
      const result = NovaDbService.createCommande(user.id, {
        article_id: body.article_id,
        quantity: body.quantity || 1,
        payment_method: body.payment_method || "wallet",
        note: body.note,
        category_fields: body.category_fields,
      });
      return Response.json(result);
    }

    if (action === "add_comment") {
      const result = NovaDbService.addCommandeComment(body.commande_id, user.id, body.content);
      return Response.json(result);
    }

    if (action === "add_article_comment") {
      const result = NovaDbService.addArticleComment(body.article_id, user.id, body.content, body.rating);
      return Response.json(result);
    }

    if (action === "track_view") {
      NovaDbService.trackArticleView(body.article_id, user.id);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
