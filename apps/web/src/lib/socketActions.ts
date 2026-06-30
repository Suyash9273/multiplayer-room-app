import { socket } from "@/lib/socket"
import { useSessionStore } from "../store/sessionStore"
import { useChatStore } from "../store/chatStore"
import { useTypingStore } from "../store/typingStore"
import type { ChatMessage } from "@multiplayer/shared"
import { usePresenceStore } from "@/store/presenceStore"

export function join({username, userId} : {username: string, userId: string}) {
    socket.connect()

    socket.once("connect", () => {
        socket.emit("join")
        useSessionStore.getState().setUserId(userId)
        useSessionStore.getState().setUsername(username)
        useSessionStore.getState().setIsJoined(true)
    })
}

export function enterRoom(roomId: string) {
    const currentRoom = useSessionStore.getState().currentRoom

    if(currentRoom === roomId) {
      return
    }

    useChatStore.getState().clearMessages()
    useSessionStore.getState().setCurrentRoom(roomId)
    socket.emit("enterRoom", roomId)
}

export function leaveRoom(roomId: string) {
    socket.emit("leaveRoom", roomId)
    useChatStore.getState().clearMessages()
    useTypingStore.getState().clearTypingUsers()
    useSessionStore.getState().setCurrentRoom("")
    usePresenceStore.getState().setRoomUsers([])
}

export function sendMessage(message: string) {
  const { username, currentRoom } = useSessionStore.getState()

  const payload: ChatMessage = {
    id: crypto.randomUUID(),
    roomId: currentRoom,
    message,
    sender: username,
    timestamp: Date.now(),
    status: "pending",
  }

  useChatStore.getState().addMessage(payload)

  socket.emit(
    "sendMessage",
    payload,
    (receipt: { status: string; id: string }) => {
      useChatStore.getState().updateMessageStatus(receipt.id, "sent")
    }
  )
}

export function emitTyping() {
  const { currentRoom } = useSessionStore.getState()
  socket.emit("typing", currentRoom)
}

export function emitStopTyping() {
  const { currentRoom } = useSessionStore.getState()
  socket.emit("stopTyping", currentRoom)
}