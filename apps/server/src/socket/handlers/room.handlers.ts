import { prisma } from "@multiplayer/db";
import type { ChatMessage } from "@multiplayer/shared";
import type { AppSocket, AppServer } from "../types.js";
import {
    addUser, getOnlineUsers, joinRoom, leaveRoom,
    getUsersInRoom, socketToIdentity, roomToSockets
} from "../presence.js";

// dmAuth.js is fully deprecated now — the database (RoomMember rows) is the
// single source of truth for "who is allowed in this room", checked fresh
// on every enterRoom/sendMessage. No string-based room ID parsing needed.

// Shared by the join-message, leave-message (explicit leaveRoom), and
// leave-message (disconnect) call sites so all three system messages are
// persisted the exact same way. Returns the formatted message; the CALLER
// decides how to broadcast it (io.to vs socket.to — see disconnecting
// below, where the socket hasn't technically left the room yet and so
// needs to be excluded explicitly).
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

// Called whenever a socket leaves a room (explicit leaveRoom OR
// disconnect), AFTER presence.leaveRoom() has already run. If nobody is
// actively connected to the room anymore AND it's an ANONYMOUS room, we
// delete it — Room.delete() cascades to RoomMember and Message rows (see
// schema), so this cleans up everything in one call.
//
// Deliberately scoped to ANONYMOUS only: a DIRECT (DM) or GROUP room must
// survive both parties being offline — that's the entire point of
// persisted chat history for real accounts. Anonymous rooms are the one
// case where "nobody's here anymore" genuinely means "this conversation
// is over and nobody is ever coming back to it".
async function cleanupIfEmptyAnonymousRoom(roomId: string) {
    if (roomToSockets.has(roomId)) return; // someone's still actively connected

    try {
        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { type: true } });
        if (!room || room.type !== "ANONYMOUS") return;

        await prisma.room.delete({ where: { id: roomId } });
        console.log(`[cleanup] Deleted empty anonymous room ${roomId}`);
    } catch (error) {
        // P2025 = "record not found" — expected if two near-simultaneous
        // leaves both trigger this and the other one already deleted it.
        if ((error as { code?: string })?.code !== "P2025") {
            console.error(`[cleanup] Failed to clean up room ${roomId}:`, error);
        }
    }
}

export const registerRoomHandlers = (io: AppServer, socket: AppSocket) => {
    const identity = socket.data.identity;

    // 1. PRESENCE & LOBBY JOIN
    // No payload needed — the client can't tell us who it is, the verified
    // identity already lives on the socket from the auth middleware. We
    // ack back the resolved identity so the frontend can render the
    // correct display name without ever having asserted it itself.
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
                return; // Silently refuse
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

            // NEW: symmetric with the "left the room" message on disconnect —
            // previously only "left" existed, so a room only ever announced
            // half of the lifecycle. Fire-and-forget; entry already succeeded
            // regardless of whether this persists.
            createSystemMessage(roomId, `${identity.displayName} joined the room.`)
                .then((msg) => { if (msg) io.to(roomId).emit("receiveMessage", msg); });

            // Note: history hydration is handled by the REST API
            // (GET /api/rooms/:roomId/messages), so no fetch needed here.
        } catch (error) {
            console.error("[enterRoom] DB Error:", error);
        }
    });

    // 2b. LEAVE ROOM
    // Previously missing entirely — the frontend already emitted this event
    // on every navigation away from a room, but nothing on the server was
    // listening, so the socket stayed in the Socket.IO room and in
    // `roomToSockets` forever (until full disconnect).
    socket.on("leaveRoom", async (roomId: string) => {
        if (!socket.rooms.has(roomId)) return;

        socket.leave(roomId);
        leaveRoom(roomId, socket.id);
        io.to(roomId).emit("roomUsers", getUsersInRoom(roomId));

        // Awaited (not fire-and-forget) so the "left the room" message is
        // safely written BEFORE we potentially delete the room a few lines
        // down — otherwise a race could try to insert a message into a
        // room that no longer exists (the exact FK-violation class of bug
        // fixed earlier for the disconnecting-loop case).
        const msg = await createSystemMessage(roomId, `${identity.displayName} left the room.`);
        if (msg) io.to(roomId).emit("receiveMessage", msg);

        await cleanupIfEmptyAnonymousRoom(roomId);
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

            await cleanupIfEmptyAnonymousRoom(room);
        }
    });
};
