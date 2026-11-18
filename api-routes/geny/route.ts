// Geny partner API proxy for the "Connexion internet" boutique section.
//
// The browser never talks to Geny directly (the API key must stay server-side).
// The internet catalogue is driven straight from Geny's own plan list, so the
// forfaits, prices and plan ids always match what Geny will actually sell. The
// price charged is the reseller's "Votre prix client" (customer_price.default),
// read authoritatively from Geny — never trusted from the browser.
//
//   GET  /api/geny?action=plans            -> internet forfaits to display
//   POST /api/geny { action: "create-order", orderRef, planId, phone, operator }
//   POST /api/geny { action: "otp", orderRef, otp }
//   GET  /api/geny?action=order&orderRef=...

import { genyClient, isGenyConfigured } from "../../app/lib/geny/client.ts";
import { isSameOriginRequest, getAuthenticatedUser } from "../../app/lib/auth/session.ts";
import { NovaDbService } from "../../app/lib/db/service.ts";
import type { GenyOrder, GenyOrderView, GenyPlan, GenyPlanView } from "../../app/lib/geny/types.ts";

const ORDER_REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const PLAN_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function normalizeCameroonPhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local = digits.startsWith("237") ? digits.slice(3) : digits.startsWith("00237") ? digits.slice(5) : digits;
  return /^6\d{8}$/.test(local) ? local : null;
}

function durationLabel(value: number, unit: string): string {
  const v = Number(value) || 0;
  const u = String(unit || "").toLowerCase();
  if (u.startsWith("hour")) return `${v} heure${v > 1 ? "s" : ""}`;
  if (u.startsWith("day")) return `${v} jour${v > 1 ? "s" : ""}`;
  if (u.startsWith("week")) return `${v} semaine${v > 1 ? "s" : ""}`;
  if (u.startsWith("month")) return `${v} mois`;
  return `${v} ${unit}`.trim();
}

function volumeLabel(quotaBytes: number | null): string {
  if (quotaBytes == null) return "Illimité";
  const go = Number(quotaBytes) / 1_000_000_000; // operators use decimal GB
  const text = Number.isInteger(go) ? String(go) : go.toFixed(1).replace(".", ",");
  return `${text} Go`;
}

function toPlanView(plan: GenyPlan): GenyPlanView {
  const cp = plan.customer_price;
  const price = cp ? Number(cp.default) : Number(plan.wholesale_price);
  return {
    id: plan.id,
    name: plan.name,
    durationLabel: durationLabel(plan.duration_value, plan.duration_unit),
    volumeLabel: volumeLabel(plan.quota_bytes),
    priceXaf: Math.round(price) || 0,
    min: cp ? Math.round(Number(cp.min)) : price,
    max: cp ? Math.round(Number(cp.max)) : price,
  };
}

function toOrderView(order: GenyOrder): GenyOrderView {
  return {
    ok: true,
    orderRef: order.order_ref,
    status: order.status,
    final: Boolean(order.final),
    requiresOtp: Boolean(order.payment?.requires_otp),
    otpInstruction: order.payment?.otp_instruction || "",
    code: order.status === "succeeded" ? order.code : null,
    codeKind: order.code_kind ?? null,
    planName: order.plan?.name || "",
    amount: Number(order.customer_price) || 0,
    failureCode: order.failure?.code ?? null,
    livemode: Boolean(order.livemode),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "order";

  // Consulter ses propres codes déjà achetés est une simple lecture de la base
  // locale : cela ne dépend pas de la configuration Geny, donc on la traite AVANT
  // le garde de configuration pour que "Mes codes" reste toujours fonctionnel.
  if (action === "my-codes") {
    const user = getAuthenticatedUser(request);
    if (!user) return json({ ok: false, code: "unauthorized", error: "Connexion requise." }, 401);
    try {
      return json({ ok: true, codes: NovaDbService.getInternetCodes(user.id) });
    } catch {
      return json({ ok: false, code: "service_unavailable", error: "Impossible de charger vos codes." }, 503);
    }
  }

  if (!isGenyConfigured()) {
    return json({ ok: false, code: "not_configured", error: "Le service Geny n'est pas configuré." }, 503);
  }

  if (action === "plans") {
    const result = await genyClient.getPlans();
    if (!result.ok) return json({ ok: false, code: result.errorCode, error: result.errorMessage }, result.status);
    const plans = (result.data?.data ?? [])
      .filter((p) => Array.isArray(p.modes) && p.modes.includes("direct"))
      .map(toPlanView);
    return json({ ok: true, plans, operators: result.data?.operators ?? [] });
  }

  if (action === "order") {
    const orderRef = url.searchParams.get("orderRef") || "";
    if (!ORDER_REF_RE.test(orderRef)) {
      return json({ ok: false, code: "invalid_request", error: "Référence de commande invalide." }, 400);
    }
    const result = await genyClient.getOrder(orderRef);
    if (!result.ok) {
      return json({ ok: false, code: result.errorCode, error: result.errorMessage }, result.status);
    }
    const order = result.data as GenyOrder;
    // Keep the order's lifecycle up to date in our DB (status, delivered code).
    try {
      NovaDbService.updateGenyOrderStatus(order.order_ref, {
        status: order.status,
        code: order.status === "succeeded" ? (order.code || "") : "",
        livemode: Boolean(order.livemode),
      });
    } catch { /* ignore persistence errors */ }
    // When the code is delivered and the buyer is signed in, keep it on their
    // account so it shows up under "Mes codes". Best-effort, never blocks delivery.
    if (order.status === "succeeded" && order.code) {
      const user = getAuthenticatedUser(request);
      if (user) {
        try {
          NovaDbService.saveInternetCode(user.id, {
            orderRef: order.order_ref,
            code: order.code,
            planName: order.plan?.name || "",
            amountXaf: Number(order.customer_price) || 0,
            phone: order.customer?.phone || "",
            operator: order.customer?.operator || "",
          });
        } catch {
          // ignore persistence errors
        }
      }
    }
    return json(toOrderView(order));
  }

  return json({ ok: false, code: "not_found", error: "Action inconnue." }, 404);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return json({ ok: false, code: "forbidden", error: "Origine de requête refusée." }, 403);
  }
  if (!isGenyConfigured()) {
    return json({ ok: false, code: "not_configured", error: "Le service Geny n'est pas configuré." }, 503);
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const action = String(body?.action || "");

  if (action === "create-order") {
    const orderRef = String(body?.orderRef || "");
    const planId = String(body?.planId || "");
    const operator = String(body?.operator || "");
    const phone = normalizeCameroonPhone(body?.phone);

    if (!ORDER_REF_RE.test(orderRef)) {
      return json({ ok: false, code: "invalid_request", error: "Référence de commande invalide." }, 400);
    }
    if (!PLAN_ID_RE.test(planId)) {
      return json({ ok: false, code: "invalid_request", error: "Forfait invalide." }, 400);
    }
    if (operator !== "mtn" && operator !== "orange") {
      return json({ ok: false, code: "invalid_operator", error: "Opérateur invalide." }, 400);
    }
    if (!phone) {
      return json({ ok: false, code: "invalid_phone", error: "Numéro Mobile Money camerounais invalide." }, 400);
    }

    // Validate the plan and derive the price authoritatively from Geny (never
    // from the browser): the amount charged is the reseller's configured price.
    const plansResult = await genyClient.getPlans();
    if (!plansResult.ok) {
      return json({ ok: false, code: plansResult.errorCode, error: plansResult.errorMessage }, plansResult.status);
    }
    const plan = (plansResult.data?.data ?? []).find((p) => p.id === planId);
    if (!plan || !plan.modes?.includes("direct")) {
      return json({ ok: false, code: "plan_unavailable", error: "Ce forfait n'est pas disponible." }, 404);
    }
    const cp = plan.customer_price;
    let customerPrice = cp ? Math.round(Number(cp.default)) : Math.round(Number(plan.wholesale_price));
    if (cp) customerPrice = Math.min(Math.round(cp.max), Math.max(Math.round(cp.min), customerPrice));

    const result = await genyClient.createDirectOrder({
      orderRef,
      planId,
      phone,
      operator,
      customerPrice,
    });

    if (!result.ok) {
      return json({ ok: false, code: result.errorCode, error: result.errorMessage, requestId: result.requestId }, result.status);
    }
    const order = result.data as GenyOrder;
    // Record the internet order server-side, attributed to the signed-in buyer.
    const buyer = getAuthenticatedUser(request);
    try {
      // Prix revendeur (gros) et marge = bénéfice NovaPaid. On privilégie les
      // valeurs faisant foi renvoyées par Geny, sinon on les dérive du forfait.
      const wholesaleXaf = Math.round(Number(order.wholesale_price) || Number(plan.wholesale_price) || 0);
      const amountXaf = Number(order.customer_price) || customerPrice;
      const marginXaf = Number.isFinite(Number(order.margin))
        ? Math.round(Number(order.margin))
        : Math.max(0, Math.round(amountXaf) - wholesaleXaf);
      NovaDbService.recordGenyOrderCreated({
        orderRef: order.order_ref,
        userId: buyer?.id ?? null,
        userName: buyer?.name ?? "",
        userEmail: buyer?.email ?? "",
        planId,
        planName: order.plan?.name || plan.name || "",
        amountXaf,
        wholesaleXaf,
        marginXaf,
        phone: phone || "",
        operator,
        status: order.status,
        livemode: Boolean(order.livemode),
      });
      // Instant-success plans already return the code at creation.
      if (order.status === "succeeded" && order.code) {
        NovaDbService.updateGenyOrderStatus(order.order_ref, { status: "succeeded", code: order.code });
        if (buyer) {
          NovaDbService.saveInternetCode(buyer.id, {
            orderRef: order.order_ref, code: order.code, planName: order.plan?.name || plan.name || "",
            amountXaf: Number(order.customer_price) || customerPrice, phone: phone || "", operator,
          });
        }
      }
    } catch { /* recording is best-effort; never blocks the purchase */ }
    return json(toOrderView(order), result.status === 201 ? 201 : 200);
  }

  if (action === "otp") {
    const orderRef = String(body?.orderRef || "");
    const otp = String(body?.otp || "").replace(/\s/g, "");
    if (!ORDER_REF_RE.test(orderRef)) {
      return json({ ok: false, code: "invalid_request", error: "Référence de commande invalide." }, 400);
    }
    if (!/^\d{3,8}$/.test(otp)) {
      return json({ ok: false, code: "invalid_otp", error: "Code de confirmation invalide." }, 400);
    }
    const result = await genyClient.sendOtp(orderRef, otp);
    if (!result.ok) {
      return json({ ok: false, code: result.errorCode, error: result.errorMessage }, result.status);
    }
    const order = result.data as GenyOrder;
    try {
      NovaDbService.updateGenyOrderStatus(order.order_ref, {
        status: order.status,
        code: order.status === "succeeded" ? (order.code || "") : "",
        livemode: Boolean(order.livemode),
      });
      // Dès que l'OTP valide la commande, rattacher le code au compte de l'acheteur
      // connecté pour qu'il apparaisse immédiatement dans "Mes codes".
      if (order.status === "succeeded" && order.code) {
        const buyer = getAuthenticatedUser(request);
        if (buyer) {
          NovaDbService.saveInternetCode(buyer.id, {
            orderRef: order.order_ref,
            code: order.code,
            planName: order.plan?.name || "",
            amountXaf: Number(order.customer_price) || 0,
            phone: order.customer?.phone || "",
            operator: order.customer?.operator || "",
          });
        }
      }
    } catch { /* ignore persistence errors */ }
    return json(toOrderView(order));
  }

  return json({ ok: false, code: "not_found", error: "Action inconnue." }, 404);
}
