import { prisma } from "@multiplayer/db";

// Nothing else deletes expired GuestIdentity rows — `expiresAt` was only
// ever CHECKED (in resolveIdentity, to reject a stale cookie), never
// acted on. Without this, expired guests' rows — and any RoomMember rows
// tied to them, which cascade-delete along with the GuestIdentity row —
// just accumulate in Postgres forever. Message rows are untouched by
// this: `Message.senderId` is a plain string, not a foreign key to
// GuestIdentity, and `senderDisplayName` is already denormalized onto
// the row specifically so history keeps displaying correctly even after
// the identity behind it is long gone.
export async function cleanupExpiredGuests() {
    try {
        const { count } = await prisma.guestIdentity.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        if (count > 0) {
            console.log(`[cleanup] Removed ${count} expired guest identit${count === 1 ? "y" : "ies"}`);
        }
    } catch (error) {
        console.error("[cleanup] Failed to clean up expired guest identities:", error);
    }
}
