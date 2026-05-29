
//Map-1: Maps socket.id -> username(Used on disconnect)
export const socketToUser = new Map<string, string>()

//Map-2: Maps username -> set of socket.ids (used to track multi-tab presence)
export const userToSockets = new Map<string, Set<string>>()

//Map-3: Maps room -> users(usernames)
export const roomToSockets = new Map<string, Set<string>>()

//Logic to update both the maps when a user joins
export function addUser(username: string, socketId: string) {
    socketToUser.set(socketId, username)

    if(!userToSockets.has(username)) {
        userToSockets.set(username, new Set<string>())
    }

    userToSockets.get(username)!.add(socketId)
}

//Logic to cleanup both the maps when a user disconnects
export function removeUser(socketId: string) {
    const username = socketToUser.get(socketId)
    if(username === undefined) {//it can happen if socket does not fully connects even a single time
        //do nothing
        return
    }
    userToSockets.get(username)!.delete(socketId)
    socketToUser.delete(socketId)
    if(userToSockets.get(username)!.size == 0) {
        userToSockets.delete(username)
    }
}

//Logic to return an array of currently online usernames
export function getOnlineUsers(): string[] {
    let onlineUsers: string[] = []

    for(let key of userToSockets.keys()) {
        onlineUsers.push(key)
    }

    return onlineUsers
}

//Logic to update the map when a socketId joins a room
export function joinRoom(room: string, socketId: string) {
    if(!roomToSockets.has(room)) {
        roomToSockets.set(room, new Set<string>())
    }
    roomToSockets.get(room)!.add(socketId)
}

//Logic to update the map when a socketId leaves the room
export function leaveRoom(room: string, socketId: string) {
    roomToSockets.get(room)?.delete(socketId)
    if(roomToSockets.get(room)?.size == 0) {
        roomToSockets.delete(room)
    }
}

//Logic to get total Users in a room
export function getUsersInRoom(room: string): string[] {
    let temp = new Set<string>()  
    if(!roomToSockets.has(room)) {
        return []
    }

    for(const socket of roomToSockets.get(room)!) {
        temp.add(socketToUser.get(socket)!)
    }
    return Array.from(temp)
}
