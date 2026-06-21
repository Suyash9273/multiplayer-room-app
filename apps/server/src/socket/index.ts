import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import cookie from "cookie";
import { prisma } from "@multiplayer/db";
import { removeUser, getOnlineUsers } from "./presence.js";
import { registerRoomHandlers } from "./handlers/room.handlers.js";
// import { registerFriendHandlers } from "./handlers/friend.handlers.js";

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Socket Auth Middleware
    io.use(async (socket, next) => {
        try {
            const rawCookies = socket.request.headers.cookie;
            if (!rawCookies) return next(new Error("Authentication error: No cookies provided."));
            
            const parsedCookies = cookie.parse(rawCookies);
            const rawSessionToken = parsedCookies["better-auth.session_token"];
            if (!rawSessionToken) return next(new Error("Authentication error: Session token missing."));

            const sessionToken = rawSessionToken.split(".")[0];
            const session = await prisma.session.findUnique({
                where: { token: sessionToken },
                include: { user: true }
            });

            if (!session || session.expiresAt < new Date()) {
                return next(new Error("Authentication Error: Session invalid or expired"));
            }

            socket.data.user = session.user;
            next();
        } catch (error) {
            console.error("Socket Middleware Error:", error);
            next(new Error("Internal Server Error during authentication"));
        }
    });

    // Socket Connection & Handler Registration
    io.on("connection", (socket) => {
        const verifiedUser = socket.data.user;
        const username = verifiedUser?.username;

        if (!username) {
            socket.disconnect();
            return;
        }

        console.log(`🟢 Verified connection: ${username} (${socket.id})`);

        // --- REGISTER MODULAR HANDLERS ---
        registerRoomHandlers(io, socket);
        // registerFriendHandlers(io, socket);
        // registerDMHandlers(io, socket);

        // General disconnect cleanup
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            removeUser(socket.id);
            socket.broadcast.emit("onlineUsers", getOnlineUsers());
        });
    });

    return io;
};