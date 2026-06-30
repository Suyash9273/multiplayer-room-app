"use client"

import { useRouter } from "next/navigation"
import { getDMRoomId } from "@multiplayer/shared"
import { useSessionStore } from "@/store/sessionStore"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react" // Or whatever icon library you use

import { useFriendStore } from "@/store/friendStore"
import { usePresenceStore } from "@/store/presenceStore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export function FriendList() {
    // 1. Get the static array of accepted friends
    const friends = useFriendStore((state) => state.friends)

    const isHydrated = useFriendStore((state) => state.isHydrated)

    // 2. Get the real-time array of who is currently connected
    const onlineUsers = usePresenceStore((state) => state.onlineUsers)

    // Calculate how many friends are online for the badge
    const onlineFriendsCount = friends.filter(f => onlineUsers.includes(f.user.username)).length

    const router = useRouter();
    const currentUserId = useSessionStore((s) => s.userId);

    const handleMessageFriend = (friendId: string) => {
        if (!currentUserId || !friendId) return;

        // 1. Generate the deterministic ID
        const dmRoomId = getDMRoomId(currentUserId, friendId);

        // 2. Push them to the dynamic Next.js route!
        router.push(`/room/${dmRoomId}`);
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">My Friends</CardTitle>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    {onlineFriendsCount} Online
                </Badge>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                        {
                            !isHydrated ? (
                                <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">
                                    Loading friends...
                                </p>
                            ) : friends.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    You haven't added any friends yet.
                                </p>
                            ) : (
                                friends.map((friend) => {
                                    const isOnline = onlineUsers.includes(friend.user.username);

                                    return (
                                        <div
                                            key={friend.friendshipId}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {friend.user.username}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {friend.user.name}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {isOnline ? "Online" : "Offline"}
                                                    </span>
                                                    <div
                                                        className={`h-2.5 w-2.5 rounded-full ${isOnline
                                                            ? "bg-green-500"
                                                            : "bg-zinc-300 dark:bg-zinc-700"
                                                            }`}
                                                    />
                                                </div>

                                                {/* THE NEW MESSAGE BUTTON */}
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleMessageFriend(friend.user.id)}
                                                >
                                                    <MessageSquare className="h-4 w-4 mr-2" />
                                                    Message
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        }
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}