import { create } from "zustand"
import type { ChatMessage } from "@multiplayer/shared"

type ChatState = {
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    updateMessageStatus: (id: string, status: "pending" | "sent" | "failed", error?: string) => void;
    prependMessages: (messages: ChatMessage[]) => void;
    setMessagesFromHistory: (messages: ChatMessage[]) => void;
    clearMessages: () => void;
    markRoomMessagesAsRead: (roomId: string, readAt: number) => void;
    editMessageLocally: (id: string, message: string, editedAt: number) => void;
    deleteMessageLocally: (id: string, deletedAt: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    addMessage: (message) =>
        set((state) => {
            // A message can arrive twice through two different paths for the
            // SENDER: once as the optimistic entry (added immediately on
            // send), and again via the server's `receiveMessage` broadcast
            // (which includes the sender's own socket, since they're in the
            // room too). As long as both carry the SAME id — see
            // socketActions.ts, which generates the id client-side and
            // sends it to the server to reuse — this merges them into one
            // entry instead of showing the message twice.
            const existingIndex = state.messages.findIndex((m) => m.id === message.id)
            if (existingIndex !== -1) {
                const updated = [...state.messages]
                updated[existingIndex] = { ...updated[existingIndex], ...message }
                return { messages: updated }
            }
            return { messages: [...state.messages, message] }
        }),
    updateMessageStatus: (id, status, error) =>
        set((state) => ({
            messages: state.messages.map((m) => (
                m.id === id ? { ...m, status, ...(error ? { error } : {}) } : m
            ))
        })),
    prependMessages: (incoming) =>
        set((state) => ({ messages: [...incoming, ...state.messages] })),
    setMessagesFromHistory: (messages) => set({messages}),
    clearMessages: () => set({messages: []}),

    markRoomMessagesAsRead: (roomId: string, readAt: number) =>
    set((state) => ({
        messages: state.messages.map((msg) =>
            msg.roomId === roomId
                ? { ...msg, isRead: true, readAt }
                : msg
        )
    })),

    // Applied when the "messageEdited" broadcast arrives — including for
    // the editor's own client, same pattern as everything else in this
    // store (the server is always the source of truth, nothing here is
    // optimistic).
    editMessageLocally: (id, message, editedAt) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, message, editedAt } : m
            )
        })),

    // Deliberately does NOT remove the message from the array — a
    // deleted message stays in place as a tombstone (matches real chat
    // apps: the gap in conversation flow is meaningful context, not
    // noise to collapse away). RoomScreen renders based on `deletedAt`
    // being set, never on the (now-blanked) `message` field.
    deleteMessageLocally: (id, deletedAt) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, deletedAt } : m
            )
        })),
}))