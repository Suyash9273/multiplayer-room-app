import { create } from "zustand"
import type { ChatMessage } from "@multiplayer/shared"

type ChatState = {
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    updateMessageStatus: (id: string, status: "pending" | "sent") => void;
    prependMessages: (messages: ChatMessage[]) => void;
    setMessagesFromHistory: (messages: ChatMessage[]) => void;
    clearMessages: () => void;
    markRoomMessagesAsRead: (roomId: string, readAt: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    updateMessageStatus: (id, status) =>
        set((state) => ({
            messages: state.messages.map((m) => (
                m.id === id ? { ...m, status } : m
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
    }))
}))