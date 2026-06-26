import {create} from "zustand"

type TypingState = {
    typingUsers: string[];
    addTypingUsers: (username: string) => void;
    removeTypingUser: (username: string) => void;
    clearTypingUsers: () => void;
}

export const useTypingStore = create<TypingState>((set) => ({
    typingUsers: [],
    addTypingUsers: (username) => 
        set((state) => {
            if(state.typingUsers.includes(username)) return state
            return {typingUsers: [...state.typingUsers, username]}
        }),
    removeTypingUser: (username) => 
        set((state) => ({
            typingUsers: state.typingUsers.filter((u) => u !== username)
        })),
    clearTypingUsers: () => set({typingUsers: []})
}))