import { NextResponse } from "next/server";
import { getAuthenticatedAdmin, isSameOriginRequest } from "@/app/lib/auth/session";
import { NovaDbService } from "@/app/lib/db/service";

export async function GET(request: Request) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });

  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "all";

  try {
    switch (section) {
      case "card_fees":
        return NextResponse.json({ success: true, fees: NovaDbService.getAllCardFees() });
      case "card_reload_fees":
        return NextResponse.json({ success: true, fees: NovaDbService.getAllCardReloadFees() });
      case "card_withdrawal_fees":
        return NextResponse.json({ success: true, fees: NovaDbService.getAllCardWithdrawalFees() });
      case "transfer_fees":
        return NextResponse.json({ success: true, fees: NovaDbService.getAllTransferFees() });
      case "exchange_rates":
        return NextResponse.json({ success: true, rates: NovaDbService.getAllExchangeRates() });
      case "payment_providers":
        return NextResponse.json({ success: true, providers: NovaDbService.getAllPaymentProviders() });
      case "all":
      default:
        return NextResponse.json({
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
    return NextResponse.json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "CSRF" }, { status: 403 });

  const body = await request.json();
  const { action, section, id, data } = body;

  try {
    // CARD FEES
    if (section === "card_fees") {
      if (action === "create") return NextResponse.json(NovaDbService.createCardFee(data));
      if (action === "update") return NextResponse.json(NovaDbService.updateCardFee(id, data));
      if (action === "delete") return NextResponse.json(NovaDbService.deleteCardFee(id));
    }

    // CARD RELOAD FEES
    if (section === "card_reload_fees") {
      if (action === "create") return NextResponse.json(NovaDbService.createCardReloadFee(data, admin.id));
      if (action === "update") return NextResponse.json(NovaDbService.updateCardReloadFee(id, data, admin.id));
      if (action === "delete") return NextResponse.json(NovaDbService.deleteCardReloadFee(id));
    }

    // CARD WITHDRAWAL FEES
    if (section === "card_withdrawal_fees") {
      if (action === "create") return NextResponse.json(NovaDbService.createCardWithdrawalFee(data, admin.id));
      if (action === "update") return NextResponse.json(NovaDbService.updateCardWithdrawalFee(id, data, admin.id));
      if (action === "delete") return NextResponse.json(NovaDbService.deleteCardWithdrawalFee(id));
    }

    // TRANSFER FEES
    if (section === "transfer_fees") {
      if (action === "create") return NextResponse.json(NovaDbService.createTransferFee(data, admin.id));
      if (action === "update") return NextResponse.json(NovaDbService.updateTransferFee(id, data, admin.id));
      if (action === "delete") return NextResponse.json(NovaDbService.deleteTransferFee(id));
    }

    // EXCHANGE RATES
    if (section === "exchange_rates") {
      if (action === "create") return NextResponse.json(NovaDbService.createExchangeRate(data));
      if (action === "update") return NextResponse.json(NovaDbService.updateExchangeRate(id, data));
      if (action === "delete") return NextResponse.json(NovaDbService.deleteExchangeRate(id));
    }

    // PAYMENT PROVIDERS
    if (section === "payment_providers") {
      if (action === "create") return NextResponse.json(NovaDbService.createPaymentProvider(data));
      if (action === "update") return NextResponse.json(NovaDbService.updatePaymentProvider(id, data));
      if (action === "delete") return NextResponse.json(NovaDbService.deletePaymentProvider(id));
    }

    return NextResponse.json({ success: false, error: "Section ou action inconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
