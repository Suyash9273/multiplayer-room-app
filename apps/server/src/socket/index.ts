import { Server, DefaultEventsMap } from "socket.io";
import type { Server as HttpServer } from "http";
import { prisma } from "@multiplayer/db";
import { resolveIdentity } from "../lib/identity.js";
import { removeUser, getOnlineUsers } from "./presence.js";
import { registerRoomHandlers } from "./handlers/room.handlers.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.handlers.js";
import type { AppSocketData } from "./types.js";
// import { registerFriendHandlers } from "./handlers/friend.handlers.js";

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, AppSocketData>(httpServer, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Socket Auth Middleware
    //
    // This used to hard-reject any socket without a Better Auth session —
    // which meant anonymous chat could never work at the transport layer,
    // no matter what the handlers below did. It now resolves EITHER a real
    // session OR a guest token through the same `resolveIdentity` helper
    // the REST layer uses, so both paths are verified server-side and
    // neither can be spoofed by the client.
    io.use(async (socket, next) => {
        try {
            const rawCookies = socket.request.headers.cookie;
            const identity = await resolveIdentity(rawCookies);

            if (!identity) {
                return next(new Error("Authentication error: No valid session or guest token."));
            }

            socket.data.identity = identity;
            next();
        } catch (error) {
            console.error("Socket Middleware Error:", error);
            next(new Error("Internal Server Error during authentication"));
        }
    });

    // Socket Connection & Handler Registration
    io.on("connection", (socket) => {
        const identity = socket.data.identity;

        // Only authenticated users get a personal notification room —
        // friend requests, DM notifications, etc. are meaningless for a
        // guest identity that's discarded after the tab closes.
        if (identity.type === "user") {
            socket.join(`user:${identity.id}`);
        }

        // Keep GuestIdentity.socketId roughly current for observability.
        // This is best-effort only — it is NOT the identity key (see schema).
        if (identity.type === "guest") {
            prisma.guestIdentity
                .update({ where: { id: identity.id }, data: { socketId: socket.id } })
                .catch((err) => console.error("[socket] Failed to update guest socketId:", err));
        }

        console.log(`🟢 Verified connection: ${identity.displayName} [${identity.type}] (${socket.id})`);

        // --- REGISTER MODULAR HANDLERS ---
        registerRoomHandlers(io, socket);
        registerMatchmakingHandlers(io, socket);
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