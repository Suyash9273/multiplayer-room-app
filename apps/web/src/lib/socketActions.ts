import { socket } from "@/lib/socket"
import { useSessionStore } from "../store/sessionStore"
import { useChatStore } from "../store/chatStore"
import { useTypingStore } from "../store/typingStore"
import type { ChatMessage } from "@multiplayer/shared"

export function join(username: string) {
    socket.connect()

    socket.once("connect", () => {
        socket.emit("join")
        useSessionStore.getState().setUsername(username)
        useSessionStore.getState().setIsJoined(true)
    })
}

export function enterRoom(roomId: string) {
    useChatStore.getState().clearMessages()
    socket.emit("enterRoom", roomId)
    useSessionStore.getState().setCurrentRoom(roomId)
}

export function leaveRoom(roomId: string) {
    socket.emit("leaveRoom", roomId)
    useChatStore.getState().clearMessages()
    useTypingStore.getState().clearTypingUsers()
    useSessionStore.getState().setCurrentRoom("")
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