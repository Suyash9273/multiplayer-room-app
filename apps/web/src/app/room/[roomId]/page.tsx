"use client"
import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import RoomScreen from "@/components/chat/RoomScreen"

export default function RoomPage({params}: {params: Promise<{roomId: string}>}) {
    const isJoined = useSessionStore((state) => state.isJoined)
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const {roomId} = use(params)

    const decodedRoomId = decodeURIComponent(roomId)

    useEffect(() => {
        if (isPending) return;

        if (!session?.user) {
            router.push("/")
            return
        }

        if (isJoined) {
            useSessionStore.getState().setCurrentRoom(decodedRoomId)
        }
    }, [isPending, session, isJoined, router, decodedRoomId]);

    if (isPending) return null;
    if (!session?.user) return null;

    if (!isJoined) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="animate-pulse">Reconnecting...</span>
            </div>
        );
    }

    return <RoomScreen roomId={decodedRoomId} />;
}