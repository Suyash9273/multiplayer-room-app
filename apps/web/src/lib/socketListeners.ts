import { socket } from "@/lib/socket"
import { usePresenceStore } from "@/store/presenceStore"
import { useChatStore } from "@/store/chatStore"
import { useTypingStore } from "@/store/typingStore"
import { useFriendStore, type PendingRequest } from "@/store/friendStore"

import type { ChatMessage } from "@multiplayer/shared"

export function registerSocketListeners() {
    const onOnlineUsers = (users: string[]) => {
        usePresenceStore.getState().setOnlineUsers(users)
    }

    const onRoomUsers = (users: string[]) => {
        usePresenceStore.getState().setRoomUsers(users)
    }

    const onReceiveMessage = (payload: ChatMessage) => {
        useChatStore.getState().addMessage(payload)
    }

    const onUserTyping = (username: string) => {
        useTypingStore.getState().addTypingUsers(username)
    }

    const onUserStoppedTyping = (username: string) => {
        useTypingStore.getState().removeTypingUser(username)
    }

    const onFriendRequestReceived = (request: PendingRequest) => {
        useFriendStore.getState().addPendingRequest(request)
    }

    socket.on("onlineUsers", onOnlineUsers)
    socket.on("roomUsers", onRoomUsers)
    socket.on("receiveMessage", onReceiveMessage)
    socket.on("userTyping", onUserTyping)
    socket.on("userStoppedTyping", onUserStoppedTyping)
    socket.on("friendRequestReceived", onFriendRequestReceived)

    // return cleanup so whoever calls this can tear it down if needed
    return () => {
        socket.off("onlineUsers", onOnlineUsers)
        socket.off("roomUsers", onRoomUsers)
        socket.off("receiveMessage", onReceiveMessage)
        socket.off("userTyping", onUserTyping)
        socket.off("userStoppedTyping", onUserStoppedTyping)
        socket.off("friendRequestReceived", onFriendRequestReceived)
    }
}