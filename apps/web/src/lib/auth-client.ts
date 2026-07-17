import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"
import { usernameClient } from "better-auth/client/plugins";
import { clearBearerToken } from "./authToken";

export const authClient = createAuthClient({
    plugins: [
        emailOTPClient(),
        usernameClient()
    ]
})

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;

export async function signOut(...args: Parameters<typeof betterAuthSignOut>) {
    clearBearerToken();
    return betterAuthSignOut(...args);
}