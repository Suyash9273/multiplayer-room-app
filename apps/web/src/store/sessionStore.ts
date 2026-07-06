import { create } from "zustand"

type IdentityType = "user" | "guest" | null

type SessionState = {
    userId: string;
    username: string;
    identityType: IdentityType;
    isJoined: boolean;
    currentRoom: string;
    joinError: string | null;
    setUserId: (userId: string) => void;
    setUsername: (username: string) => void;
    setIdentityType: (identityType: IdentityType) => void;
    setIsJoined: (isJoined: boolean) => void;
    setCurrentRoom: (room: string) => void;
    setJoinError: (error: string | null) => void;
    reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    userId: "",
    username: "",
    identityType: null,
    isJoined: false,
    currentRoom: "",
    joinError: null,
    setUserId: (userId) => set({ userId }),
    setUsername: (username) => set({ username }),
    setIdentityType: (identityType) => set({ identityType }),
    setIsJoined: (isJoined) => set({ isJoined }),
    setCurrentRoom: (room) => set({ currentRoom: room }),
    setJoinError: (joinError) => set({ joinError }),
    reset: () => set({ userId: "", username: "", identityType: null, isJoined: false, currentRoom: "", joinError: null }),
}))
