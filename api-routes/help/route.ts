import { NovaDbService } from "../../app/lib/db/service.ts";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (slug) {
      const article = NovaDbService.getHelpArticle(slug);
      if (!article) return Response.json({ success: false, error: "Article introuvable" }, { status: 404 });
      return Response.json({ success: true, article });
    }
    const category = url.searchParams.get("category") || undefined;
    return Response.json({ success: true, articles: NovaDbService.listHelpArticles(category) });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Erreur" }, { status: 500 });
  }
}
