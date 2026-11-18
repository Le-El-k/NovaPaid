const AUTH_RETURN_PATHS = new Set([
  "/dashboard",
  "/dashboard/boutique",
  "/cards",
  "/wallet",
  "/transfers",
  "/funding",
  "/history",
  "/support",
  "/settings",
  "/marketplace",
  "/my-shop",
  "/help",
  "/profile",
  "/transactions",
  "/reseller",
  "/notifications",
]);

export function resolveAuthRedirect(search: string): string {
  const requested = new URLSearchParams(search).get("redirect");
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return "/dashboard/boutique";
  }

  try {
    const target = new URL(requested, "https://novapaid.invalid");
    const pathname = target.pathname.replace(/\/+$/, "") || "/";
    if (target.origin !== "https://novapaid.invalid" || !AUTH_RETURN_PATHS.has(pathname)) {
      return "/dashboard/boutique";
    }

    return `${pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard/boutique";
  }
}
