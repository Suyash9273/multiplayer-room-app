import { Server, Socket } from "socket.io";
import { prisma } from "@multiplayer/db";
import type { ChatMessage } from "@multiplayer/shared";
import {
    addUser, getOnlineUsers, joinRoom, leaveRoom,
    getUsersInRoom, socketToUser
} from "../presence.js";

// You can likely deprecate dmAuth.js entirely after this refactor, 
// as the database now acts as the ultimate source of truth for authorization.
// import { isAuthorizedForRoom } from "../dmAuth.js"; 

export const registerRoomHandlers = (io: Server, socket: Socket) => {
    
    // 1. PRESENCE & LOBBY JOIN
    socket.on("join", () => {
        // Fallback for anonymous users (Phase 4 setup)
        const username = socket.data.user?.username || socket.data.guestDisplayName || "Stranger";
        addUser(username, socket.id);
        io.emit("onlineUsers", getOnlineUsers());
    });

    // 2. SECURE ROOM ENTRY (The DB Bouncer)
    socket.on("enterRoom", async (roomId: string) => {
        const userId = socket.data.user?.id;
        const guestId = socket.data.guestId; // Prepared for Phase 4

        // Prevent joining if they have no valid session or guest identity
        if (!userId && !guestId) {
            console.warn(`[SECURITY] Unidentified socket ${socket.id} attempted to join ${roomId}`);
            return;
        }

        try {
            // THE NEW SHIELD: Verify relational membership in Prisma
            const membership = await prisma.roomMember.findFirst({
                where: {
                    roomId: roomId,
                    OR: [
                        { userId: userId },
                        { guestId: guestId }
                    ]
                }
            });

            if (!membership) {
                console.warn(`[SECURITY] User/Guest denied entry to ${roomId}. Not a member.`);
                return; // Silently refuse
            }

            if (socket.rooms.has(roomId)) {
                console.log(`[SOCKET] User ${socket.id} attempted duplicate join for ${roomId}`);
                return; 
            }

            socket.join(roomId);
            joinRoom(roomId, socket.id);
            
            // Note: History hydration is currently handled by your REST API, 
            // so we don't need to fetch messages here unless you want to move it to WebSockets.

        } catch (error) {
            console.error("[enterRoom] DB Error:", error);
        }
    });

    // 3. SECURE MESSAGE BROADCASTING
    socket.on("sendMessage", async (payload: { message: string; roomId: string; type?: string }) => {
        const { roomId, message, type = "USER" } = payload;
        
        const userId = socket.data.user?.id;
        const guestId = socket.data.guestId;
        const displayName = socket.data.user?.name || socket.data.user?.username || "Stranger";

        try {
            // ENFORCE AUTHORIZATION: Ensure they weren't kicked/removed before sending
            const membership = await prisma.roomMember.findFirst({
                where: {
                    roomId: roomId,
                    OR: [{ userId: userId }, { guestId: guestId }]
                }
            });

            if (!membership) {
                console.warn(`[SECURITY] Unauthorized message attempt in ${roomId}`);
                return;
            }

            // Persist message using the new schema structure
            const savedMessage = await prisma.message.create({
                data: {
                    roomId,
                    message,
                    senderId: userId || guestId,
                    senderDisplayName: displayName,
                    type: type
                }
            });

            // Map exactly to the updated Shared ChatMessage interface
            const outgoingMessage: ChatMessage = {
                id: savedMessage.id,
                roomId: savedMessage.roomId,
                message: savedMessage.message,
                senderId: savedMessage.senderId ?? undefined,
                senderDisplayName: savedMessage.senderDisplayName,
                timestamp: savedMessage.createdAt.getTime(),
                status: "sent",
                type: (savedMessage.type as "USER" | "SYSTEM"),
                isRead: false
            };

            // Broadcast to the room (and they will receive it because they are in the Socket.IO room)
            io.to(roomId).emit("receiveMessage", outgoingMessage);

        } catch (error) {
            console.error("[sendMessage] Error:", error);
        }
    });

    // 4. TYPING INDICATORS (Unchanged, just uses the map)
    socket.on("typing", (roomId: string) => {
        const username = socketToUser.get(socket.id);
        socket.to(roomId).emit("userTyping", username);
    });

    socket.on("stopTyping", (roomId: string) => {
        const username = socketToUser.get(socket.id);
        socket.to(roomId).emit("userStoppedTyping", username);
    });

    // 5. DISCONNECT & CLEANUP
    socket.on("disconnecting", async () => {
        const username = socketToUser.get(socket.id);

        for (const room of socket.rooms) {
            if (room === socket.id) continue;

            if (username) {
                try {
                    // Create system message using the new schema
                    const sysMsg = await prisma.message.create({
                        data: {
                            roomId: room,
                            message: `${username} left the room.`,
                            senderId: null, // System messages have no senderId
                            senderDisplayName: "System",
                            type: "SYSTEM"
                        }
                    });

                    const formattedSysMsg: ChatMessage = {
                        id: sysMsg.id,
                        roomId: sysMsg.roomId,
                        message: sysMsg.message,
                        senderDisplayName: sysMsg.senderDisplayName,
                        timestamp: sysMsg.createdAt.getTime(),
                        status: "sent",
                        type: "SYSTEM"
                    };

                    socket.to(room).emit("receiveMessage", formattedSysMsg);
                } catch (error) {
                    console.error("[disconnecting] SysMsg Error:", error);
                }
            }
            leaveRoom(room, socket.id);
        }
    });
}