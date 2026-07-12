import { prisma } from "@multiplayer/db";
import type { AppServer, AppSocket } from "../types.js";
import { getInterests } from "../../lib/interests.js";
import { MatchQueue, type MatchCandidate } from "../../lib/matchmakingLogic.js";
import { matchmakingLimiter } from "../../lib/limiters.js";

// One waiting entry per searching socket. `fallbackActive` starts true
// for anyone with no interests set (nothing to match on, so accept
// anyone immediately — same as the old pure-FIFO behavior) and flips
// true for everyone else once their chosen timer (5s/10s) elapses
// without an interest-overlap match. "Forever" means `timer` is never
// set, so fallbackActive can only become true if interests is empty.
interface QueueEntry extends MatchCandidate {
    socket: AppSocket;
    timer: ReturnType<typeof setTimeout> | null;
}

const queue = new MatchQueue<QueueEntry>();

// Authoritative "who is currently searching" registry — O(1) lookup by
// socket, separate from the bucket indices above (which exist purely to
// make findPartner fast, not to answer "is this socket already queued").
const socketToEntry = new Map<AppSocket, QueueEntry>();

// Removes an entry from EVERY structure it could be registered in — the
// interest buckets, the fallback pool, and the socket registry — plus
// clears its pending timer. This is what keeps the queue clean
// incrementally (on every disconnect/cancel/match), which means we no
// longer need a periodic full-queue sweep for stale entries the way the
// old flat-array version did.
function removeEntry(entry: QueueEntry) {
    if (entry.timer) clearTimeout(entry.timer);
    queue.remove(entry);
    socketToEntry.delete(entry.socket);
}

async function createMatchRoom(a: AppSocket, b: AppSocket) {
    const identityA = a.data.identity;
    const identityB = b.data.identity;

    try {
        const room = await prisma.room.create({
            data: {
                type: "ANONYMOUS",
                members: {
                    create: [
                        identityA.type === "user" ? { userId: identityA.id } : { guestId: identityA.id },
                        identityB.type === "user" ? { userId: identityB.id } : { guestId: identityB.id },
                    ],
                },
            },
        });

        a.emit("matchFound", { roomId: room.id });
        b.emit("matchFound", { roomId: room.id });
    } catch (error) {
        console.error("[matchmaking] Failed to create match room:", error);
        a.emit("matchmakingError", "Failed to create a match. Please try again.");
        b.emit("matchmakingError", "Your match failed to connect. Please try again.");
    }
}

async function pairEntries(a: QueueEntry, b: QueueEntry) {
    removeEntry(a);
    removeEntry(b);
    await createMatchRoom(a.socket, b.socket);
}

export const registerMatchmakingHandlers = (io: AppServer, socket: AppSocket) => {
    const identity = socket.data.identity;

    // durationMs: 5000 | 10000 | null ("forever" — never falls back to a
    // non-interest match on its own; only pairs if someone else's
    // fallback happens to reach it, or an actual overlap shows up).
    socket.on("findMatch", async (payload?: { duration?: number | null }) => {
        if (socketToEntry.has(socket)) return; // already searching

        if (!matchmakingLimiter.check(identity.id)) {
            console.warn(`[rate-limit] ${identity.type}:${identity.id} exceeded findMatch limit`);
            socket.emit("matchmakingError", "You're searching too frequently. Please wait a moment.");
            return;
        }

        // Read FRESH from the DB — not whatever was true when this socket
        // first connected. Interests are meant to be editable anytime from
        // the profile screen and take effect on the very next search.
        let interests: string[] = [];
        try {
            interests = await getInterests(identity);
        } catch (error) {
            console.error("[findMatch] Failed to load interests:", error);
        }

        const durationMs = payload?.duration ?? null;
        const entry: QueueEntry = {
            socket,
            identityId: identity.id,
            interests,
            fallbackActive: interests.length === 0, // nothing to match on -> old FIFO behavior
            timer: null,
        };

        const partner = queue.findPartner(entry);
        if (partner) {
            await pairEntries(entry, partner);
            return;
        }

        queue.add(entry);
        socketToEntry.set(socket, entry);
        socket.emit("waitingForMatch");

        if (!entry.fallbackActive && durationMs != null) {
            entry.timer = setTimeout(async () => {
                entry.timer = null;
                entry.fallbackActive = true;
                queue.activateFallback(entry);

                // Someone might already be sitting in the fallback pool we
                // can grab right now, rather than waiting for the NEXT
                // findMatch call.
                const partner = queue.findPartner(entry);
                if (partner) {
                    await pairEntries(entry, partner);
                } else {
                    socket.emit("fallbackActive");
                }
            }, durationMs);
        }
    });

    socket.on("cancelFindMatch", () => {
        if (!matchmakingLimiter.check(identity.id)) return; // fail silent — cancel is low-stakes
        const entry = socketToEntry.get(socket);
        if (entry) removeEntry(entry);
    });

    socket.on("disconnect", () => {
        const entry = socketToEntry.get(socket);
        if (entry) removeEntry(entry);
    });
};
