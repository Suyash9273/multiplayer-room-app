"use client"
import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import RoomScreen from "@/components/chat/RoomScreen"

export default function RoomPage({params}: {params: Promise<{roomId: string}>}) {
    const isJoined = useSessionStore((state) => state.isJoined)
    const identityType = useSessionStore((state) => state.identityType)
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const {roomId} = use(params)

    const decodedRoomId = decodeURIComponent(roomId)

    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest";

    useEffect(() => {
        if (isPending) return;

        if (!hasSomeIdentity || !isJoined) {
            router.push("/")
            return
        }

        useSessionStore.getState().setCurrentRoom(decodedRoomId)
    }, [isPending, hasSomeIdentity, isJoined, router, decodedRoomId]);

    if (isPending) return null;
    if (!hasSomeIdentity || !isJoined) return null;

    return <RoomScreen roomId={decodedRoomId} />;
}