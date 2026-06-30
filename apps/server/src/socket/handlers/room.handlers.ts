import { Server, Socket } from "socket.io";
import { prisma } from "@multiplayer/db";
import type { ChatMessage } from "@multiplayer/shared";
import {
    addUser, getOnlineUsers, joinRoom, leaveRoom,
    getUsersInRoom, socketToUser
} from "../presence.js";

export const registerRoomHandlers = (io: Server, socket: Socket) => {
    socket.on("join", () => {
        const username = socket.data.user.username;
        addUser(username, socket.id);
        io.emit("onlineUsers", getOnlineUsers());
    });

    socket.on("enterRoom", async (roomId: string) => {
        // THE BACKEND SHIELD: 
        // socket.rooms is a native Set containing all rooms this socket is currently in.
        if (socket.rooms.has(roomId)) {
            console.log(`[SOCKET] User ${socket.id} attempted duplicate join for ${roomId}`);
            return; // Silently abort! Do not broadcast a system message.
        }

        socket.join(roomId);
        joinRoom(roomId, socket.id);

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
        try {
            await prisma.message.create({
                data: {
                    id: payload.id,
                    roomId: payload.roomId,
                    message: payload.message,
                    sender: payload.sender
                }
            });

            socket.to(payload.roomId).emit("receiveMessage", payload);

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