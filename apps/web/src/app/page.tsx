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

    // A guest has no Better Auth session at all — `isJoined` (set once the
    // server confirms identity via the socket "join" ack) is the only
    // signal we have for them, so the lobby gate has to accept EITHER a
    // real session or a confirmed guest join, not just the former.
    const hasSomeIdentity = Boolean(session?.user) || identityType === "guest";

    // Mirrors LoginScreen's own "needs a username" branch. A session that
    // exists but has no username picked yet genuinely needs the person to
    // act — there's no safe way to auto-generate one. Everything else
    // that already has an identity is fully set up and just waiting on
    // the (fully automatic) socket handshake SocketInit already kicked off.
    const needsUsername = Boolean(session?.user) && !session?.user.username;

    useEffect(() => {
        if (isPending) return;

        if (hasSomeIdentity && isJoined) {
            router.push("/lobby");
        }
    }, [isPending, hasSomeIdentity, isJoined, router]);

    if (isPending) return null;

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

    // Genuinely needs the person to do something: sign in, pick a guest
    // path, or (fresh sign-up) claim a username. LoginScreen owns all of
    // these states.
    if (!hasSomeIdentity || needsUsername) {
        return <LoginScreen />;
    }

    // Everything's already in place — a real session with a username, or
    // a confirmed guest — SocketInit is already auto-running the join
    // handshake in the background (usually well under a second). Showing
    // LoginScreen's interactive "Enter Lobby" button here would just
    // flash briefly before this redirects anyway, implying an action is
    // needed when none is. A quiet spinner is the honest version of "there
    // is genuinely nothing for you to click right now".
    if (!isJoined) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="animate-pulse text-sm text-muted-foreground">Connecting...</span>
            </div>
        );
    }

    return null;
}