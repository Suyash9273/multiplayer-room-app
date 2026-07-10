"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/socket"
import { findMatch, cancelFindMatch } from "@/lib/socketActions"

// Duration options for interest-based matching: how long to hold out for
// someone who shares an interest before accepting anyone. "Forever" never
// falls back on its own — see matchmaking.handlers.ts for the actual
// pairing logic this drives.
const DURATION_OPTIONS: { label: string; value: number | null }[] = [
    { label: "5s", value: 5000 },
    { label: "10s", value: 10000 },
    { label: "Forever", value: null },
]

// The real "pair me with a random stranger" flow — distinct from
// CreateRoomCard, which just creates an empty room you have to share a
// link to manually. This puts the client in the server's waiting queue
// and gets matched automatically — preferring someone who shares an
// interest (set on your Profile page) within the chosen time window,
// falling back to anyone waiting once that window elapses.
export default function FindStrangerButton() {
    const [isSearching, setIsSearching] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [duration, setDuration] = useState<number | null>(5000)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        const onWaiting = () => { setIsSearching(true); setIsExpanded(false) }
        const onFallbackActive = () => setIsExpanded(true)

        const onMatchFound = ({ roomId }: { roomId: string }) => {
            setIsSearching(false)
            setIsExpanded(false)
            router.push(`/room/${roomId}`)
        }

        const onError = (message: string) => {
            setIsSearching(false)
            setIsExpanded(false)
            setError(message)
        }

        socket.on("waitingForMatch", onWaiting)
        socket.on("fallbackActive", onFallbackActive)
        socket.on("matchFound", onMatchFound)
        socket.on("matchmakingError", onError)

        return () => {
            socket.off("waitingForMatch", onWaiting)
            socket.off("fallbackActive", onFallbackActive)
            socket.off("matchFound", onMatchFound)
            socket.off("matchmakingError", onError)
        }
    }, [router])

    // If this component unmounts while still searching, tell the server to
    // drop us from the queue — otherwise we'd be a ghost entry that could
    // get matched to someone after we've already left.
    useEffect(() => {
        return () => { cancelFindMatch() }
    }, [])

    const handleClick = () => {
        if (isSearching) {
            cancelFindMatch()
            setIsSearching(false)
            setIsExpanded(false)
            return
        }
        setError("")
        findMatch(duration)
    }

    return (
        <div className="flex flex-col gap-2">
            {!isSearching && (
                <div className="flex gap-1.5 justify-center">
                    {DURATION_OPTIONS.map((opt) => (
                        <Button
                            key={opt.label}
                            type="button"
                            size="sm"
                            variant={duration === opt.value ? "default" : "outline"}
                            onClick={() => setDuration(opt.value)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
            )}

            <Button
                className="w-full"
                variant={isSearching ? "destructive" : "default"}
                onClick={handleClick}
            >
                {isSearching ? "Cancel Search" : "Find a Stranger"}
            </Button>

            {isSearching && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                    {isExpanded
                        ? "Still no shared interest — now matching with anyone..."
                        : "Looking for someone with a shared interest..."}
                </p>
            )}
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
        </div>
    )
}
