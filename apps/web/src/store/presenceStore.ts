import {create} from "zustand"

type PresenceState = {
    onlineUsers: string[];
    roomUsers: string[];
    setOnlineUsers: (users: string[]) => void;
    setRoomUsers: (users: string[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
    onlineUsers: [],
    roomUsers: [],
    setOnlineUsers: (users) => set({onlineUsers: users}),
    setRoomUsers: (users) => set({roomUsers: users})
}))

