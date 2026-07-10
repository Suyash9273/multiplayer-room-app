"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BACKEND_URL } from "@/lib/socket"

// This used to be AnonymousRoomStarter — it created a room and silently
// navigated you into it, alone, with no way for anyone else to ever join
// (nothing showed the room's id anywhere). Now it actually does what
// "create a room" should mean: create it, hand you back the id, let you
// copy it and send it to someone specific. They paste it into "Join a
// room" (RoomEntryForm), which already validates and joins properly.
export default function CreateRoomCard() {
    const [roomId, setRoomId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState("")
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    const handleCreate = async () => {
        setIsCreating(true)
        setError("")
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms/anonymous`, {
                method: "POST",
                credentials: "include",
            })
            if (!res.ok) throw new Error(`Failed with status ${res.status}`)

            const data = await res.json()
            setRoomId(data.roomId)
        } catch (err) {
            console.error(err)
            setError("Couldn't create a room. Try again.")
        } finally {
            setIsCreating(false)
        }
    }

    const handleCopy = async () => {
        if (!roomId) return
        try {
            await navigator.clipboard.writeText(roomId)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            setError("Couldn't copy — you can still select and copy the id manually.")
        }
    }

    if (roomId) {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                    Share this room id with someone — they can join it under "Join a room".
                </p>
                <div className="flex gap-2">
                    <Input readOnly value={roomId} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy room id">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                <Button className="w-full" onClick={() => router.push(`/room/${roomId}`)}>
                    Enter Room
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <Button className="w-full" variant="outline" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create a Room"}
            </Button>
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
        </div>
    )
}
