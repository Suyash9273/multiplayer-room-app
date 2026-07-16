import crypto from "node:crypto";
import cookie from "cookie";
import { prisma } from "@multiplayer/db";
import { GUEST_COOKIE_NAME, type Identity } from "@multiplayer/shared";

const GUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24h — anonymous identities are meant to be disposable

/**
 * Better Auth's session cookie value is `<token>.<signature>`. Both the
 * cookie path and the bearer-token path resolve to the same raw token that
 * the Session table is keyed on, so this normalization is shared between
 * them rather than duplicated.
 */
function normalizeSessionToken(raw: string): string {
    return raw.split(".")[0];
}

/**
 * Pulls a bearer token out of a standard `Authorization: Bearer <token>`
 * header. Used by the REST middleware. The socket middleware instead reads
 * the token straight from the handshake `auth` payload (see socket/index.ts)
 * since there's no header to parse there.
 */
export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
    if (!authorizationHeader) return undefined;
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
    return token;
}

async function findUserSessionByToken(rawToken: string) {
    const session = await prisma.session.findUnique({
        where: { token: normalizeSessionToken(rawToken) },
        include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session;
}

/**
 * The ONE place that turns "raw cookies / a bearer token on a request or
 * socket" into a trusted Identity. Both the socket middleware and the REST
 * middleware call this, so a guest and a logged-in user are authenticated
 * through the exact same logic path — no separate ad-hoc branches to keep
 * in sync.
 *
 * Resolution order:
 *   1. An explicit bearer token, if provided — this is how a logged-in user
 *      authenticates against this server when the frontend (Vercel) and
 *      this server (Railway) are on different domains, since Better Auth's
 *      session cookie is scoped to the Vercel domain and the browser will
 *      never send it here. See apps/web/src/lib/authToken.ts for how the
 *      client obtains and sends this token.
 *   2. A real Better Auth session cookie — still checked so this keeps
 *      working if frontend and backend ever end up on the same domain.
 *   3. The guest cookie — set directly by THIS server, so it was never
 *      subject to the cross-domain problem in the first place.
 */
export async function resolveIdentity(
    rawCookies: string | undefined,
    bearerToken?: string
): Promise<Identity | null> {
    // 1. Explicit bearer token — the primary path for logged-in users
    // across the Vercel/Railway domain split.
    if (bearerToken) {
        const session = await findUserSessionByToken(bearerToken);
        if (session) {
            return {
                type: "user",
                id: session.user.id,
                displayName: session.user.username || session.user.name,
            };
        }
        // Bearer token present but invalid/expired — fall through to
        // cookie checks rather than hard-failing, same reasoning as below.
    }

    if (!rawCookies) return null;
    const parsed = cookie.parse(rawCookies);

    // 2. The real, authenticated path via cookie (existing Better Auth logic, unchanged)
    const sessionCookie = parsed["better-auth.session_token"];
    if (sessionCookie) {
        const session = await findUserSessionByToken(sessionCookie);
        if (session) {
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

    // 3. Fall back to the guest path
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
