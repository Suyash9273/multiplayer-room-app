import { Request, Response, NextFunction } from "express";
import cookie from "cookie";
import { prisma, User } from "@multiplayer/db";

// Extend Express Request to include your user
declare global {
  namespace Express {
    interface Request {
      user?: User;
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