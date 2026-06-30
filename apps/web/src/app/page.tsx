"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import LoginScreen from "@/components/chat/LoginScreen"

export default function Home() {
    const isJoined = useSessionStore((s) => s.isJoined);
    const router = useRouter();

    useEffect(() => {
        // If the user is already authenticated/joined, boot them to the lobby
        if (isJoined) {
            router.push("/lobby");
        }
    }, [isJoined, router]);

    // If they aren't joined, just show the login screen
    if (!isJoined) {
        return <LoginScreen />;
    }

    return null; // Prevent UI flash while redirecting
}
