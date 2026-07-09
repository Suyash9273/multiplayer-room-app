"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/socket"
import { findMatch, cancelFindMatch } from "@/lib/socketActions"

// This is the real "pair me with a random stranger" flow — distinct from
// AnonymousRoomStarter, which only creates an empty room you have to share
// a link to manually. This puts the client in the server's waiting queue
// and gets matched automatically as soon as another stranger is waiting too.
export default function FindStrangerButton() {
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        const onWaiting = () => setIsSearching(true)

        const onMatchFound = ({ roomId }: { roomId: string }) => {
            setIsSearching(false)
            router.push(`/room/${roomId}`)
        }

        const onError = (message: string) => {
            setIsSearching(false)
            setError(message)
        }

        socket.on("waitingForMatch", onWaiting)
        socket.on("matchFound", onMatchFound)
        socket.on("matchmakingError", onError)

        return () => {
            socket.off("waitingForMatch", onWaiting)
            socket.off("matchFound", onMatchFound)
            socket.off("matchmakingError", onError)
        }
    }, [router])

    // If this component unmounts while still searching (navigated away,
    // closed the lobby tab section, etc.) tell the server to drop us from
    // the queue — otherwise we'd be a ghost entry that could get matched
    // to someone after we've already left.
    useEffect(() => {
        return () => {
            cancelFindMatch()
        }
    }, [])

    const handleClick = () => {
        if (isSearching) {
            cancelFindMatch()
            setIsSearching(false)
            return
        }
        setError("")
        findMatch()
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                className="w-full"
                variant={isSearching ? "destructive" : "default"}
                onClick={handleClick}
            >
                {isSearching ? "Cancel Search" : "Find a Stranger"}
            </Button>
            {isSearching && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                    Looking for someone to chat with...
                </p>
            )}
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
        </div>
    )
}
