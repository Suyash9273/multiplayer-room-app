"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useSessionStore } from "@/store/sessionStore"
import { useFriendStore } from "@/store/friendStore"
import { BACKEND_URL } from "@/lib/socket"

import LobbyHeader from "./LobbyHeader"
import RoomEntryForm from "./RoomEntryForm"
import FindStrangerButton from "./FindStrangerButton"
import CreateRoomCard from "./CreateRoomCard"

// Deliberately minimal now — this used to be one large file doing
// everything (online users list, join-room form, friends tabs, pending
// requests, add-friend form, all permanently visible at once). That's all
// been split out: LobbyHeader owns the online count + friends/requests/
// add-friend popovers + profile link; this component just owns data
// hydration and the two primary actions (find a stranger / join a room).
export default function LobbyScreen() {
    const identityType = useSessionStore((s) => s.identityType)
    const isGuest = identityType === "guest"

    useEffect(() => {
        // Friends are a real-account concept — /api/friends/* is still
        // gated by `requireAuth` (user-only) on the backend, so a guest
        // hitting it would just get a 401 for nothing. Skip the call
        // entirely rather than eating a pointless round trip + console noise.
        if (isGuest) {
            useFriendStore.getState().setHydrated(true)
            return
        }

        const hydrateFriendData = async () => {
            try {
                const [pendingRes, friendsRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/friends/pending`, { credentials: "include" }),
                    fetch(`${BACKEND_URL}/api/friends/list`, { credentials: "include" })
                ]);

                if (pendingRes.ok) {
                    const pendingData = await pendingRes.json();
                    useFriendStore.getState().setPendingRequests(pendingData);
                }

                if (friendsRes.ok) {
                    const friendsData = await friendsRes.json();
                    useFriendStore.getState().setFriends(friendsData);
                }
            } catch (error) {
                console.error("Failed to hydrate friend system", error);
            } finally {
                useFriendStore.getState().setHydrated(true);
            }
        };

        hydrateFriendData();
    }, [isGuest]);

    return (
        <div className="container mx-auto max-w-2xl h-full py-10 space-y-6 px-4">
            <LobbyHeader />

            <Card>
                <CardHeader>
                    <CardTitle>Start Chatting</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <FindStrangerButton />
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                    </div>
                    <RoomEntryForm />
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                    </div>
                    <CreateRoomCard />
                </CardContent>
            </Card>
        </div>
    )
}
