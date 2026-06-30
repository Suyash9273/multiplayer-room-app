import { create } from "zustand"

type SessionState = {
    userId: string;
    username: string;
    isJoined: boolean;
    currentRoom: string;
    setUserId: (userId: string) => void;
    setUsername: (username: string) => void;
    setIsJoined: (isJoined: boolean) => void;
    setCurrentRoom: (room: string) => void;
    reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    userId: "",
    username: "",
    isJoined: false,
    currentRoom: "",
    setUserId: (userId) => set({userId}),
    setUsername: (username) => set({ username }),
    setIsJoined: (isJoined) => set({ isJoined }),
    setCurrentRoom: (room) => set({ currentRoom: room }),
    reset: () => set({ userId: "", username: "", isJoined: false, currentRoom: "" }),
}))