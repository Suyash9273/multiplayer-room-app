import { Router, Request, Response } from "express";
import { requireAuth, requireIdentity } from "../middleware/auth.js";
import { prisma } from "@multiplayer/db";

const router = Router();

// 1. FETCH HISTORICAL MESSAGES
// Uses `requireIdentity` (not `requireAuth`) — a guest reading the history
// of a room they're a legitimate member of is exactly the "late joiner"
// problem this endpoint already solves for real users. The membership
// check below is what keeps it safe either way.
router.get("/:roomId/messages", requireIdentity, async (req: Request, res: Response) => {
    try {
        const roomId = req.params.roomId as string;
        const cursor = req.query.cursor as string | undefined;
        const identity = req.identity!;

        const membership = await prisma.roomMember.findFirst({
            where: {
                roomId,
                ...(identity.type === "user" ? { userId: identity.id } : { guestId: identity.id }),
            },
        });

        if (!membership) {
            return res.status(403).json({ error: "Forbidden: You are not in this room." });
        }

        const messages = await prisma.message.findMany({
            where: { roomId },
            take: 10,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        });

        const nextCursor = messages.length === 10 ? messages[messages.length - 1].id : null;
        const chronologicallyOrdered = messages.reverse();

        // Never let a soft-deleted message's original text leave the
        // server — same guarantee the live "messageDeleted" broadcast
        // gives, applied here so scrolling back through history can't
        // reveal it either. The client renders its own tombstone based
        // on `deletedAt` being present.
        const sanitized = chronologicallyOrdered.map((msg) =>
            msg.deletedAt ? { ...msg, message: "" } : msg
        );

        return res.json({ messages: sanitized, nextCursor });
    } catch (error) {
        console.error("Failed to fetch paginated messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// 2. GET OR CREATE DM ROOM
// Stays `requireAuth`-only and unchanged — DMs are a real-user-to-real-user
// concept, a guest identity can never be a party to one.
router.post("/dm", requireAuth, async (req: Request, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user!.id;

        if (!targetUserId) {
            return res.status(400).json({ error: "targetUserId is required" });
        }

        const existingRooms = await prisma.room.findMany({
            where: {
                type: "DIRECT",
                members: {
                    some: { userId: currentUserId }
                }
            },
            include: { members: true }
        });

        const sharedRoom = existingRooms.find(r =>
            r.members.some(m => m.userId === targetUserId)
        );

        if (sharedRoom) {
            return res.json({ roomId: sharedRoom.id });
        }

        const newRoom = await prisma.room.create({
            data: {
                type: "DIRECT",
                members: {
                    create: [
                        { userId: currentUserId },
                        { userId: targetUserId }
                    ]
                }
            }
        });

        return res.json({ roomId: newRoom.id });
    } catch (error) {
        console.error("Failed to get/create DM room:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// 3. CREATE AN ANONYMOUS ROOM
// This is intentionally the simplest possible thing that lets you test the
// guest pipeline end-to-end: mint a room, add the caller (user OR guest) as
// its first member, hand back the id so a second browser/tab can be pointed
// at the same roomId manually. Random-stranger MATCHMAKING (pairing two
// waiting guests automatically) is a separate, meatier feature that belongs
// in `matchmaking.handlers.ts` — this endpoint deliberately does not do that.
router.post("/anonymous", requireIdentity, async (req: Request, res: Response) => {
    try {
        const identity = req.identity!;

        const newRoom = await prisma.room.create({
            data: {
                type: "ANONYMOUS",
                members: {
                    create: [
                        identity.type === "user"
                            ? { userId: identity.id }
                            : { guestId: identity.id },
                    ],
                },
            },
        });

        return res.status(201).json({ roomId: newRoom.id });
    } catch (error) {
        console.error("Failed to create anonymous room:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// 4. JOIN AN EXISTING ANONYMOUS ROOM BY ID
// The counterpart to #3 — lets a second identity attach itself to an
// already-created ANONYMOUS room. Both this and #3 are the manual-testing
// scaffolding; a real matchmaking queue would call this same logic instead
// of requiring the roomId to be shared out of band.
router.post("/anonymous/:roomId/join", requireIdentity, async (req: Request, res: Response) => {
    try {
        const identity = req.identity!;
        const roomId = req.params.roomId as string;

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.type !== "ANONYMOUS") {
            return res.status(404).json({ error: "Anonymous room not found" });
        }

        const existingMembership = await prisma.roomMember.findFirst({
            where: {
                roomId,
                ...(identity.type === "user" ? { userId: identity.id } : { guestId: identity.id }),
            },
        });

        if (existingMembership) {
            return res.status(200).json({ roomId });
        }

        await prisma.roomMember.create({
            data: {
                roomId,
                ...(identity.type === "user" ? { userId: identity.id } : { guestId: identity.id }),
            },
        });

        return res.status(200).json({ roomId });
    } catch (error) {
        console.error("Failed to join anonymous room:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
