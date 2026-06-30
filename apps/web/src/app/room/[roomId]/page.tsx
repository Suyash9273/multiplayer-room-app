"use client"
import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import RoomScreen from "@/components/chat/RoomScreen"

export default function RoomPage({params}: {params: Promise<{roomId: string}>}) {
    const isJoined = useSessionStore((state) => state.isJoined)
    const router = useRouter()
    const {roomId} = use(params)
    // CRITICAL FIX: Next.js automatically URL-encodes colons in dynamic routes.
    // So "dm:123:456" becomes "dm%3A123%3A456" in the URL.
    // We must decode it before passing it to your RoomScreen and Socket!

    const decodedRoomId = decodeURIComponent(roomId)

    useEffect(() => {
        // Protect the route from unauthenticated users
        if (!isJoined) {
            router.push("/");
        }
        else {
            // CRITICAL: Sync the URL state into your Zustand store, now we socket knows which room to send messages
            useSessionStore.getState().setCurrentRoom(decodedRoomId)
        }
    }, [isJoined, router]);

    if (!isJoined) return null;

    return <RoomScreen roomId={decodedRoomId} />;
}