// Public/shared rooms (arbitrary room codes) are intentionally open —
// DM rooms are NOT — they must only be enterable by the two participants
// encoded in the room ID itself.
export function isAuthorizedForRoom(roomId: string, userId: string): boolean {
    if (roomId.startsWith("dm:")) {
        const parts = roomId.split(":"); // ["dm", id1, id2]
        return parts[1] === userId || parts[2] === userId;
    }
    return true;
}