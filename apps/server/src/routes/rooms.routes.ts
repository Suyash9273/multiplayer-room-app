import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "@multiplayer/db";
// import { isAuthorizedForRoom } from "../socket/dmAuth.js"; <-- DEPRECATED

const router = Router();

// 1. FETCH HISTORICAL MESSAGES
router.get("/:roomId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
        const roomId = req.params.roomId as string;
        const cursor = req.query.cursor as string | undefined;

        // THE REST API BOUNCER: Verify relational membership using the new schema
        const membership = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: req.user!.id
            }
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

        return res.json({ messages: chronologicallyOrdered, nextCursor });
    } catch (error) {
        console.error("Failed to fetch paginated messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// 2. GET OR CREATE DM ROOM (The Missing Link for Phase 3)
router.post("/dm", requireAuth, async (req: Request, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user!.id;

        if (!targetUserId) {
            return res.status(400).json({ error: "targetUserId is required" });
        }

        // STEP 1: Check if a DIRECT room already exists between these two exact users.
        // We find all DIRECT rooms the current user is in, and include the members.
        const existingRooms = await prisma.room.findMany({
            where: {
                type: "DIRECT",
                members: {
                    some: { userId: currentUserId }
                }
            },
            include: { members: true }
        });

        // Search the returned rooms to see if the target user is also a member.
        const sharedRoom = existingRooms.find(r => 
            r.members.some(m => m.userId === targetUserId)
        );

        // If found, return the existing UUID.
        if (sharedRoom) {
            return res.json({ roomId: sharedRoom.id });
        }

        // STEP 2: If no room exists, create a new relational Room with two RoomMembers.
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

export default router;