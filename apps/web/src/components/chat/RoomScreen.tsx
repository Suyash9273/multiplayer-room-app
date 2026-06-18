"use client"

import { useState, useRef, useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"
import { ScrollArea } from "@/components/ui/scroll-area" // Kept for sidebar
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, LogOut } from "lucide-react"

export default function RoomScreen() {
  const {
    currentRoom, roomUsers, leaveRoom, messages, sendMessage, username,
    emitTyping, emitStopTyping, typingUsers,
    prependMessages,// NEW: Pulled from context to update the global timeline
    setMessagesFromHistory
  } = useSocket()

  const [messageInput, setMessageInput] = useState("")

  // --- PAGINATION STATE ---
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // --- DOM REFS ---
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerTargetRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- THE AUTO-SCROLL FIX ---
  // We only want to scroll to the bottom when a BRAND NEW message arrives.
  // By tracking the ID of the last message, we ignore history fetches (which prepend).
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [lastMessageId]) // Dependency is now the LAST message, not the whole array!

  // Load first page whenever user enters a room
  useEffect(() => {
    if (!currentRoom) return;

    // Reset pagination state for the new room
    setNextCursor(null);
    setHasMore(true);

    fetchHistoricalMessages(null);
  }, [currentRoom]);

  // --- THE HISTORICAL FETCHER ---
  const fetchHistoricalMessages = async (cursor?: string | null) => {
    if (isFetchingHistory || !hasMore || !currentRoom) return;
    setIsFetchingHistory(true);

    try {
      // 1. Capture the exact height of the container BEFORE we add old messages
      const container = scrollContainerRef.current;
      const previousScrollHeight = container?.scrollHeight || 0;
      const API_BASE_URL = "http://localhost:5000";
      let url = `${API_BASE_URL}/api/rooms/${currentRoom}/messages`;
      if (cursor) url += `?cursor=${cursor}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");

      const data = await res.json();

      // 2. Update pagination pointers
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
        // First page
        setMessagesFromHistory(formattedHistory);
      } else {
        // Older pages
        prependMessages(formattedHistory);
      }

      // 4. THE SCROLL JUMP FIX
      // requestAnimationFrame waits for React to actually paint the new messages to the DOM
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          // Shift the scrollbar down by the exact pixel height of the newly added DOM elements
          container.scrollTop = newScrollHeight - previousScrollHeight;
        }
      });

    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // --- THE INTERSECTION OBSERVER ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the invisible trigger div hits the screen, fetch more!
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
  }, [nextCursor, isFetchingHistory, hasMore, currentRoom]);


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

  console.log(
    "MESSAGE IDS:",
    messages.map(m => m.id)
  )

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* SIDEBAR */}
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

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <div className="h-14 flex items-center justify-between border-b px-6 bg-muted/10 shrink-0">
          <h2 className="font-semibold">Room: {currentRoom}</h2>
          <Button variant="outline" size="sm" onClick={() => leaveRoom(currentRoom)}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>

        {/* MESSAGES CONTAINER */}
        {/* We replaced ScrollArea with a native div to gain precise control over scrollTop */}
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
                      {msg.status === "pending" ? "..." : "✓"}
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