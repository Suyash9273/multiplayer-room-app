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

    // Same reasoning as the home page: a guest never has a Better Auth
    // session, so this route needs to trust `isJoined`/`identityType`
    // (confirmed by the server via the socket "join" ack) as an equally
    // valid form of identity, not just `session.user`.
    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest";

    useEffect(() => {
        if (isPending) return;

        // Same fix as page.tsx and lobby/page.tsx: a session existing is not
        // the same as having completed the join handshake (new sign-ups need
        // to pick a username first, for instance). Route back to "/" — where
        // LoginScreen owns every pre-join state — rather than stalling here
        // on a spinner that never resolves on its own.
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