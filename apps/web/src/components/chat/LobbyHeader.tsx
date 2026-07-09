"use client"

import Link from "next/link"
import { Users, Bell, Search, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useSessionStore } from "@/store/sessionStore"
import { usePresenceStore } from "@/store/presenceStore"
import { useFriendStore } from "@/store/friendStore"

import { FriendList } from "./FriendList"
import { PendingRequestsPanel } from "./PendingRequestsPanel"
import { AddFriendForm } from "./AddFriendForm"

// The lobby's top bar: who's online (a COUNT only — the old design listed
// every single online username, which doesn't scale and isn't much use to
// look at), and three icon-triggered popovers that replace what used to be
// permanently-visible Tabs taking up half the page. Friends-related icons
// are hidden for guests, same reasoning as before — there's no durable
// identity for a guest to attach a friendship to.
export default function LobbyHeader() {
    const username = useSessionStore((s) => s.username)
    const identityType = useSessionStore((s) => s.identityType)
    const isGuest = identityType === "guest"

    const onlineCount = usePresenceStore((s) => s.onlineUsers.length)
    const pendingCount = useFriendStore((s) => s.pendingRequests.length)

    return (
        <div className="flex items-center justify-between border-b pb-4">
            <div>
                <h1 className="text-xl font-semibold">Lobby</h1>
                <p className="text-sm text-muted-foreground">
                    Welcome, <strong>{username}</strong>
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {onlineCount} online
                </Badge>

                {!isGuest && (
                    <>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Friends list">
                                    <Users className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80">
                                <FriendList />
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative" aria-label="Pending requests">
                                    <Bell className="h-5 w-5" />
                                    {pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80">
                                <PendingRequestsPanel />
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Add a friend">
                                    <Search className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80">
                                <AddFriendForm />
                            </PopoverContent>
                        </Popover>
                    </>
                )}

                <Button variant="ghost" size="icon" asChild aria-label="Profile">
                    <Link href="/profile">
                        <UserCircle className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </div>
    )
}
