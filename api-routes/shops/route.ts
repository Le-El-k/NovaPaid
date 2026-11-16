import { NovaDbService } from "../../app/lib/db/service.ts";
import { getAuthenticatedUser } from "../../app/lib/auth/session.ts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "my_shop";

  try {
    // Public: browse shop by slug
    if (section === "public_shop") {
      const slug = url.searchParams.get("slug");
      if (!slug) return Response.json({ success: false, error: "Slug requis" }, { status: 400 });
      const shop = NovaDbService.getShopBySlug(slug);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const products = NovaDbService.getShopProducts(shop.id, false);
      return Response.json({ success: true, shop, products });
    }

    // Public: product detail
    if (section === "public_product") {
      const id = Number(url.searchParams.get("id"));
      if (!id) return Response.json({ success: false, error: "ID requis" }, { status: 400 });
      const product = NovaDbService.getShopProductById(id);
      if (!product) return Response.json({ success: false, error: "Produit introuvable" }, { status: 404 });
      return Response.json({ success: true, product });
    }

    // Guest order tracking
    if (section === "guest_order") {
      const token = url.searchParams.get("token");
      if (!token) return Response.json({ success: false, error: "Token requis" }, { status: 400 });
      const order = NovaDbService.getShopOrderByGuestToken(token);
      if (!order) return Response.json({ success: false, error: "Commande introuvable" }, { status: 404 });
      return Response.json({ success: true, order });
    }

    // Global settings (public)
    if (section === "settings") {
      return Response.json({ success: true, settings: NovaDbService.getShopGlobalSettings() });
    }

    // Auth-required sections
    const user = getAuthenticatedUser(request);
    if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });

    if (section === "my_shop") {
      const shop = NovaDbService.getUserShop(user.id);
      return Response.json({ success: true, shop: shop || null });
    }

    if (section === "my_products") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Vous n'avez pas de boutique" }, { status: 404 });
      const products = NovaDbService.getShopProducts(shop.id, true);
      return Response.json({ success: true, products });
    }

    if (section === "product_credentials") {
      const productId = Number(url.searchParams.get("product_id"));
      if (!productId) return Response.json({ success: false, error: "ID produit requis" }, { status: 400 });
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const product = NovaDbService.getShopProductById(productId);
      if (!product || (product as any).shop_id !== shop.id) return Response.json({ success: false, error: "Produit non autorisé" }, { status: 403 });
      const credentials = NovaDbService.getProductCredentials(productId);
      return Response.json({ success: true, credentials });
    }

    if (section === "my_shop_orders") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const status = url.searchParams.get("status") || undefined;
      const orders = NovaDbService.getShopOrders(shop.id, { status });
      return Response.json({ success: true, orders });
    }

    if (section === "shop_order_detail") {
      const id = Number(url.searchParams.get("id"));
      const order = NovaDbService.getShopOrderById(id);
      if (!order) return Response.json({ success: false, error: "Commande introuvable" }, { status: 404 });
      const shop = NovaDbService.getUserShop(user.id);
      const isSeller = shop && (order as any).shop_id === shop.id;
      const isBuyer = (order as any).buyer_id === user.id;
      if (!isSeller && !isBuyer) return Response.json({ success: false, error: "Non autorisé" }, { status: 403 });
      return Response.json({ success: true, order, role: isSeller ? "seller" : "buyer" });
    }

    if (section === "my_purchases") {
      const orders = NovaDbService.getBuyerShopOrders(user.id);
      return Response.json({ success: true, orders });
    }

    return Response.json({ success: false, error: "Section inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "");

    // Guest order (no auth needed)
    if (action === "guest_checkout") {
      const result = NovaDbService.createShopOrder({
        shopId: Number(body.shop_id),
        guestName: String(body.guest_name || ""),
        guestEmail: String(body.guest_email || ""),
        guestPhone: String(body.guest_phone || ""),
        items: body.items || [],
        paymentMethod: "external",
      });
      return Response.json(result, { status: 201 });
    }

    const user = getAuthenticatedUser(request);
    if (!user) return Response.json({ success: false, error: "Non authentifié" }, { status: 401 });

    if (action === "create_shop") {
      const slug = (body.slug || body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const result = NovaDbService.createShop(user.id, { name: String(body.name), slug, description: body.description, logo: body.logo, banner: body.banner, phone: body.phone, email: body.email, address: body.address });
      return Response.json(result, { status: 201 });
    }

    if (action === "update_shop") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      return Response.json(NovaDbService.updateShop(shop.id, user.id, body.data || {}));
    }

    if (action === "create_product") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      if (shop.status !== "approved") return Response.json({ success: false, error: "Boutique non approuvée" }, { status: 403 });
      return Response.json(NovaDbService.createShopProduct(shop.id, body.data || {}), { status: 201 });
    }

    if (action === "update_product") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      return Response.json(NovaDbService.updateShopProduct(Number(body.product_id), shop.id, body.data || {}));
    }

    if (action === "delete_product") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      return Response.json(NovaDbService.deleteUserShopProduct(Number(body.product_id), shop.id));
    }

    if (action === "add_credentials") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const product = NovaDbService.getShopProductById(Number(body.product_id));
      if (!product || (product as any).shop_id !== shop.id) return Response.json({ success: false, error: "Produit non autorisé" }, { status: 403 });
      const lines = String(body.credentials || "").split("\n").filter((l: string) => l.trim());
      return Response.json(NovaDbService.addProductCredentials(Number(body.product_id), lines));
    }

    if (action === "delete_credential") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const product = NovaDbService.getShopProductById(Number(body.product_id));
      if (!product || (product as any).shop_id !== shop.id) return Response.json({ success: false, error: "Non autorisé" }, { status: 403 });
      return Response.json(NovaDbService.deleteProductCredential(Number(body.credential_id), Number(body.product_id)));
    }

    if (action === "place_order") {
      const result = NovaDbService.createShopOrder({
        shopId: Number(body.shop_id),
        buyerId: user.id,
        items: body.items || [],
        paymentMethod: body.payment_method || "wallet",
      });
      return Response.json(result, { status: 201 });
    }

    if (action === "validate_item") {
      return Response.json(NovaDbService.validateShopOrderItem(Number(body.order_item_id), user.id));
    }

    if (action === "update_order_status") {
      const shop = NovaDbService.getUserShop(user.id);
      if (!shop) return Response.json({ success: false, error: "Boutique introuvable" }, { status: 404 });
      const order = NovaDbService.getShopOrderById(Number(body.order_id));
      if (!order || (order as any).shop_id !== shop.id) return Response.json({ success: false, error: "Non autorisé" }, { status: 403 });
      return Response.json(NovaDbService.updateShopOrderStatus(Number(body.order_id), String(body.status), user.id, "seller"));
    }

    return Response.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 400 });
  }
}
