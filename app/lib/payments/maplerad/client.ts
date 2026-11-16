// Maplerad HTTP client — SERVER-SIDE ONLY.
// Thin typed wrapper over fetch. Authenticates with the secret key as a Bearer
// token (per Maplerad "Authentication" docs). All methods return a discriminated
// MapleradResult so callers handle failures explicitly instead of catching throws.

import { getMapleradConfig, type MapleradConfig } from "./config.ts";
import type {
  CreateCardAck,
  CreateCardRequest,
  CreateCustomerTier0Request,
  CreateUsdAccountAck,
  CreateUsdAccountRequest,
  CreateVirtualAccountNgnRequest,
  EnrollCustomerRequest,
  MapleradCard,
  MapleradCustomer,
  MapleradEnvelope,
  MapleradResult,
  MapleradVirtualAccount,
} from "./types.ts";

export class MapleradConfigError extends Error {
  constructor() {
    super("Maplerad n'est pas configuré (MAPLERAD_SECRET_KEY manquant).");
    this.name = "MapleradConfigError";
  }
}

function redact(value: string): string {
  if (value.length <= 10) return "***";
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export class MapleradClient {
  private readonly config: MapleradConfig;

  constructor(config?: MapleradConfig) {
    const resolved = config ?? getMapleradConfig();
    if (!resolved) throw new MapleradConfigError();
    this.config = resolved;
  }

  get environment() {
    return this.config.environment;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<MapleradResult<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (!res.ok) {
        const envelope = parsed as Partial<MapleradEnvelope<unknown>> | null;
        const message =
          (envelope && typeof envelope.message === "string" && envelope.message) ||
          `Maplerad ${method} ${path} a échoué (HTTP ${res.status}).`;
        return { ok: false, error: message, status: res.status, raw: parsed };
      }

      const envelope = parsed as MapleradEnvelope<T>;
      // Successful HTTP but Maplerad signalled failure via status:false.
      if (envelope && envelope.status === false) {
        return {
          ok: false,
          error: envelope.message || `Maplerad ${method} ${path} a échoué.`,
          status: res.status,
          raw: parsed,
        };
      }

      return { ok: true, data: (envelope ? envelope.data : (parsed as T)), raw: parsed };
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        error: aborted
          ? "Délai d'attente dépassé en contactant Maplerad."
          : `Erreur réseau Maplerad: ${err instanceof Error ? err.message : String(err)}`,
        status: 0,
        raw: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- Customers --------------------------------------------------------

  createCustomerTier0(payload: CreateCustomerTier0Request) {
    return this.request<MapleradCustomer>("POST", "/customers", payload);
  }

  enrollCustomer(payload: EnrollCustomerRequest) {
    return this.request<MapleradCustomer>("POST", "/customers/enroll", payload);
  }

  getCustomer(customerId: string) {
    return this.request<MapleradCustomer>("GET", `/customers/${encodeURIComponent(customerId)}`);
  }

  // ---- Issuing ----------------------------------------------------------

  createCard(payload: CreateCardRequest) {
    return this.request<CreateCardAck>("POST", "/issuing", payload);
  }

  getCard(cardId: string) {
    return this.request<MapleradCard>("GET", `/issuing/${encodeURIComponent(cardId)}`);
  }

  /** Freeze (suspend) an issued card. Maplerad: PATCH /issuing/{id}/freeze */
  freezeCard(cardId: string) {
    return this.request<MapleradCard>("PATCH", `/issuing/${encodeURIComponent(cardId)}/freeze`);
  }

  /** Unfreeze (reactivate) an issued card. Maplerad: PATCH /issuing/{id}/unfreeze */
  unfreezeCard(cardId: string) {
    return this.request<MapleradCard>("PATCH", `/issuing/${encodeURIComponent(cardId)}/unfreeze`);
  }

  // ---- Collections (bank accounts) --------------------------------------

  createVirtualAccountNgn(payload: CreateVirtualAccountNgnRequest) {
    return this.request<MapleradVirtualAccount>("POST", "/collections/virtual-account", payload);
  }

  createUsdAccount(payload: CreateUsdAccountRequest) {
    return this.request<CreateUsdAccountAck>("POST", "/collections/virtual-account/usd", payload);
  }

  getCustomerVirtualAccounts(customerId: string) {
    return this.request<MapleradVirtualAccount[]>(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/virtual-account`,
    );
  }

  describe() {
    return {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      secretKey: redact(this.config.secretKey),
    };
  }
}

/** Convenience factory. Returns null when Maplerad is not configured. */
export function createMapleradClient(): MapleradClient | null {
  const config = getMapleradConfig();
  if (!config) return null;
  return new MapleradClient(config);
}
