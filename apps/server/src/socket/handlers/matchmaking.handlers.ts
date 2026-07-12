import { prisma } from "@multiplayer/db";
import type { AppServer, AppSocket } from "../types.js";
import { getInterests } from "../../lib/interests.js";
import { findPartnerIndex, type MatchCandidate } from "../../lib/matchmakingLogic.js";
import { matchmakingLimiter } from "../../lib/limiters.js";

// One waiting entry per searching socket. `fallbackActive` starts true for
// anyone with no interests set (nothing to match on, so accept anyone
// immediately — same as the old pure-FIFO behavior) and flips true for
// everyone else once their chosen timer (5s/10s) elapses without an
// interest-overlap match. "Forever" means `timer` is never set, so
// fallbackActive can only ever become true if interests is empty.
//
// Satisfies MatchCandidate (identityId/interests/fallbackActive) so the
// pure matching policy in matchmakingLogic.ts can operate on it directly
// without needing to know anything about sockets.
interface QueueEntry extends MatchCandidate {
    socket: AppSocket;
    timer: ReturnType<typeof setTimeout> | null;
}

const waitingQueue: QueueEntry[] = [];

function removeFromQueue(entry: QueueEntry) {
    if (entry.timer) clearTimeout(entry.timer);
    const idx = waitingQueue.indexOf(entry);
    if (idx !== -1) waitingQueue.splice(idx, 1);
}

// Liveness filter — the pure matching policy assumes everyone it's given
// is actually still connected; this is where that assumption gets made true.
function connectedQueue(): QueueEntry[] {
    return waitingQueue.filter((e) => e.socket.connected);
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
    removeFromQueue(a);
    removeFromQueue(b);
    await createMatchRoom(a.socket, b.socket);
}

export const registerMatchmakingHandlers = (io: AppServer, socket: AppSocket) => {
    const identity = socket.data.identity;

    // durationMs: 5000 | 10000 | null ("forever" — never falls back to a
    // non-interest match on its own; only pairs if someone else's
    // fallback happens to reach it, or an actual overlap shows up).
    socket.on("findMatch", async (payload?: { duration?: number | null }) => {
        if (waitingQueue.some((e) => e.socket === socket)) return; // already searching

        if (!matchmakingLimiter.check(identity.id)) {
            console.warn(`[rate-limit] ${identity.type}:${identity.id} exceeded findMatch limit`);
            socket.emit("matchmakingError", "You're searching too frequently. Please wait a moment.");
            return;
        }

        // Opportunistic cleanup of any stale/disconnected entries.
        for (let i = waitingQueue.length - 1; i >= 0; i--) {
            if (!waitingQueue[i].socket.connected) removeFromQueue(waitingQueue[i]);
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

        const partnerIdx = findPartnerIndex(entry, connectedQueue());
        if (partnerIdx !== -1) {
            await pairEntries(entry, connectedQueue()[partnerIdx]);
            return;
        }

        waitingQueue.push(entry);
        socket.emit("waitingForMatch");

        if (!entry.fallbackActive && durationMs != null) {
            entry.timer = setTimeout(async () => {
                entry.fallbackActive = true;
                entry.timer = null;

                // Someone might already be sitting in the queue we can grab
                // right now, rather than waiting for the NEXT findMatch call.
                const idx = findPartnerIndex(entry, connectedQueue());
                if (idx !== -1) {
                    await pairEntries(entry, connectedQueue()[idx]);
                } else {
                    socket.emit("fallbackActive");
                }
            }, durationMs);
        }
    });

    socket.on("cancelFindMatch", () => {
        if (!matchmakingLimiter.check(identity.id)) return; // fail silent — cancel is low-stakes
        const entry = waitingQueue.find((e) => e.socket === socket);
        if (entry) removeFromQueue(entry);
    });

    socket.on("disconnect", () => {
        const entry = waitingQueue.find((e) => e.socket === socket);
        if (entry) removeFromQueue(entry);
    });
};
