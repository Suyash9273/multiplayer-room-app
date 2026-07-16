// The backend (Railway) and this app (Vercel) are different domains, so
// Better Auth's session cookie — scoped to this app's own domain — never
// reaches the backend. Instead, Better Auth's `bearer()` plugin (see
// apps/web/src/lib/auth.ts) hands us the same session token via a response
// header on every authenticated request, and we store it here so it can be
// sent explicitly to the backend over REST (Authorization header) and
// Socket.IO (handshake `auth` payload).
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
