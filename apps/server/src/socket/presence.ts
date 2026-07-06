import type { Identity } from "@multiplayer/shared";

// WHY THE KEY CHANGED FROM "username" TO "identity id":
// The old maps were keyed by the display-name string itself. That works
// fine when every identity has a genuinely unique name (real usernames
// are @unique in the DB) — but every guest's fallback name collapsed to
// the same value ("Stranger"), which meant Bob-the-stranger's tab and
// Alice-the-stranger's tab were treated as the SAME "user" with two tabs.
// Keying by `identity.id` (User.id or GuestIdentity.id — both DB-unique)
// fixes that, and we carry the display name alongside it for rendering.

type PresenceEntry = { id: string; displayName: string };

//Map-1: Maps socket.id -> identity (used on disconnect)
export const socketToIdentity = new Map<string, PresenceEntry>();

//Map-2: Maps identity.id -> set of socket.ids (used to track multi-tab presence)
export const identityToSockets = new Map<string, Set<string>>();

//Map-3: Maps room -> set of socket.ids
export const roomToSockets = new Map<string, Set<string>>();

//Logic to update both maps when an identity connects
export function addUser(identity: Identity, socketId: string) {
    socketToIdentity.set(socketId, { id: identity.id, displayName: identity.displayName });

    if (!identityToSockets.has(identity.id)) {
        identityToSockets.set(identity.id, new Set<string>());
    }
    identityToSockets.get(identity.id)!.add(socketId);
}

//Logic to cleanup both maps when a socket disconnects
export function removeUser(socketId: string) {
    const entry = socketToIdentity.get(socketId);
    if (entry === undefined) {
        // can happen if the socket never completed a "join"
        return;
    }
    identityToSockets.get(entry.id)?.delete(socketId);
    socketToIdentity.delete(socketId);
    if (identityToSockets.get(entry.id)?.size === 0) {
        identityToSockets.delete(entry.id);
    }
}

//Logic to return currently online identities as display names
export function getOnlineUsers(): string[] {
    const seen = new Set<string>();
    const names: string[] = [];

    for (const entry of socketToIdentity.values()) {
        if (!seen.has(entry.id)) {
            seen.add(entry.id);
            names.push(entry.displayName);
        }
    }
    return names;
}

//Logic to update the map when a socketId joins a room
export function joinRoom(room: string, socketId: string) {
    if (!roomToSockets.has(room)) {
        roomToSockets.set(room, new Set<string>());
    }
    roomToSockets.get(room)!.add(socketId);
}

//Logic to update the map when a socketId leaves the room
export function leaveRoom(room: string, socketId: string) {
    roomToSockets.get(room)?.delete(socketId);
    if (roomToSockets.get(room)?.size === 0) {
        roomToSockets.delete(room);
    }
}

//Logic to get the unique display names of everyone currently in a room
export function getUsersInRoom(room: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];

    if (!roomToSockets.has(room)) return [];

    for (const socketId of roomToSockets.get(room)!) {
        const entry = socketToIdentity.get(socketId);
        if (entry && !seen.has(entry.id)) {
            seen.add(entry.id);
            names.push(entry.displayName);
        }
    }
    return names;
}
