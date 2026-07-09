import { prisma } from "@multiplayer/db";
import type { AppServer, AppSocket } from "../types.js";

// In-memory FIFO queue of sockets waiting to be paired with a random
// stranger. Deliberately simple (no interest-based matching yet —
// GuestIdentity.interests is reserved for that as a future enhancement)
// and deliberately in-memory: unlike rooms/messages, queue state doesn't
// need to survive a server restart. Works identically for real users and
// guests — a socket is a socket, the identity behind it doesn't matter
// for pairing purposes.
const waitingQueue: AppSocket[] = [];

function removeFromQueue(socket: AppSocket) {
    const idx = waitingQueue.indexOf(socket);
    if (idx !== -1) waitingQueue.splice(idx, 1);
}

export const registerMatchmakingHandlers = (io: AppServer, socket: AppSocket) => {
    const identity = socket.data.identity;

    // Client asks to be paired with the next available stranger.
    socket.on("findMatch", async () => {
        // Already in the queue from a previous click? Don't queue twice.
        if (waitingQueue.includes(socket)) return;

        // Find the first WAITING candidate that (a) is still actually
        // connected — a socket can linger in the queue for a moment after
        // a hard disconnect, before the "disconnect" cleanup below runs —
        // and (b) isn't this same identity's other tab (pairing someone
        // with themselves defeats the point of "meet a stranger").
        const partnerIndex = waitingQueue.findIndex(
            (candidate) => candidate.connected && candidate.data.identity.id !== identity.id
        );

        if (partnerIndex === -1) {
            // Nobody eligible waiting — opportunistically prune any dead
            // entries while we're here, then take this socket's place in line.
            for (let i = waitingQueue.length - 1; i >= 0; i--) {
                if (!waitingQueue[i].connected) waitingQueue.splice(i, 1);
            }
            waitingQueue.push(socket);
            socket.emit("waitingForMatch");
            return;
        }

        const [partner] = waitingQueue.splice(partnerIndex, 1);
        const partnerIdentity = partner.data.identity;

        try {
            // Same shape as POST /api/rooms/anonymous — a Room + two
            // RoomMember rows, one per identity, branching on user vs guest.
            const room = await prisma.room.create({
                data: {
                    type: "ANONYMOUS",
                    members: {
                        create: [
                            identity.type === "user" ? { userId: identity.id } : { guestId: identity.id },
                            partnerIdentity.type === "user" ? { userId: partnerIdentity.id } : { guestId: partnerIdentity.id },
                        ],
                    },
                },
            });

            socket.emit("matchFound", { roomId: room.id });
            partner.emit("matchFound", { roomId: room.id });
        } catch (error) {
            console.error("[findMatch] Failed to create match room:", error);
            socket.emit("matchmakingError", "Failed to create a match. Please try again.");
            partner.emit("matchmakingError", "Your match failed to connect. Please try again.");
        }
    });

    // Client gives up waiting (clicked cancel, or navigated away).
    socket.on("cancelFindMatch", () => {
        removeFromQueue(socket);
    });

    // Safety net: never leave a dead socket sitting in the queue where it
    // could get "matched" to someone who then finds nobody on the other end.
    socket.on("disconnect", () => {
        removeFromQueue(socket);
    });
};
