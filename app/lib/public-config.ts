// Client : configuration publique des fournisseurs, lue en base via /api/public-config.
// Remplace les anciennes variables NEXT_PUBLIC_* (plus aucun .env).
import { getAssetPath } from "@/app/lib/asset-path";

export type PublicConfig = {
  soleaspay?: { api_key?: string };
  proxies?: { sebpay_url?: string; leekpay_url?: string };
  emailjs?: { service_id?: string; template_id?: string; public_key?: string };
};

let pending: Promise<PublicConfig> | null = null;

export function getPublicConfig(): Promise<PublicConfig> {
  if (!pending) {
    pending = fetch(getAssetPath("/api/public-config"), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => (data?.config || {}) as PublicConfig)
      .catch(() => {
        pending = null; // réessayer au prochain appel
        return {} as PublicConfig;
      });
  }
  return pending;
}
