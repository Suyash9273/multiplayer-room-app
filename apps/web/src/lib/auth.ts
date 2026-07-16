import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "@multiplayer/db";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    // NEW: We tell Better Auth to track our custom column!
    user: {
        additionalFields: {
            username: {
                type: "string",
                required: false,
                unique: true
            }
        }
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    },
    // Our Express/Socket.IO server lives on a different domain (Railway),
    // so it can never see this app's session cookie. The bearer plugin adds
    // a `set-auth-token` response header on authenticated requests, which
    // the client stores and forwards to that server explicitly instead —
    // see apps/web/src/lib/authToken.ts and apps/web/src/lib/auth-client.ts.
    plugins: [bearer()]
});