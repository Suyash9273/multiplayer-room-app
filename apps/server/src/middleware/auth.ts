import { Request, Response, NextFunction } from "express";
import cookie from "cookie";
import { prisma, User } from "@multiplayer/db";
import type { Identity } from "@multiplayer/shared";
import { resolveIdentity, extractBearerToken } from "../lib/identity.js";

// Extend Express Request to include your user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      // Normalized identity (user OR guest). Set by `requireIdentity`.
      // `req.user` above stays authenticated-user-only, for routes
      // (friends, DMs) that guests should never be able to reach.
      identity?: Identity;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Bearer token first — this is how a logged-in user authenticates
        // when the frontend (Vercel) and this server (Railway) are on
        // different domains, since the Better Auth session cookie is
        // scoped to the Vercel domain and never reaches this server.
        const bearerToken = extractBearerToken(req.headers.authorization);

        let sessionToken: string | undefined = bearerToken;
        if (!sessionToken) {
            const rawCookies = req.headers.cookie;
            if (!rawCookies) {
                return res.status(401).json({ error: "Unauthorized: No cookies" });
            }
            const parsedCookies = cookie.parse(rawCookies);
            // Better Auth prefixes this cookie with `__Secure-` in
            // production (any HTTPS deployment) — check both.
            const rawSessionCookie =
                parsedCookies["__Secure-better-auth.session_token"] ?? parsedCookies["better-auth.session_token"];
            sessionToken = rawSessionCookie?.split(".")[0];
        } else {
            sessionToken = sessionToken.split(".")[0];
        }

        if (!sessionToken) {
            return res.status(401).json({ error: "Unauthorized: Token missing" });
        }

        const session = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { user: true }
        });

        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: "Unauthorized: Invalid session" });
        }

        req.user = session.user;
        next();
    } catch (error) {
        console.error("REST Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Like `requireAuth`, but also accepts a guest identity. Use this on any
 * route an anonymous stranger should legitimately be able to hit — right
 * now that's room membership checks and message history. Routes that only
 * make sense for a real account (friends, DMs, profile) should keep using
 * `requireAuth`.
 */
export const requireIdentity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bearerToken = extractBearerToken(req.headers.authorization);
        const identity = await resolveIdentity(req.headers.cookie, bearerToken);
        if (!identity) {
            return res.status(401).json({ error: "Unauthorized: No valid session or guest token" });
        }
        req.identity = identity;
        next();
    } catch (error) {
        console.error("REST Identity Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};