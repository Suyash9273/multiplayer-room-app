import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

import { usePresenceStore } from "@/store/presenceStore"
import { useSessionStore } from "@/store/sessionStore"

import RoomEntryForm from "./RoomEntryForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { FriendList } from "./FriendList"
import { FriendRequests } from "./FriendRequests"
import { useEffect } from "react"
import { BACKEND_URL } from "@/lib/socket"
import { useFriendStore } from "@/store/friendStore"


export default function LobbyScreen() {
    const username = useSessionStore((s) => s.username)
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)

    useEffect(() => {
        const hydrateFriendData = async () => {
            try {
                // Fire both requests at the exact same time
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
                // 🚀 Tell the UI the data is finished loading!
                useFriendStore.getState().setHydrated(true);
            }
        };

        hydrateFriendData();
    }, []);

    return (
        <div className="container mx-auto max-w-6xl h-full py-10 space-y-6 px-4">

            <Card>
                <CardHeader>
                    <CardTitle>Lobby</CardTitle>
                </CardHeader>

                <CardContent>
                    Welcome, <strong>{username}</strong>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">

                <Card>
                    <CardHeader>
                        <CardTitle>Join Room</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <RoomEntryForm />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Online Users ({onlineUsers.length})
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <ScrollArea className="h-72">
                            <div className="space-y-2">

                                {onlineUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nobody online.
                                    </p>
                                ) : (
                                    onlineUsers.map((user) => (
                                        <div
                                            key={user}
                                            className="flex items-center justify-between rounded-md border p-2"
                                        >
                                            <span>{user}</span>

                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                        </div>
                                    ))
                                )}

                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

            </div>

            <Separator />

            {/* BOTTOM ROW: The Personal Social Panel */}
        <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Social</h2>
            
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-[400px] grid-cols-2 mb-4">
                    <TabsTrigger value="friends">Friends List</TabsTrigger>
                    <TabsTrigger value="requests">Pending Requests</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends">
                    <div className="md:w-1/2">
                        <FriendList />
                    </div>
                </TabsContent>
                
                <TabsContent value="requests">
                    <div className="md:w-1/2">
                        <FriendRequests />
                    </div>
                </TabsContent>
            </Tabs>
        </div>

        </div>
    )
}