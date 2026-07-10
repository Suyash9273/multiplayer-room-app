import { Router, Request, Response } from "express";
import { requireIdentity } from "../middleware/auth.js";
import { prisma } from "@multiplayer/db";
import { getInterests } from "../lib/interests.js";

const router = Router();

const MAX_INTERESTS = 10;
const MAX_TAG_LENGTH = 30;

// GET /api/profile/interests
// Works identically for a real user or a guest — the whole point of
// mirroring the `interests` column on both tables.
router.get("/interests", requireIdentity, async (req: Request, res: Response) => {
    try {
        const interests = await getInterests(req.identity!);
        return res.json({ interests });
    } catch (error) {
        console.error("[GET /profile/interests] Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// PUT /api/profile/interests
// Replaces the whole list (not an add/remove-one-tag endpoint) — simplest
// contract for a client that's editing a tag chip list locally and just
// wants to persist "here's the current full set" whenever it changes.
router.put("/interests", requireIdentity, async (req: Request, res: Response) => {
    try {
        const { interests } = req.body;

        if (!Array.isArray(interests) || !interests.every((tag) => typeof tag === "string")) {
            return res.status(400).json({ error: "interests must be an array of strings" });
        }

        // Normalize: trim, drop empties, dedupe (case-insensitive so "Gaming"
        // and "gaming" don't both survive), enforce sane limits so this can't
        // be abused into an unbounded array or a giant-string DoS.
        const seen = new Set<string>();
        const normalized: string[] = [];
        for (const raw of interests) {
            const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
            if (!tag) continue;
            const key = tag.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            normalized.push(tag);
            if (normalized.length >= MAX_INTERESTS) break;
        }

        const identity = req.identity!;
        if (identity.type === "user") {
            await prisma.user.update({ where: { id: identity.id }, data: { interests: normalized } });
        } else {
            await prisma.guestIdentity.update({ where: { id: identity.id }, data: { interests: normalized } });
        }

        return res.json({ interests: normalized });
    } catch (error) {
        console.error("[PUT /profile/interests] Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
