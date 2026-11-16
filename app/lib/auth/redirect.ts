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
  "/boutique",
  "/boutique/jeux-video",
  "/boutique/pieces-tiktok",
  "/boutique/connexion-internet",
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
    return "/dashboard";
  }

  try {
    const target = new URL(requested, "https://novapaid.invalid");
    const pathname = target.pathname.replace(/\/+$/, "") || "/";
    if (target.origin !== "https://novapaid.invalid" || !AUTH_RETURN_PATHS.has(pathname)) {
      return "/dashboard";
    }

    return `${pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard";
  }
}
