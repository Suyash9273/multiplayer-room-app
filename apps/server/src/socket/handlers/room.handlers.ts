import { Server, Socket } from "socket.io";
import { prisma } from "@multiplayer/db";
import type { ChatMessage } from "@multiplayer/shared";
import {
    addUser, getOnlineUsers, joinRoom, leaveRoom,
    getUsersInRoom, socketToUser
} from "../presence.js";

import { isAuthorizedForRoom } from "../dmAuth.js";

export const registerRoomHandlers = (io: Server, socket: Socket) => {
    socket.on("join", () => {
        const username = socket.data.user.username;
        addUser(username, socket.id);
        io.emit("onlineUsers", getOnlineUsers());
    });

    socket.on("enterRoom", async (roomId: string) => {
        // THE BACKEND SHIELD: 
        // socket.rooms is a native Set containing all rooms this socket is currently in.

        if (!isAuthorizedForRoom(roomId, socket.data.user.id)) {
            console.warn(`[SECURITY] ${socket.data.user.username} denied entry to ${roomId}`);
            return; // silently refuse — don't leak whether the room "exists"
        }

        if (socket.rooms.has(roomId)) {
            console.log(`[SOCKET] User ${socket.id} attempted duplicate join for ${roomId}`);
            return; // Silently abort! Do not broadcast a system message.
        }

        socket.join(roomId);
        joinRoom(roomId, socket.id);

        if (roomId.startsWith("dm:")) {
            // Mark all unread messages in this room as read (where sender is NOT current user)
            const updated = await prisma.message.updateMany({
                where: {
                    roomId,
                    isRead: false,
                    NOT: { sender: socket.data.user.username }
                },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            })

            if (updated.count > 0) {
                io.to(roomId).except(socket.id).emit("messagesRead", {
                    roomId,
                    readAt: Date.now()
                })
            }
        }

        const username = socketToUser.get(socket.id);
        if (username) {
            try {
                const sysMsg = await prisma.message.create({
                    data: {
                        roomId,
                        message: `${username} joined the room.`,
                        sender: "System",
                        type: "SYSTEM"
                    }
                });

                const formattedSysMsg: ChatMessage = {
                    id: sysMsg.id,
                    roomId: sysMsg.roomId,
                    message: sysMsg.message,
                    sender: sysMsg.sender,
                    timestamp: sysMsg.createdAt.getTime(),
                    status: "sent",
                    type: "SYSTEM"
                };

                socket.to(roomId).emit("receiveMessage", formattedSysMsg);
            } catch (error) {
                console.error(error);
            }
        }
        io.to(roomId).emit("roomUsers", getUsersInRoom(roomId));
    });

    socket.on("leaveRoom", async (roomId: string) => {
        const username = socketToUser.get(socket.id)

        // memory + network first
        leaveRoom(roomId, socket.id)
        socket.leave(roomId)

        // system message
        if (username) {
            try {
                const sysMsg = await prisma.message.create({
                    data: {
                        roomId,
                        message: `${username} left the room.`,
                        sender: "System",
                        type: "SYSTEM"
                    }
                })

                const formattedSysMsg: ChatMessage = {
                    id: sysMsg.id,
                    roomId: sysMsg.roomId,
                    message: sysMsg.message,
                    sender: sysMsg.sender,
                    timestamp: sysMsg.createdAt.getTime(),
                    status: "sent",
                    type: "SYSTEM"
                }

                // socket.leave already ran, so socket.to correctly
                // reaches only the remaining members, not the leaver
                socket.to(roomId).emit("receiveMessage", formattedSysMsg)
            } catch (error) {
                console.error(error)
            }
        }

        socket.to(roomId).emit("roomUsers", getUsersInRoom(roomId))
    })

    socket.on("sendMessage", async (payload: ChatMessage, callback) => {
        
        if (!isAuthorizedForRoom(payload.roomId, socket.data.user.id)) {
            console.warn(`[SECURITY] ${socket.data.user.username} tried to send into ${payload.roomId} without access`);
            return;
        }

        try {
            const trustedSender = socket.data.user.username
            const savedMessage = await prisma.message.create({
                data: {
                    id: payload.id,
                    roomId: payload.roomId,
                    message: payload.message,
                    sender: trustedSender
                }
            });

            const trustedPayload: ChatMessage = {
                ...payload,
                sender: trustedSender,
            };

            // ADD THIS BLOCK ↓
            if (payload.roomId.startsWith("dm:")) {
                const socketsInRoom = await io.in(payload.roomId).fetchSockets()
                const otherPersonIsPresent = socketsInRoom.some(s => s.id !== socket.id)

                if (otherPersonIsPresent) {
                    await prisma.message.update({
                        where: { id: savedMessage.id },
                        data: { isRead: true, readAt: new Date() }
                    })
                    // Tell the sender their message was instantly read
                    socket.emit("messagesRead", {
                        roomId: payload.roomId,
                        readAt: Date.now()
                    })
                }
            }
            // ADD THIS BLOCK END ↑

            socket.to(payload.roomId).emit("receiveMessage", trustedPayload);

            if (callback) {
                callback({ status: "sent", id: payload.id });
            }
        } catch (error) {
            console.error("Failed to save message", error);
        }
    });

    socket.on("typing", (roomId: string) => {
        const username = socketToUser.get(socket.id);
        socket.to(roomId).emit("userTyping", username);
    });

    socket.on("stopTyping", (roomId: string) => {
        const username = socketToUser.get(socket.id);
        socket.to(roomId).emit("userStoppedTyping", username);
    });

    socket.on("disconnecting", async () => {
        const username = socketToUser.get(socket.id);

        for (const room of socket.rooms) {
            if (room === socket.id) continue;

            if (username) {
                try {
                    const sysMsg = await prisma.message.create({
                        data: {
                            roomId: room,
                            message: `${username} left the room.`,
                            sender: "System",
                            type: "SYSTEM"
                        }
                    });

                    const formattedSysMsg: ChatMessage = {
                        id: sysMsg.id,
                        roomId: sysMsg.roomId,
                        message: sysMsg.message,
                        sender: sysMsg.sender,
                        timestamp: sysMsg.createdAt.getTime(),
                        status: "sent",
                        type: "SYSTEM"
                    };

                    socket.to(room).emit("receiveMessage", formattedSysMsg);
                } catch (error) {
                    console.error(error);
                }
            }
            leaveRoom(room, socket.id);
        }
    });
}