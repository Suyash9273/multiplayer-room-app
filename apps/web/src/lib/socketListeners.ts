import { socket } from "@/lib/socket"
import { usePresenceStore } from "@/store/presenceStore"
import { useChatStore } from "@/store/chatStore"
import { useTypingStore } from "@/store/typingStore"
import { useFriendStore, type PendingRequest } from "@/store/friendStore"
import type { FriendAcceptedPayload } from "@multiplayer/shared"

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

    const onFriendRequestAccepted = (data: FriendAcceptedPayload) => {
        useFriendStore.getState().addFriend({
            friendshipId: data.friendshipId,
            user: data.friend
        })
    }

    const onMessagesRead = ({ roomId, readAt }: { roomId: string, readAt: number }) => {
        useChatStore.getState().markRoomMessagesAsRead(roomId, readAt)
    }

    const onFriendRemoved = ({ friendshipId }: { friendshipId: string }) => {
        useFriendStore.getState().removeFriend(friendshipId)
    }

    socket.on("onlineUsers", onOnlineUsers)
    socket.on("roomUsers", onRoomUsers)
    socket.on("receiveMessage", onReceiveMessage)
    socket.on("userTyping", onUserTyping)
    socket.on("userStoppedTyping", onUserStoppedTyping)
    socket.on("friendRequestReceived", onFriendRequestReceived)
    socket.on("friendRequestAccepted", onFriendRequestAccepted)
    socket.on("messagesRead", onMessagesRead)
    socket.on("friendRemoved", onFriendRemoved)

    // return cleanup so whoever calls this can tear it down if needed
    return () => {
        socket.off("onlineUsers", onOnlineUsers)
        socket.off("roomUsers", onRoomUsers)
        socket.off("receiveMessage", onReceiveMessage)
        socket.off("userTyping", onUserTyping)
        socket.off("userStoppedTyping", onUserStoppedTyping)
        socket.off("friendRequestReceived", onFriendRequestReceived)
        socket.off("friendRequestAccepted", onFriendRequestAccepted)
        socket.off("messagesRead", onMessagesRead)
        socket.off("friendRemoved", onFriendRemoved)
    }
}