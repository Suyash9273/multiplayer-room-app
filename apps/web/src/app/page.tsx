"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import LoginScreen from "@/components/chat/LoginScreen"

export default function Home() {
    const isJoined = useSessionStore((s) => s.isJoined);
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isPending) return;

        if (session?.user && isJoined) {
            router.push("/lobby");
        }
    }, [isPending, session, isJoined, router]);

    if (isPending) return null;

    if (!session?.user) {
        return <LoginScreen />;
    }

    if (!isJoined) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="animate-pulse">Reconnecting...</span>
            </div>
        );
    }

    return null;
}