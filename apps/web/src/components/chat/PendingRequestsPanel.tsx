"use client"

import { BACKEND_URL } from "@/lib/socket"
import { useFriendStore } from "@/store/friendStore"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FriendAcceptedPayload } from "@multiplayer/shared"

// The "bell icon -> incoming requests" half of what used to be one combined
// FriendRequests component. Split out so it can live behind a bell icon
// with its own unread-count badge, independent of the add-friend form
// (that's AddFriendForm now).
export function PendingRequestsPanel() {
    const pendingRequests = useFriendStore((state) => state.pendingRequests)

    const handleAccept = async (friendshipId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ friendshipId }),
            })

            if (res.ok) {
                const data: FriendAcceptedPayload = await res.json()
                useFriendStore.getState().removePendingRequest(friendshipId)
                useFriendStore.getState().addFriend({
                    friendshipId: data.friendshipId,
                    user: data.friend
                })
            }
        } catch (error) {
            console.error("Failed to accept", error)
        }
    }

    const handleDecline = async (friendshipId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ friendshipId }),
            })
            if (res.ok) {
                useFriendStore.getState().removePendingRequest(friendshipId)
            }
        } catch (error) {
            console.error("Failed to decline", error)
        }
    }

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-sm">Pending Requests</h3>
            <ScrollArea className="h-64 rounded-md border">
                <div className="p-2 space-y-2">
                    {pendingRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No pending requests.</p>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.friendshipId} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/50">
                                <div>
                                    <p className="font-medium text-sm">{req.sender.username}</p>
                                    <p className="text-xs text-muted-foreground">{req.sender.name}</p>
                                </div>
                                <div className="flex gap-2 w-full">
                                    <Button size="sm" className="flex-1" onClick={() => handleAccept(req.friendshipId)}>Accept</Button>
                                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDecline(req.friendshipId)}>Decline</Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
