import { getBearerToken } from "./authToken";

/**
 * Drop-in replacement for `fetch()` for calls to the Railway backend.
 * Keeps `credentials: "include"` (still needed for the guest cookie, which
 * IS same-domain to the backend and works fine cross-site with
 * SameSite=None) and additionally attaches the bearer token, if we have
 * one, as an Authorization header — that's the part that lets a logged-in
 * user's requests succeed even though the Better Auth session cookie can't
 * cross from this app's domain to the backend's domain.
 */
export function apiFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
    const token = getBearerToken();
    const headers = new Headers(init.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, {
        ...init,
        credentials: "include",
        headers,
    });
}