"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BACKEND_URL } from "@/lib/socket"

// This is the manual-testing entry point for the anonymous chat pipeline:
// POST /api/rooms/anonymous creates a fresh ANONYMOUS room and makes the
// caller (whatever identity — user or guest — the server resolves from
// cookies) its first member, then we navigate straight into it. Share the
// resulting URL with a second browser/incognito tab to test two strangers
// meeting in the same room.
//
// This deliberately stops short of building a matchmaking queue (pairing
// two waiting strangers automatically) — that's a separate, meatier
// feature that belongs in its own handler once this pipeline is verified
// working end-to-end.
export default function AnonymousRoomStarter() {
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleStart = async () => {
        setIsCreating(true)
        setError("")
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms/anonymous`, {
                method: "POST",
                credentials: "include",
            })

            if (!res.ok) throw new Error(`Failed with status ${res.status}`)

            const { roomId } = await res.json()
            router.push(`/room/${roomId}`)
        } catch (err) {
            console.error(err)
            setError("Couldn't start a room. Try again.")
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <Button className="w-full" variant="outline" onClick={handleStart} disabled={isCreating}>
                {isCreating ? "Starting..." : "Start Anonymous Chat"}
            </Button>
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
        </div>
    )
}
