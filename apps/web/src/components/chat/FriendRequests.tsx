"use client"

import { useState } from "react"
import { BACKEND_URL } from "@/lib/socket"
import { useFriendStore } from "@/store/friendStore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function FriendRequests() {
    const [receiverId, setReceiverId] = useState("")
    const [statusMsg, setStatusMsg] = useState("")
    
    const pendingRequests = useFriendStore((state) => state.pendingRequests)

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!receiverId.trim()) return
        
        setStatusMsg("Sending...")
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ receiverId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to send request")
            
            setStatusMsg("✅ Request sent")
            setReceiverId("")
        } catch (err: any) {
            setStatusMsg(`❌ ${err.message}`)
        }
    }

    const handleAccept = async (friendshipId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ friendshipId }),
            })
            if (res.ok) {
                useFriendStore.getState().removePendingRequest(friendshipId)
                // Note: To make the UI perfect, you would also manually fetch/add the new friend to the friends array here, 
                // or rely on a socket event to push the new friend data to the receiver!
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
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg">Manage Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Send Request Form */}
                <div className="space-y-3">
                    <form onSubmit={handleSendRequest} className="flex gap-2">
                        <Input 
                            placeholder="Enter User ID..." 
                            value={receiverId}
                            onChange={(e) => setReceiverId(e.target.value)}
                        />
                        <Button type="submit">Send</Button>
                    </form>
                    {statusMsg && <p className="text-sm text-muted-foreground">{statusMsg}</p>}
                </div>

                <Separator />

                {/* Pending Requests List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">Incoming Requests</h3>
                        <Badge variant="secondary">{pendingRequests.length}</Badge>
                    </div>
                    
                    <ScrollArea className="h-48 rounded-md border">
                        <div className="p-2 space-y-2">
                            {pendingRequests.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No pending requests.</p>
                            ) : (
                                pendingRequests.map((req) => (
                                    <div key={req.friendshipId} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/50">
                                        <div>
                                            <p className="font-medium text-sm">{req.sender.username}</p>
                                            <p className="text-xs text-muted-foreground">{req.sender.id}</p>
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
            </CardContent>
        </Card>
    )
}