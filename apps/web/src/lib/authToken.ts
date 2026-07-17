// The backend (Railway) and this app (Vercel) are different domains, so
// Better Auth's session cookie — scoped to this app's own domain — never
// reaches the backend. Instead, we fetch the same raw session token via our
// own /api/session-token route (see syncBearerToken below) and store it
// here so it can be sent explicitly to the backend over REST (Authorization
// header) and Socket.IO (handshake `auth` payload).
//
// Guests don't need any of this — the guest cookie is set directly by the
// backend itself, so it was never subject to the cross-domain problem.

const STORAGE_KEY = "auth_bearer_token";

export function getBearerToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
}

export function setBearerToken(token: string | null | undefined) {
    if (typeof window === "undefined") return;
    if (token) {
        window.localStorage.setItem(STORAGE_KEY, token);
    } else {
        window.localStorage.removeItem(STORAGE_KEY);
    }
}

export function clearBearerToken() {
    setBearerToken(null);
}

/**
 * Fetches the current session's raw token from our own same-origin
 * endpoint (apps/web/src/app/api/session-token/route.ts) and stores it.
 * Call this whenever a session becomes active — see the useEffect in
 * LoginScreen.tsx. Safe to call even when there's no session; the endpoint
 * just returns { token: null } and we clear our copy to match.
 */
export async function syncBearerToken(): Promise<void> {
    try {
        const res = await fetch("/api/session-token", { credentials: "include" });
        const { token } = await res.json();
        setBearerToken(token);
    } catch (err) {
        console.error("Failed to sync bearer token:", err);
    }
}
