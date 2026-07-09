import { prisma } from "@multiplayer/db";
import type { ChatMessage } from "@multiplayer/shared";
import type { AppSocket, AppServer } from "../types.js";
import {
    addUser, getOnlineUsers, joinRoom, leaveRoom,
    getUsersInRoom, socketToIdentity, roomToSockets
} from "../presence.js";


async function createSystemMessage(roomId: string, text: string): Promise<ChatMessage | null> {
    try {
        const sysMsg = await prisma.message.create({
            data: {
                roomId,
                message: text,
                senderId: null,
                senderDisplayName: "System",
                type: "SYSTEM",
            },
        });

        return {
            id: sysMsg.id,
            roomId: sysMsg.roomId,
            message: sysMsg.message,
            senderDisplayName: sysMsg.senderDisplayName,
            timestamp: sysMsg.createdAt.getTime(),
            status: "sent",
            type: "SYSTEM",
        };
    } catch (error) {
        console.error("[createSystemMessage] Error:", error);
        return null;
    }
}

export const registerRoomHandlers = (io: AppServer, socket: AppSocket) => {
    const identity = socket.data.identity;

    // 1. PRESENCE & LOBBY JOIN
    socket.on("join", (ack?: (identity: { id: string; displayName: string; type: string }) => void) => {
        addUser(identity, socket.id);
        io.emit("onlineUsers", getOnlineUsers());
        ack?.({ id: identity.id, displayName: identity.displayName, type: identity.type });
    });

    // 2. SECURE ROOM ENTRY (The DB Bouncer)
    socket.on("enterRoom", async (roomId: string) => {
        try {
            // THE SHIELD: Verify relational membership in Prisma. Works
            // identically for a User row or a GuestIdentity row — that's
            // the whole point of the RoomMember.userId/guestId split.
            const membership = await prisma.roomMember.findFirst({
                where: {
                    roomId,
                    ...(identity.type === "user"
                        ? { userId: identity.id }
                        : { guestId: identity.id }),
                },
            });

            if (!membership) {
                console.warn(`[SECURITY] ${identity.type}:${identity.id} denied entry to ${roomId}. Not a member.`);
                return; 
            }

            if (socket.rooms.has(roomId)) {
                console.log(`[SOCKET] ${socket.id} attempted duplicate join for ${roomId}`);
                return;
            }

            socket.join(roomId);
            joinRoom(roomId, socket.id);

            // Let everyone already in the room (including this socket) know
            // the current roster. The frontend listens for this via `roomUsers`.
            io.to(roomId).emit("roomUsers", getUsersInRoom(roomId));

            createSystemMessage(roomId, `${identity.displayName} joined the room.`)
                .then((msg) => { if (msg) io.to(roomId).emit("receiveMessage", msg); });

            // Note: history hydration is handled by the REST API
            // (GET /api/rooms/:roomId/messages), so no fetch needed here.
        } catch (error) {
            console.error("[enterRoom] DB Error:", error);
        }
    });

    // 2b. LEAVE ROOM
    socket.on("leaveRoom", (roomId: string) => {
        if (!socket.rooms.has(roomId)) return;

        socket.leave(roomId);
        leaveRoom(roomId, socket.id);
        io.to(roomId).emit("roomUsers", getUsersInRoom(roomId));
        createSystemMessage(roomId, `${identity.displayName} left the room.`)
            .then((msg) => { if (msg) io.to(roomId).emit("receiveMessage", msg); });
    });

    // 3. SECURE MESSAGE BROADCASTING
    socket.on(
        "sendMessage",
        async (
            payload: { message: string; roomId: string; type?: string; id?: string },
            ack?: (receipt: { status: "success" | "error"; data?: ChatMessage; error?: string }) => void
        ) => {
            const { roomId, message, type = "USER", id } = payload;

            try {
                // ENFORCE AUTHORIZATION: Ensure they weren't kicked/removed before sending
                const membership = await prisma.roomMember.findFirst({
                    where: {
                        roomId,
                        ...(identity.type === "user"
                            ? { userId: identity.id }
                            : { guestId: identity.id }),
                    },
                });

                if (!membership) {
                    console.warn(`[SECURITY] Unauthorized message attempt in ${roomId} by ${identity.type}:${identity.id}`);
                    ack?.({ status: "error", error: "Not a member of this room" });
                    return;
                }

                // Persist message. senderDisplayName is ALWAYS taken from the
                // server-verified identity, never from the client payload —
                // preserves the Zero-Trust Payload guarantee.
                //
                // `id` (if provided) is the client's own optimistically-
                // generated id, reused here instead of letting Prisma mint a
                // new one. That's what lets the broadcast below reconcile
                // with the sender's optimistic message on the frontend
                // (matched by id) instead of showing up as a duplicate.
                const savedMessage = await prisma.message.create({
                    data: {
                        ...(id ? { id } : {}),
                        roomId,
                        message,
                        senderId: identity.id,
                        senderDisplayName: identity.displayName,
                        type,
                    },
                });

                const outgoingMessage: ChatMessage = {
                    id: savedMessage.id,
                    roomId: savedMessage.roomId,
                    message: savedMessage.message,
                    senderId: savedMessage.senderId ?? undefined,
                    senderDisplayName: savedMessage.senderDisplayName,
                    timestamp: savedMessage.createdAt.getTime(),
                    status: "sent",
                    type: savedMessage.type as "USER" | "SYSTEM",
                    isRead: false,
                };

                // Broadcast to the whole room (sender included — they're in it too)
                io.to(roomId).emit("receiveMessage", outgoingMessage);

                // THE FIX: this ack was never being called before, so the
                // frontend's optimistic message was permanently stuck on
                // "pending". This is what flips it to "sent".
                ack?.({ status: "success", data: outgoingMessage });
            } catch (error) {
                console.error("[sendMessage] Error:", error);
                ack?.({ status: "error", error: "Internal Server Error" });
            }
        }
    );

    // 3b. READ RECEIPTS
    // Client calls this whenever it's actively looking at a room (on entry,
    // and again whenever new messages arrive while still open). We mark
    // every message NOT sent by the reader as read, and tell the room —
    // that's what flips the ORIGINAL SENDER's own tick from single to
    // double, on their screen.
    socket.on("markRead", async (roomId: string) => {
        try {
            const membership = await prisma.roomMember.findFirst({
                where: {
                    roomId,
                    ...(identity.type === "user"
                        ? { userId: identity.id }
                        : { guestId: identity.id }),
                },
            });
            if (!membership) return;

            const readAt = new Date();
            const { count } = await prisma.message.updateMany({
                where: {
                    roomId,
                    type: "USER",
                    isRead: false,
                    senderId: { not: identity.id }, // never mark your own messages "read"
                },
                data: { isRead: true, readAt },
            });

            if (count > 0) {
                io.to(roomId).emit("messagesRead", { roomId, readAt: readAt.getTime() });
            }
        } catch (error) {
            console.error("[markRead] Error:", error);
        }
    });

    // 4. TYPING INDICATORS
    socket.on("typing", (roomId: string) => {
        const entry = socketToIdentity.get(socket.id);
        if (entry) socket.to(roomId).emit("userTyping", entry.displayName);
    });

    socket.on("stopTyping", (roomId: string) => {
        const entry = socketToIdentity.get(socket.id);
        if (entry) socket.to(roomId).emit("userStoppedTyping", entry.displayName);
    });

    // 5. DISCONNECT & CLEANUP
    socket.on("disconnecting", async () => {
        const entry = socketToIdentity.get(socket.id);

        for (const room of socket.rooms) {
            if (room === socket.id) continue;

            // THE FIX: `socket.rooms` also contains virtual/non-chat rooms —
            // specifically `user:${id}`, joined in socket/index.ts for
            // authenticated users' future notifications. That's not backed
            // by a real `Room` row, so treating it like a chat room here
            // caused a foreign key violation on every disconnect for logged
            // -in users. `roomToSockets` is OUR OWN bookkeeping of rooms
            // actually entered via `enterRoom`/`joinRoom` — only those are
            // real chat rooms.
            if (!roomToSockets.get(room)?.has(socket.id)) continue;

            if (entry) {
                const msg = await createSystemMessage(room, `${entry.displayName} left the room.`);
                // socket.to (NOT io.to) — at "disconnecting" time the socket
                // is still technically in `room`, so io.to would deliver this
                // to the very client that's about to disconnect anyway.
                if (msg) socket.to(room).emit("receiveMessage", msg);
            }

            leaveRoom(room, socket.id);
            // Recompute for whoever's left, after this socket's leave is applied
            socket.to(room).emit("roomUsers", getUsersInRoom(room));
        }
    });
};
