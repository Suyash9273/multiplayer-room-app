"use client"

import { useState, useRef, useEffect, useCallback } from "react"
// 1. NEW: Import useSearchParams for URL metadata extraction
import { useRouter, useSearchParams } from "next/navigation" 
import { ScrollArea } from "@/components/ui/scroll-area" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, LogOut, Pencil, Trash2, Check, X } from "lucide-react"

import { useSessionStore } from "@/store/sessionStore"
import { usePresenceStore } from "@/store/presenceStore"
import { useChatStore } from "@/store/chatStore"
import { useTypingStore } from "@/store/typingStore"
// REMOVED: useFriendStore is no longer needed here since title comes from URL parameters
import {
  leaveRoom,
  sendMessage,
  emitTyping,
  emitStopTyping,
  enterRoom,
  markRead,
  editMessage,
  deleteMessage
} from "@/lib/socketActions"
import { BACKEND_URL } from "@/lib/socket"


export default function RoomScreen({ roomId }: { roomId: string }) { 
  const username = useSessionStore((s) => s.username)
  const currentUserId = useSessionStore((s) => s.userId) 
  const roomUsers = usePresenceStore((s) => s.roomUsers)
  const messages = useChatStore((s) => s.messages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setMessagesFromHistory = useChatStore((s) => s.setMessagesFromHistory)
  const typingUsers = useTypingStore((s) => s.typingUsers)

  const [messageInput, setMessageInput] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [editError, setEditError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // ============================================================================
  // URL METADATA PARSER (Replaces deterministic string splitting)
  // ============================================================================
  const urlRoomType = searchParams.get("type") || "GROUP"
  const urlTitle = searchParams.get("title")

  // Determine room context dynamically
  const isDMRoom = urlRoomType === "DIRECT"
  
  // Set header seamlessly from URL, fallback to raw UUID if none provided
  const chatTitle = isDMRoom && urlTitle 
      ? `Chat with ${urlTitle}` 
      : urlTitle || `Room: ${roomId.slice(0, 8)}...`

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

      // ALIGNED WITH NEW SCHEMA: Map `senderId` and `senderDisplayName`
      const formattedHistory = data.messages.map((dbMsg: any) => ({
        id: dbMsg.id,
        roomId: dbMsg.roomId,
        message: dbMsg.message,
        senderId: dbMsg.senderId,
        senderDisplayName: dbMsg.senderDisplayName,
        timestamp: new Date(dbMsg.createdAt).getTime(),
        status: "sent",
        type: dbMsg.type,
        isRead: dbMsg.isRead,
        readAt: dbMsg.readAt ? new Date(dbMsg.readAt).getTime() : undefined,
        editedAt: dbMsg.editedAt ? new Date(dbMsg.editedAt).getTime() : undefined,
        deletedAt: dbMsg.deletedAt ? new Date(dbMsg.deletedAt).getTime() : undefined,
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


  // --- READ RECEIPTS ---
  // Tell the server "I've seen this room" whenever we enter it, AND again
  // whenever the message list changes while we're still looking at it (a
  // new incoming message counts as "seen" too, since the room is open).
  // The server no-ops harmlessly if there's nothing new to mark.
  useEffect(() => {
    if (!roomId) return;
    markRead(roomId);
  }, [roomId, messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return

    // NEW PROTOCOL: We pass a full object to socketActions to support the new schema.
    // Ensure `sendMessage` inside `@/lib/socketActions` is updated to accept this payload.
    sendMessage({
      roomId,
      message: messageInput.trim(),
      type: "USER"
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitStopTyping()
    setMessageInput("")
  }

  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingId(messageId)
    setEditDraft(currentText)
    setEditError("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditDraft("")
    setEditError("")
  }

  const handleSaveEdit = (messageId: string) => {
    const trimmed = editDraft.trim()
    if (!trimmed) return
    editMessage(roomId, messageId, trimmed, (error) => setEditError(error))
    // Not optimistic — the bubble updates when "messageEdited" comes back
    // (same round trip either way, and avoids a rollback dance on error).
    // Just close the editor; if it failed, the text simply won't change
    // and editError is available if you want to surface it elsewhere.
    setEditingId(null)
    setEditDraft("")
  }

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(roomId, messageId, (error) => console.error("Delete failed:", error))
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
    leaveRoom(roomId)
    router.push("/lobby")
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">

      {/* SIDEBAR - Conditionally hidden if it's a direct message */}
      {!isDMRoom && (
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
            {isDMRoom && (
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

            // Secure user-check using the relational ID if available, falling back to name comparison
            const isMe = msg.senderId 
                ? msg.senderId === currentUserId 
                : msg.senderDisplayName === username;

            // Deleted messages are a TOMBSTONE, not removed from the list —
            // the gap in conversation flow is meaningful. `msg.message` is
            // never trusted here even though the server already blanks it;
            // rendering is keyed entirely off `deletedAt` being present.
            if (msg.deletedAt) {
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {msg.senderDisplayName}
                  </span>
                  <div className="p-3 rounded-lg bg-muted/50 italic text-sm text-muted-foreground">
                    This message was deleted.
                  </div>
                </div>
              );
            }

            const isEditing = editingId === msg.id;
            // Editing/deleting only makes sense for a message that's actually
            // saved — a "pending" optimistic bubble hasn't gotten an id the
            // server recognizes yet, and a "failed" one was never persisted.
            const canModify = isMe && msg.status === "sent";

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[75%] group ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {msg.senderDisplayName}
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full min-w-[200px]">
                    <Input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(msg.id);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="text-sm"
                    />
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => handleSaveEdit(msg.id)} aria-label="Save edit">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={handleCancelEdit} aria-label="Cancel edit">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5">
                    {canModify && (
                      <div className="hidden group-hover:flex items-center gap-0.5 order-first">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(msg.id, msg.message)}
                          aria-label="Edit message"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteMessage(msg.id)}
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className={`p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${msg.status === "failed" ? "opacity-50" : ""}`}>
                      {msg.message}
                    </div>
                  </div>
                )}

                <div>
                  {isMe && (
                    <span className={`text-[10px] ml-2 ${msg.status === "failed" ? "text-red-500" : "text-muted-foreground"}`}>
                      {msg.status === "failed" ? `⚠ ${msg.error || "Failed to send"}` :
                        msg.status === "pending" ? "..." :
                        (isDMRoom && msg.isRead ? "✓✓ Read" : "✓ Sent")
                      }
                      {msg.editedAt && msg.status !== "failed" ? " · edited" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={scrollBottomRef} />
        </div>

        {/* TYPING INDICATOR */}
        <div className="h-6 px-6 flex items-center shrink-0 bg-background">
          <span className="text-xs text-muted-foreground italic">
            {handleTypingUsers()}
          </span>
        </div>

        {editError && (
          <div className="px-6 pb-1">
            <p className="text-xs text-red-500 font-medium max-w-4xl mx-auto">{editError}</p>
          </div>
        )}

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