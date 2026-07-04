import { socket } from "@/lib/socket"
import { useSessionStore } from "../store/sessionStore"
import { useChatStore } from "../store/chatStore"
import { useTypingStore } from "../store/typingStore"
import type { ChatMessage } from "@multiplayer/shared"
import { usePresenceStore } from "@/store/presenceStore"

export function join({ username, userId }: { username: string, userId: string }) {
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

  if (currentRoom === roomId) {
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

// THE NEW SECURE MESSAGE SENDER

export interface SendMessagePayload {
    roomId: string;
    message: string;
    senderDisplayName: string;
    type?: string;
}

export function sendMessage(payload: SendMessagePayload) {
  // 1. Construct the Optimistic UI Message using the new Shared Schema
  const optimisticMessage: ChatMessage = {
    id: crypto.randomUUID(),
    roomId: payload.roomId,
    message: payload.message,
    senderDisplayName: payload.senderDisplayName,
    timestamp: Date.now(),
    status: "pending",
    type: (payload.type as "USER" | "SYSTEM") || "USER"
  }

  // 2. Immediately inject into Zustand for instantaneous UI feedback
  useChatStore.getState().addMessage(optimisticMessage)

  // 3. Emit the structured payload to the Express Backend Bouncer
  socket.emit(
    "sendMessage",
    payload,
    // The backend now returns a rich receipt. We mark it as 'sent' once confirmed.
    (receipt: { status: string; data?: ChatMessage }) => {
      if (receipt.status === "success") {
         useChatStore.getState().updateMessageStatus(optimisticMessage.id, "sent")
      }
    }
  )
}

// TYPING INDICATORS

export function emitTyping(roomId?: string) {
  const room = roomId || useSessionStore.getState().currentRoom
  if (room) socket.emit("typing", room)
}

export function emitStopTyping(roomId?: string) {
  const room = roomId || useSessionStore.getState().currentRoom
  if (room) socket.emit("stopTyping", room)
}