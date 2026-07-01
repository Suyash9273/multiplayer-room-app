import { create } from "zustand"

export type PendingRequest = {
    friendshipId: string;
    sender: {
        id: string;
        username: string;
        name: string;
    };
    status: string;
};

export type Friend = {
    friendshipId: string;
    user: {
        id: string;
        username: string | null;
        name: string;
    };
}

type FriendState = {
    isHydrated: boolean;
    pendingRequests: PendingRequest[];
    friends: Friend[];

    addPendingRequest: (request: PendingRequest) => void;
    removePendingRequest: (friendshipId: string) => void;
    setPendingRequests: (requests: PendingRequest[]) => void;

    setFriends: (friends: Friend[]) => void;
    addFriend: (friend: Friend) => void;

    setHydrated: (status: boolean) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
    isHydrated: false,
    pendingRequests: [],
    friends: [],

    addPendingRequest: (request) =>
        set((state) => {
            if (state.pendingRequests.some(r => r.friendshipId === request.friendshipId)) {
                return state
            }

            return { pendingRequests: [...state.pendingRequests, request] }
        }),

    removePendingRequest: (friendshipId) =>
        set((state) => ({
            pendingRequests: state.pendingRequests.filter(
                (req) => req.friendshipId !== friendshipId
            )
        })),
    setPendingRequests: (requests) => set({ pendingRequests: requests }),

    setFriends: (friends) => set({ friends: friends }),

    addFriend: (friend) =>
        set((state) => {
            if (state.friends.some(f => f.friendshipId === friend.friendshipId)) return state
            return { friends: [...state.friends, friend] }
        }),
    
    setHydrated: (status) => set({isHydrated: status})
}))