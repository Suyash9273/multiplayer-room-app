import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

import { usePresenceStore } from "@/store/presenceStore"
import { useSessionStore } from "@/store/sessionStore"

import RoomEntryForm from "./RoomEntryForm"
import { FriendManager } from "./FriendManager"

export default function LobbyScreen() {
    const username = useSessionStore((s) => s.username)
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)

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

            <FriendManager />

        </div>
    )
}