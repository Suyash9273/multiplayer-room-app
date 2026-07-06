import { Router, Request, Response } from "express";
import type { GuestMintResponse } from "@multiplayer/shared";
import { GUEST_COOKIE_NAME } from "@multiplayer/shared";
import { mintGuestIdentity, resolveIdentity, GUEST_COOKIE_MAX_AGE_SECONDS } from "../lib/identity.js";

const router = Router();

// POST /api/guest
// Deliberately has NO auth requirement — this IS the entry point for
// people who don't have an account. If the caller already has a valid
// guest cookie (or a real session), we hand back their existing identity
// instead of minting a redundant new one on every page refresh.
router.post("/", async (req: Request, res: Response) => {
    try {
        const existing = await resolveIdentity(req.headers.cookie);
        if (existing) {
            const body: GuestMintResponse = { id: existing.id, displayName: existing.displayName };
            return res.status(200).json(body);
        }

        const { guest, token } = await mintGuestIdentity();

        res.cookie(GUEST_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: GUEST_COOKIE_MAX_AGE_SECONDS * 1000,
            path: "/",
        });

        const body: GuestMintResponse = { id: guest.id, displayName: guest.displayName };
        return res.status(201).json(body);
    } catch (error) {
        console.error("[POST /api/guest] Failed to mint guest identity:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
