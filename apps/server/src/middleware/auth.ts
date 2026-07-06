import { Request, Response, NextFunction } from "express";
import cookie from "cookie";
import { prisma, User } from "@multiplayer/db";
import type { Identity } from "@multiplayer/shared";
import { resolveIdentity } from "../lib/identity.js";

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
        const rawCookies = req.headers.cookie;
        if (!rawCookies) {
            return res.status(401).json({ error: "Unauthorized: No cookies" });
        }
        
        const parsedCookies = cookie.parse(rawCookies);
        const fullCookieValue = parsedCookies["better-auth.session_token"];

        if (!fullCookieValue) {
            return res.status(401).json({ error: "Unauthorized: Token missing" });
        }

        const sessionToken = fullCookieValue.split(".")[0];

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
 * `requireAuth` above, unchanged.
 */
export const requireIdentity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const identity = await resolveIdentity(req.headers.cookie);
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