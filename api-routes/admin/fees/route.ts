import { getAuthenticatedAdmin, isSameOriginRequest } from "../../../app/lib/auth/session.ts";
import { NovaDbService } from "../../../app/lib/db/service.ts";

function json(data: any, init?: { status?: number }) {
  return new Response(JSON.stringify(data), {
    status: init?.status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) return json({ success: false, error: "Non autorisé" }, { status: 401 });

  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "all";

  try {
    switch (section) {
      case "card_fees":
        return json({ success: true, fees: NovaDbService.getAllCardFees() });
      case "card_reload_fees":
        return json({ success: true, fees: NovaDbService.getAllCardReloadFees() });
      case "card_withdrawal_fees":
        return json({ success: true, fees: NovaDbService.getAllCardWithdrawalFees() });
      case "transfer_fees":
        return json({ success: true, fees: NovaDbService.getAllTransferFees() });
      case "exchange_rates":
        return json({ success: true, rates: NovaDbService.getAllExchangeRates() });
      case "payment_providers":
        return json({ success: true, providers: NovaDbService.getAllPaymentProviders() });
      case "all":
      default:
        return json({
          success: true,
          card_fees: NovaDbService.getAllCardFees(),
          card_reload_fees: NovaDbService.getAllCardReloadFees(),
          card_withdrawal_fees: NovaDbService.getAllCardWithdrawalFees(),
          transfer_fees: NovaDbService.getAllTransferFees(),
          exchange_rates: NovaDbService.getAllExchangeRates(),
          payment_providers: NovaDbService.getAllPaymentProviders(),
        });
    }
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) return json({ success: false, error: "Non autorisé" }, { status: 401 });
  if (!isSameOriginRequest(request)) return json({ success: false, error: "CSRF" }, { status: 403 });

  const body = await request.json();
  const { action, section, id, data } = body;

  try {
    if (section === "card_fees") {
      if (action === "create") return json(NovaDbService.createCardFee(data));
      if (action === "update") return json(NovaDbService.updateCardFee(id, data));
      if (action === "delete") return json(NovaDbService.deleteCardFee(id));
    }

    if (section === "card_reload_fees") {
      if (action === "create") return json(NovaDbService.createCardReloadFee(data, admin.id));
      if (action === "update") return json(NovaDbService.updateCardReloadFee(id, data, admin.id));
      if (action === "delete") return json(NovaDbService.deleteCardReloadFee(id));
    }

    if (section === "card_withdrawal_fees") {
      if (action === "create") return json(NovaDbService.createCardWithdrawalFee(data, admin.id));
      if (action === "update") return json(NovaDbService.updateCardWithdrawalFee(id, data, admin.id));
      if (action === "delete") return json(NovaDbService.deleteCardWithdrawalFee(id));
    }

    if (section === "transfer_fees") {
      if (action === "create") return json(NovaDbService.createTransferFee(data, admin.id));
      if (action === "update") return json(NovaDbService.updateTransferFee(id, data, admin.id));
      if (action === "delete") return json(NovaDbService.deleteTransferFee(id));
    }

    if (section === "exchange_rates") {
      if (action === "create") return json(NovaDbService.createExchangeRate(data));
      if (action === "update") return json(NovaDbService.updateExchangeRate(id, data));
      if (action === "delete") return json(NovaDbService.deleteExchangeRate(id));
    }

    if (section === "payment_providers") {
      if (action === "create") return json(NovaDbService.createPaymentProvider(data));
      if (action === "update") return json(NovaDbService.updatePaymentProvider(id, data));
      if (action === "delete") return json(NovaDbService.deletePaymentProvider(id));
    }

    return json({ success: false, error: "Section ou action inconnue" }, { status: 400 });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
