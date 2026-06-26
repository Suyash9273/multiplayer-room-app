import { create } from "zustand"

type SessionState = {
    username: string;
    isJoined: boolean;
    currentRoom: string;
    setUsername: (username: string) => void;
    setIsJoined: (isJoined: boolean) => void;
    setCurrentRoom: (room: string) => void;
    reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    username: "",
    isJoined: false,
    currentRoom: "",
    setUsername: (username) => set({ username }),
    setIsJoined: (isJoined) => set({ isJoined }),
    setCurrentRoom: (room) => set({ currentRoom: room }),
    reset: () => set({ username: "", isJoined: false, currentRoom: "" }),
}))