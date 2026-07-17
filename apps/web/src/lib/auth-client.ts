import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"
import { usernameClient } from "better-auth/client/plugins";
import { setBearerToken, clearBearerToken } from "./authToken";

export const authClient = createAuthClient({
    plugins: [
        emailOTPClient(),
        usernameClient()
    ],
    fetchOptions: {
        onSuccess: (ctx) => {
            // TEMP DEBUG — remove once cross-domain login is confirmed working.
            console.log("[auth-client] request succeeded:", {
                url: ctx.response.url,
                hasSetAuthToken: ctx.response.headers.has("set-auth-token"),
            });

            // Fires on every successful call through this client — sign-in,
            // sign-up, and the getSession call useSession() makes on mount.
            // Whenever Better Auth hands us a fresh token, keep our copy in
            // sync so requests to the Railway backend use the current one.
            const authToken = ctx.response.headers.get("set-auth-token");
            if (authToken) {
                setBearerToken(authToken);
            }
        },
        onError: (ctx) => {
            // TEMP DEBUG — remove once cross-domain login is confirmed working.
            console.log("[auth-client] request errored:", ctx.response?.url, ctx.response?.status);

            // A 401 here means there's no valid session anymore (signed out
            // / expired) — drop the stale bearer token so we don't keep
            // sending the backend a token that no longer resolves.
            if (ctx.response?.status === 401) {
                clearBearerToken();
            }
        }
    }
})

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;

export async function signOut(...args: Parameters<typeof betterAuthSignOut>) {
    clearBearerToken();
    return betterAuthSignOut(...args);
}