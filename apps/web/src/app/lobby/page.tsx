"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import LobbyScreen from "@/components/chat/LobbyScreen"

export default function LobbyPage() {
    const isJoined = useSessionStore((s) => s.isJoined);
    const router = useRouter();

    useEffect(() => {
        // Protect the route: If they bypass login and go straight to /lobby, kick them back
        if (!isJoined) {
            router.push("/");
        }
    }, [isJoined, router]);

    if (!isJoined) return null;

    // Render your existing LobbyScreen component untouched!
    return <LobbyScreen />;
}