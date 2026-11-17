// Shared client-side session check. Distinguishes a definitive "not signed in"
// answer from the server (HTTP 401) from a transient network failure (the PWA
// reopening before connectivity is ready, the server waking up, a flaky mobile
// link). A network failure must NEVER be treated as a logout: the session
// cookie is still valid, so we retry instead of bouncing the user to /login.

export interface SessionCheck {
  /** The server confirmed a valid session. */
  authed: boolean;
  /** The authenticated user payload, when authed. */
  user: Record<string, unknown> | null;
  /** The check never got a clean answer (offline / server unreachable). */
  networkError: boolean;
}

export async function checkSession(retries = 3, delayMs = 800): Promise<SessionCheck> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("/api/auth", { credentials: "same-origin", cache: "no-store" });
      // A real HTTP answer (200 or 401) is authoritative — stop retrying.
      const data = await res.json().catch(() => null);
      if (res.ok && (data as any)?.success && (data as any)?.user) {
        return { authed: true, user: (data as any).user, networkError: false };
      }
      return { authed: false, user: null, networkError: false };
    } catch {
      // fetch rejected → no answer reached us. Retry before giving up.
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return { authed: false, user: null, networkError: true };
}
