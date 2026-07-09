"use client"

import { useState } from "react"
import { BACKEND_URL } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// The "search icon -> add someone by username" half of what used to be one
// combined FriendRequests component. Split out so the search icon in
// LobbyHeader can open just this, without also dragging along the pending
// -requests list (that's PendingRequestsPanel now).
export function AddFriendForm() {
    const [username, setUsername] = useState("")
    const [statusMsg, setStatusMsg] = useState("")

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim()) return

        setStatusMsg("Sending...")
        try {
            const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to send request")

            setStatusMsg("✅ Request sent")
            setUsername("")
        } catch (err: any) {
            setStatusMsg(`❌ ${err.message}`)
        }
    }

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-sm">Add a friend</h3>
            <form onSubmit={handleSendRequest} className="flex gap-2">
                <Input
                    placeholder="Enter username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Button type="submit">Send</Button>
            </form>
            {statusMsg && <p className="text-sm text-muted-foreground">{statusMsg}</p>}
        </div>
    )
}
