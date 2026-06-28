"use client"

import { useEffect, useState } from "react"

import { BACKEND_URL } from "@/lib/socket"
import { useFriendStore } from "@/store/friendStore"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

export function FriendManager() {
    const [receiverId, setReceiverId] = useState("")
    const [statusMsg, setStatusMsg] = useState("")

    useEffect(() => {
    const fetchPendingRequests = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/pending`, {
                credentials: "include" // vital for your auth cookies!
            });
            if (res.ok) {
                const data = await res.json();
                useFriendStore.getState().setPendingRequests(data);
            }
        } catch (error) {
            console.error("Failed to hydrate friend requests", error);
        }
    };

    fetchPendingRequests();
}, []);

    const pendingRequests = useFriendStore(
        (state) => state.pendingRequests
    )
    
    const handleAccept = async (friendshipId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ friendshipId }),
            })
            
            if (res.ok) {
                // Instantly remove it from the UI
                useFriendStore.getState().removePendingRequest(friendshipId)
                // (Later, we will add the user to a "Friends List" store here too!)
            }
        } catch (error) {
            console.error("Failed to accept friend request", error)
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
                // Instantly remove it from the UI
                useFriendStore.getState().removePendingRequest(friendshipId)
            }
        } catch (error) {
            console.error("Failed to decline friend request", error)
        }
    }

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!receiverId.trim()) return

        setStatusMsg("Sending...")

        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    receiverId,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to send request")
            }

            setStatusMsg("✅ Friend request sent")
            setReceiverId("")
        } catch (err: any) {
            setStatusMsg(`❌ ${err.message}`)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Friend Manager</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">

                {/* Send Friend Request */}

                <div className="space-y-3">
                    <h3 className="font-medium">
                        Send Friend Request
                    </h3>

                    <form
                        onSubmit={handleSendRequest}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder="Receiver User ID"
                            value={receiverId}
                            onChange={(e) =>
                                setReceiverId(e.target.value)
                            }
                        />

                        <Button type="submit">
                            Send
                        </Button>
                    </form>

                    {statusMsg && (
                        <p className="text-sm text-muted-foreground">
                            {statusMsg}
                        </p>
                    )}
                </div>

                <Separator />

                {/* Pending Requests */}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">
                            Pending Requests
                        </h3>

                        <Badge>
                            {pendingRequests.length}
                        </Badge>
                    </div>

                    <ScrollArea className="h-60 rounded-md border">
                        <div className="space-y-2 p-2">

                            {pendingRequests.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No pending requests.
                                </p>
                            ) : (
                                pendingRequests.map((req) => (
                                    <div
                                        key={req.friendshipId}
                                        className="flex items-center justify-between rounded-md border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {req.sender.username}
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                {req.sender.id}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleAccept(req.friendshipId)}
                                            >
                                                Accept
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDecline(req.friendshipId)}
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}

                        </div>
                    </ScrollArea>
                </div>

            </CardContent>
        </Card>
    )
}