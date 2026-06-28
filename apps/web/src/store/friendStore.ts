import {create} from "zustand"

export type PendingRequest = {
    friendshipId: string;
    sender: {
        id: string;
        username: string;
        name: string;
    };
    status: string;
};

type FriendState = {
    pendingRequests: PendingRequest[];
    addPendingRequest: (request: PendingRequest) => void;
    removePendingRequest: (friendshipId: string) => void;
    setPendingRequests: (requests: PendingRequest[]) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
    pendingRequests: [],
    addPendingRequest: (request) => 
        set((state) => {
            if(state.pendingRequests.some(r => r.friendshipId === request.friendshipId)) {
                return state
            }

            return {pendingRequests: [...state.pendingRequests, request]}
        }),
    removePendingRequest: (friendshipId) => 
        set((state) => ({
            pendingRequests: state.pendingRequests.filter(
                (req) => req.friendshipId !== friendshipId
            )
        })),
    setPendingRequests: (requests) => set({ pendingRequests: requests }),
}))