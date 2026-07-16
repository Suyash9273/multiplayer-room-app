import { Server, DefaultEventsMap } from "socket.io";
import type { Server as HttpServer } from "http";
import { prisma } from "@multiplayer/db";
import { resolveIdentity } from "../lib/identity.js";
import { removeUser, getOnlineUsers } from "./presence.js";
import { registerRoomHandlers } from "./handlers/room.handlers.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.handlers.js";
import type { AppSocketData } from "./types.js";
import { sweepAllLimiters } from "../lib/limiters.js";
import { corsOriginCheck } from "../lib/corsOrigins.js";
// import { registerFriendHandlers } from "./handlers/friend.handlers.js";

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, AppSocketData>(httpServer, {
        cors: {
            origin: corsOriginCheck,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Rate limiter buckets are per-identity Maps that only ever get pruned
    // lazily (on the next check() for that same identity). Without this,
    // an identity that rate-limited once and never came back would leave
    // its bucket sitting in memory forever. A minute is frequent enough to
    // keep memory bounded without meaningfully impacting accuracy. Lives
    // for the process lifetime, same as the in-memory presence maps.
    setInterval(sweepAllLimiters, 60_000);

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
            // Sent explicitly by the client via `io(url, { auth: { token } })`
            // — see apps/web/src/lib/socket.ts. This is how a logged-in user
            // authenticates when the frontend and this server are on
            // different domains and the session cookie can't reach us.
            const bearerToken = socket.handshake.auth?.token as string | undefined;

            // TEMP DEBUG — remove once cross-domain login is confirmed working.
            console.log("[socket auth]", {
                hasCookies: !!rawCookies,
                hasBearerToken: !!bearerToken,
                bearerTokenPreview: bearerToken ? `${bearerToken.slice(0, 8)}...` : null,
            });

            const identity = await resolveIdentity(rawCookies, bearerToken);

            // TEMP DEBUG — remove once cross-domain login is confirmed working.
            console.log("[socket auth] resolveIdentity result:", identity);

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