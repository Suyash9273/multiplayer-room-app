"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/sessionStore"
import { useSession } from "@/lib/auth-client"
import LoginScreen from "@/components/chat/LoginScreen"

export default function Home() {
    const isJoined = useSessionStore((s) => s.isJoined);
    const identityType = useSessionStore((s) => s.identityType);
    const joinError = useSessionStore((s) => s.joinError);
    const { data: session, isPending } = useSession();
    const router = useRouter();

    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest";

    useEffect(() => {
        if (isPending) return;

        if (hasSomeIdentity && isJoined) {
            router.push("/lobby");
        }
    }, [isPending, hasSomeIdentity, isJoined, router]);

    if (isPending) return null;

    if (!isJoined) {
        if (joinError) {
            return (
                <div className="flex h-screen flex-col items-center justify-center gap-3">
                    <p className="text-sm text-red-500 font-medium">Couldn't connect: {joinError}</p>
                    <button
                        className="text-sm underline text-muted-foreground"
                        onClick={() => window.location.reload()}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return <LoginScreen />;
    }

    return null;
}