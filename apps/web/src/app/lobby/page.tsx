"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import LobbyScreen from "@/components/chat/LobbyScreen"

export default function LobbyPage() {
    const isJoined = useSessionStore((s) => s.isJoined)
    const { data: session, isPending } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (isPending) return
        if (!session?.user) router.push("/")
    }, [isPending, session, router])

    if (isPending) return <div className="flex h-screen items-center justify-center"><span className="animate-pulse">Loading session...</span></div>
    if (!session?.user) return null
    if (!isJoined) return <div className="flex h-screen items-center justify-center"><span className="animate-pulse">Reconnecting...</span></div>

    return <LobbyScreen />
}