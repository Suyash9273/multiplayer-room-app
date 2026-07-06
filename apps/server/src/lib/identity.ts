import crypto from "node:crypto";
import cookie from "cookie";
import { prisma } from "@multiplayer/db";
import { GUEST_COOKIE_NAME, type Identity } from "@multiplayer/shared";

const GUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24h — anonymous identities are meant to be disposable

/**
 * The ONE place that turns "raw cookies on a request/socket" into a trusted
 * Identity. Both the socket middleware and the REST middleware call this,
 * so a guest and a logged-in user are authenticated through the exact same
 * logic path — no separate ad-hoc branches to keep in sync.
 *
 * Resolution order: a real Better Auth session always wins if present.
 * Only falls back to the guest token if there's no valid session.
 */
export async function resolveIdentity(rawCookies: string | undefined): Promise<Identity | null> {
    if (!rawCookies) return null;
    const parsed = cookie.parse(rawCookies);

    // 1. Try the real, authenticated path first (existing Better Auth logic, unchanged)
    const sessionCookie = parsed["better-auth.session_token"];
    if (sessionCookie) {
        const sessionToken = sessionCookie.split(".")[0];
        const session = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { user: true },
        });

        if (session && session.expiresAt >= new Date()) {
            return {
                type: "user",
                id: session.user.id,
                // username is what the rest of the app displays; fall back to name
                // only in the brief window before onboarding assigns a username
                displayName: session.user.username || session.user.name,
            };
        }
        // Session cookie present but invalid/expired — fall through to guest check
        // rather than hard-failing, in case the browser also holds a guest token.
    }

    // 2. Fall back to the guest path
    const guestToken = parsed[GUEST_COOKIE_NAME];
    if (guestToken) {
        const guest = await prisma.guestIdentity.findUnique({ where: { token: guestToken } });
        if (guest && guest.expiresAt >= new Date()) {
            return {
                type: "guest",
                id: guest.id,
                displayName: guest.displayName,
            };
        }
    }

    return null;
}

/**
 * Mints a brand new guest identity in the database and returns both the
 * public-safe fields (id, displayName) and the secret token to be set as
 * an httpOnly cookie by the caller. The token is never returned to the
 * client in JSON — only via the cookie — so it can't accidentally end up
 * logged, stored in state, or exposed to other scripts on the page.
 */
export async function mintGuestIdentity() {
    const token = crypto.randomBytes(32).toString("hex");
    const displayName = `Stranger-${crypto.randomInt(1000, 9999)}`;
    const expiresAt = new Date(Date.now() + GUEST_TTL_MS);

    const guest = await prisma.guestIdentity.create({
        data: { token, displayName, expiresAt, interests: [] },
    });

    return { guest, token };
}

export const GUEST_COOKIE_MAX_AGE_SECONDS = GUEST_TTL_MS / 1000;
