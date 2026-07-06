"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import LobbyScreen from "@/components/chat/LobbyScreen"

export default function LobbyPage() {
    const isJoined = useSessionStore((s) => s.isJoined)
    const identityType = useSessionStore((s) => s.identityType)
    const { data: session, isPending } = useSession()
    const router = useRouter()

    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest"

    useEffect(() => {
        if (isPending) return
        if (!hasSomeIdentity || !isJoined) router.push("/")
    }, [isPending, hasSomeIdentity, isJoined, router])

    if (isPending) return <div className="flex h-screen items-center justify-center"><span className="animate-pulse">Loading session...</span></div>
    if (!hasSomeIdentity || !isJoined) return null

    return <LobbyScreen />
}