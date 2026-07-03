"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area" // Kept for sidebar
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, LogOut } from "lucide-react"

import { useSessionStore } from "@/store/sessionStore"
import { usePresenceStore } from "@/store/presenceStore"
import { useChatStore } from "@/store/chatStore"
import { useTypingStore } from "@/store/typingStore"
import { useFriendStore } from "@/store/friendStore" // NEW: Imported to look up friend names
import {
  leaveRoom,
  sendMessage,
  emitTyping,
  emitStopTyping,
  enterRoom
} from "@/lib/socketActions"
import { useRouter } from "next/navigation"
import { BACKEND_URL } from "@/lib/socket"


export default function RoomScreen({ roomId }: { roomId: string }) { // FIX: Destructure props correctly
  const username = useSessionStore((s) => s.username)
  const currentUserId = useSessionStore((s) => s.userId) // NEW: Get current user ID
  const roomUsers = usePresenceStore((s) => s.roomUsers)
  const messages = useChatStore((s) => s.messages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setMessagesFromHistory = useChatStore((s) => s.setMessagesFromHistory)
  const typingUsers = useTypingStore((s) => s.typingUsers)
  const friends = useFriendStore((s) => s.friends) // NEW: Get friends list

  const isDMRoom = roomId.startsWith("dm:")

  const [messageInput, setMessageInput] = useState("")
  const router = useRouter()

  // --- PAGINATION STATE ---
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // --- DOM REFS ---
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerTargetRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- DM CONTEXT LOGIC ---
  const isDirectMessage = roomId.startsWith("dm:");


  const chatTitle = useMemo(() => {
    if (!isDirectMessage) return `Room: ${roomId}`;

    const parts = roomId.split(":");
    // Figure out which ID is the friend's ID
    const targetUserId = parts[1] === currentUserId ? parts[2] : parts[1];

    // Look up the friend in the Zustand store using your actual Friend type
    const friend = friends.find(f => f.user.id === targetUserId);

    // Grab their username, fallback if not found
    const friendName = friend ? friend.user.username : "Unknown Friend";

    return `Chat with ${friendName}`;
  }, [roomId, isDirectMessage, currentUserId, friends]);
  // --- THE AUTO-SCROLL FIX ---
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [lastMessageId])

  // Load first page whenever user enters a room
  useEffect(() => {
    if (!roomId) return;

    // 1. Tell the Express backend to physically join the Socket.IO room
    enterRoom(roomId);

    // 2. Reset pagination state for the new room
    setNextCursor(null);
    setHasMore(true);

    // 3. Fetch history
    fetchHistoricalMessages(null);
  }, [roomId]);

  // --- THE HISTORICAL FETCHER ---

  const fetchHistoricalMessages = useCallback(async (cursor?: string | null) => {
    if (isFetchingHistory || !hasMore || !roomId) return;
    setIsFetchingHistory(true);

    try {
      const container = scrollContainerRef.current;
      const previousScrollHeight = container?.scrollHeight || 0;
      let url = `${BACKEND_URL}/api/rooms/${roomId}/messages`;
      if (cursor) url += `?cursor=${cursor}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");

      const data = await res.json();

      setNextCursor(data.nextCursor);
      if (!data.nextCursor) setHasMore(false);

      const formattedHistory = data.messages.map((dbMsg: any) => ({
        id: dbMsg.id,
        roomId: dbMsg.roomId,
        message: dbMsg.message,
        sender: dbMsg.sender,
        timestamp: new Date(dbMsg.createdAt).getTime(),
        status: "sent",
        type: dbMsg.type
      }));

      if (!cursor) {
        setMessagesFromHistory(formattedHistory);
      } else {
        prependMessages(formattedHistory);
      }

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
        }
      });

    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  }, [roomId, hasMore, isFetchingHistory, prependMessages, setMessagesFromHistory])

  // --- THE INTERSECTION OBSERVER ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingHistory && hasMore) {
          fetchHistoricalMessages(nextCursor);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTargetRef.current) {
      observer.observe(observerTargetRef.current);
    }

    return () => observer.disconnect();
  }, [nextCursor, isFetchingHistory, hasMore, roomId]);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    sendMessage(messageInput)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitStopTyping()
    setMessageInput("")
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    emitTyping()

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping()
    }, 2000)
  }

  const handleTypingUsers = () => {
    if (typingUsers.length === 0) return null
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`
    return `Several people are typing...`
  }

  const handleLeaveRoom = () => {
    // 1 & 2. Network and State Teardown
    leaveRoom(roomId)

    // 3. Routing Teardown: Send them back to the lobby
    router.push("/lobby")
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">

      {/* SIDEBAR - Conditionally hidden if it's a direct message */}
      {!isDirectMessage && (
        <aside className="w-64 border-r flex flex-col bg-muted/20">
          <div className="h-14 flex items-center justify-between border-b px-4 shrink-0">
            <h2 className="font-semibold">Network</h2>
            <span className="text-xs text-muted-foreground">{roomUsers.length} Active</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="flex flex-col gap-2">
                {roomUsers.map((user) => (
                  <div key={user} className="p-2 text-sm rounded-md bg-secondary text-secondary-foreground">
                    {user}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>
      )}

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* DYNAMIC HEADER */}
        <div className="h-14 flex items-center justify-between border-b px-6 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">{chatTitle}</h2>
            {isDirectMessage && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                Private Connection
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>

        {/* MESSAGES CONTAINER */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
        >
          {/* THE INVISIBLE TRIGGER */}
          {hasMore && (
            <div ref={observerTargetRef} className="h-8 w-full flex justify-center items-center shrink-0">
              {isFetchingHistory && <span className="text-xs text-muted-foreground animate-pulse">Loading history...</span>}
            </div>
          )}

          {messages.map((msg) => {
            if (msg.type === "SYSTEM") {
              return (
                <div key={msg.id} className="self-center my-2">
                  <span className="text-xs text-muted-foreground font-medium px-3 py-1 bg-muted/50 rounded-full">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender === username;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <span className="text-xs text-muted-foreground mb-1 px-1">{msg.sender}</span>
                <div className={`p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.message}
                </div>
                <div>
                  {isMe && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {msg.status === "pending" ? "..." : 
                        isDMRoom && msg.isRead
                        ? "✓✓ Read"
                        : "✓ Sent"
                      }
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom auto-scroll anchor */}
          <div ref={scrollBottomRef} />
        </div>

        {/* TYPING INDICATOR */}
        <div className="h-6 px-6 flex items-center shrink-0 bg-background">
          <span className="text-xs text-muted-foreground italic">
            {handleTypingUsers()}
          </span>
        </div>

        {/* INPUT FORM */}
        <div className="p-4 border-t bg-background shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={messageInput}
              onChange={handleTyping}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}