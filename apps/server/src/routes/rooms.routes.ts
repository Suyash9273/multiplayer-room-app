import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "@multiplayer/db";
import { isAuthorizedForRoom } from "../socket/dmAuth.js";

const router = Router()

// Route: /api/rooms/:roomId/messages
router.get("/:roomId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
        const roomId = req.params.roomId as string;
        const cursor = req.query.cursor as string | undefined;

        if (!isAuthorizedForRoom(roomId, req.user!.id)) {
            return res.status(403).json({ error: "Forbidden" });
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

export default router;