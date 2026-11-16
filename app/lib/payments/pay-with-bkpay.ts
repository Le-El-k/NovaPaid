// Client helper: start a BKApay payment. Creates a server-side session via the
// init endpoint, then redirects the browser to BKApay's hosted payment page.
export async function payWithBkpay(params: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/payments/bkpay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.paymentUrl) {
    throw new Error(data?.error || "BKApay indisponible pour le moment.");
  }
  window.location.href = data.paymentUrl as string;
}
