"use client"

import { useState, useRef, useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, LogOut } from "lucide-react"

export default function RoomScreen() {
  const {
    currentRoom, roomUsers, leaveRoom, messages, sendMessage, username,
    emitTyping, emitStopTyping, typingUsers
  } = useSocket()

  const [messageInput, setMessageInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    sendMessage(messageInput)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    emitStopTyping()
    setMessageInput("")
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    emitTyping()

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

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

  return (
    /* CONSTRAINT 1: The Root Box. overflow-hidden kills the global browser scrollbar */
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 border-r flex flex-col bg-muted/20">
        <div className="h-14 flex items-center justify-between border-b px-4 shrink-0">
          <h2 className="font-semibold">Network</h2>
          <span className="text-xs text-muted-foreground">{roomUsers.length} Active</span>
        </div>

        {/* CONSTRAINT 2: The Sidebar Box. flex-1 takes remaining space, overflow-hidden stops it from growing */}
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

        {/* MESSAGES */}
        {/* CONSTRAINT 3: The Chat Box. Locks the message area so the input field stays at the bottom */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {

                // 1. The Discriminator Branch (System Messages)
                if (msg.type === "SYSTEM") {
                  return (
                    <div key={msg.id} className="self-center my-2">
                      <span className="text-xs text-muted-foreground font-medium px-3 py-1 bg-muted/50 rounded-full">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                // 2. The Standard Branch (User Messages)
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
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>

        {/* TYPING INDICATOR */}
        <div className="h-6 px-6 flex items-center shrink-0">
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