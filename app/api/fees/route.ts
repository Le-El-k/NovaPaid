import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { NovaDbService } from "@/app/lib/db/service";

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const amount = Number(url.searchParams.get("amount") || 0);
  const currency = url.searchParams.get("currency") || "XAF";
  const fromCurrency = url.searchParams.get("from");
  const toCurrency = url.searchParams.get("to");

  try {
    if (type) {
      return NextResponse.json({ success: true, ...NovaDbService.estimateFees(type, amount, currency) });
    }

    if (fromCurrency && toCurrency) {
      const result = NovaDbService.convertCurrency(amount, fromCurrency, toCurrency);
      if (!result) return NextResponse.json({ success: false, error: "Paire de devises non supportée" }, { status: 400 });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({
      success: true,
      exchange_rates: NovaDbService.getExchangeRates(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
