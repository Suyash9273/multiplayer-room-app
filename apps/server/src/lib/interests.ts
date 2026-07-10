import { prisma } from "@multiplayer/db";
import type { Identity } from "@multiplayer/shared";

// Single source of truth for "how do I read this identity's interests" —
// used by both profile.routes.ts (GET /api/profile/interests) and
// matchmaking.handlers.ts (findMatch reads a FRESH copy at search time,
// not whatever was true when the socket first connected).
export async function getInterests(identity: Pick<Identity, "type" | "id">): Promise<string[]> {
    if (identity.type === "user") {
        const user = await prisma.user.findUnique({ where: { id: identity.id }, select: { interests: true } });
        return user?.interests ?? [];
    }
    const guest = await prisma.guestIdentity.findUnique({ where: { id: identity.id }, select: { interests: true } });
    return guest?.interests ?? [];
}
