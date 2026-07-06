import { socket } from "@/lib/socket"
import { useSessionStore } from "../store/sessionStore"
import { useChatStore } from "../store/chatStore"
import { useTypingStore } from "../store/typingStore"
import type { ChatMessage } from "@multiplayer/shared"
import { usePresenceStore } from "@/store/presenceStore"

// Works for BOTH real users and guests — the caller doesn't need to know
// which one it is. The socket connects using whatever cookies the browser
// already holds (Better Auth session OR guest token); the server resolves
// the actual identity via its auth middleware and hands it back through
// the "join" ack. We store what the SERVER confirmed, not what we assumed,
// so the UI can never drift from what the backend will actually enforce.
export function join() {
  useSessionStore.getState().setJoinError(null)
  socket.connect()

  // If the socket auth middleware rejects the connection (no valid
  // session/guest cookie, or a server-side exception resolving identity),
  // Socket.IO fires "connect_error" — NOT "connect". Without this handler
  // the UI just sat on "Reconnecting..." forever with no signal why.
  socket.once("connect_error", (err) => {
    console.error("[socket] connect_error:", err.message)
    useSessionStore.getState().setJoinError(err.message || "Failed to connect")
  })

  socket.once("connect", () => {
    socket.emit(
      "join",
      (identity: { id: string; displayName: string; type: "user" | "guest" }) => {
        useSessionStore.getState().setUserId(identity.id)
        useSessionStore.getState().setUsername(identity.displayName)
        useSessionStore.getState().setIdentityType(identity.type)
        useSessionStore.getState().setIsJoined(true)
      }
    )
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
    type?: string;
}

export function sendMessage(payload: SendMessagePayload) {
  // Own display name for the OPTIMISTIC render only. The server ignores
  // this entirely and stamps the real, verified identity's name — this is
  // purely so the sender's own UI doesn't flash a blank name for the ~50ms
  // round trip before the ack/broadcast comes back.
  const { username: myDisplayName } = useSessionStore.getState()

  // Generated HERE and sent to the server, which reuses it as the DB row's
  // real id (instead of generating its own). That's what lets the
  // server's `receiveMessage` broadcast — which the sender receives too,
  // since they're in the room — overwrite this optimistic entry via
  // chatStore's id-based dedupe, instead of appearing as a second message.
  const clientGeneratedId = crypto.randomUUID()

  // 1. Construct the Optimistic UI Message using the new Shared Schema
  const optimisticMessage: ChatMessage = {
    id: clientGeneratedId,
    roomId: payload.roomId,
    message: payload.message,
    senderDisplayName: myDisplayName,
    timestamp: Date.now(),
    status: "pending",
    type: (payload.type as "USER" | "SYSTEM") || "USER"
  }

  // 2. Immediately inject into Zustand for instantaneous UI feedback
  useChatStore.getState().addMessage(optimisticMessage)

  // 3. Emit the structured payload to the Express Backend Bouncer
  socket.emit(
    "sendMessage",
    { ...payload, id: clientGeneratedId },
    // The backend now returns a rich receipt. We mark it as 'sent' once confirmed.
    (receipt: { status: string; data?: ChatMessage }) => {
      if (receipt.status === "success") {
         useChatStore.getState().updateMessageStatus(clientGeneratedId, "sent")
      }
    }
  )
}

// READ RECEIPTS
// Tells the server "I've seen everything in this room up to now" — the
// server marks the OTHER party's messages as read and broadcasts
// "messagesRead" back to the room, which is what flips the sender's own
// tick from single to double. See RoomScreen.tsx for when this is called.
export function markRead(roomId: string) {
  socket.emit("markRead", roomId)
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