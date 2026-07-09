"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import ProfileScreen from "@/components/chat/ProfileScreen"

export default function ProfilePage() {
    const isJoined = useSessionStore((s) => s.isJoined)
    const identityType = useSessionStore((s) => s.identityType)
    const { data: session, isPending } = useSession()
    const router = useRouter()

    // Same gate as lobby/page.tsx — a guest counts as a valid identity too.
    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest"

    useEffect(() => {
        if (isPending) return
        if (!hasSomeIdentity || !isJoined) router.push("/")
    }, [isPending, hasSomeIdentity, isJoined, router])

    if (isPending) return <div className="flex h-screen items-center justify-center"><span className="animate-pulse">Loading session...</span></div>
    if (!hasSomeIdentity || !isJoined) return null

    return <ProfileScreen />
}
