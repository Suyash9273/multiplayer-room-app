"use client"

import { useState, useRef, useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"

// Structural Component (Kept for the scroll layout)
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, LogOut } from "lucide-react"

// Neon Blade Visual Components
import { AccentFrame } from "@/components/neonblade-ui/accent-frame"
import { Badge } from "@/components/neonblade-ui/badge"
import { GlitchText } from "@/components/neonblade-ui/glitch-text"
import NeonInput from "@/components/neonblade-ui/neon-input"
import { CornerCutButton } from "@/components/neonblade-ui/corner-cut-button"
import { NeonGlowCornerCutCard } from "@/components/neonblade-ui/neon-glow-corner-cut-card"
import { CyberCircuit } from "@/components/neonblade-ui/cyber-circuit"

export default function FuturisticChatUI() {
  const { currentRoom, roomUsers, leaveRoom, messages, sendMessage, username } = useSocket()
  const [messageInput, setMessageInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    sendMessage(messageInput)
    setMessageInput("") 
  }

  return (
    // 1. Root container upgraded with circuit background and futuristic fonts
    <div className="relative flex h-screen w-full bg-black overflow-hidden text-cyan-50 font-mono">
      <CyberCircuit
        className="z-0"
        color="#00f3ff"
        opacity={0.65}
        lineThickness={2}
        dotSize={3}
        dotType="filled" 
        glowColor="#00f3ff"
        glowIntensity="medium" 
      />

      {/* Wrapper to sit above the absolute-positioned circuit background */}
      <div className="relative z-10 flex h-full w-full">
        
        {/* ==================== SIDEBAR ==================== */}
        <aside className="hidden w-72 flex-col border-r border-cyan-500/30 md:flex bg-black/60 overflow-hidden">
          
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-500/30 px-4 bg-black/40">
            <h2 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">
              Network
            </h2>
            <Badge>{roomUsers.length} Active</Badge>
          </div>

          {/* SCROLL AREA: Scaffolding kept perfectly intact */}
          <ScrollArea className="flex-1 min-h-0 px-3 py-3">
            <div className="space-y-3 pb-4">
              {roomUsers.map((user) => (
                <NeonGlowCornerCutCard 
                  key={user} 
                  className="cursor-pointer p-3 text-sm transition-colors hover:bg-cyan-950/40"
                >
                  {user}
                </NeonGlowCornerCutCard>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* ==================== CHAT AREA ==================== */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden min-h-0 bg-black/40">
          
          {/* NEW FEATURE: Header with Dynamic Room Name & Leave Button */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-500/30 px-6 bg-black/40">
            <GlitchText className="text-lg font-semibold tracking-widest">
              {currentRoom ? `ROOM: ${currentRoom.toUpperCase()}` : "MULTIPLAYER ROOM"}
            </GlitchText>

            <button
              onClick={() => leaveRoom(currentRoom)}
              className="group flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest text-purple-400 uppercase transition-all duration-300 border border-purple-500/40 bg-purple-950/20 hover:bg-purple-900/60 hover:text-white hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              LEAVE
            </button>
          </div>

          {/* SCROLL AREA: Scaffolding kept perfectly intact */}
          <ScrollArea className="flex-1 min-h-0 p-6">
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((msg) => (
                <div 
                  key={msg.timestamp} 
                  className={`flex w-full ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
                >
                  <NeonGlowCornerCutCard 
                    className={`max-w-[75%] px-4 py-3 ${
                      msg.sender === username 
                        ? 'border-cyan-400 bg-cyan-950/20' 
                        : 'border-purple-500/50 bg-black/60'
                    }`}
                  >
                    <div className={`mb-1 text-xs uppercase tracking-wider font-bold opacity-80 ${
                      msg.sender === username ? 'text-cyan-300' : 'text-purple-400'
                    }`}>
                      {msg.sender}
                    </div>
                    <div className="text-sm leading-relaxed text-gray-200">
                      {msg.message}
                    </div>
                  </NeonGlowCornerCutCard>
                </div>
              ))}
              <div ref={scrollRef} className="h-1" />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="shrink-0 border-t border-cyan-500/30 bg-black/80 p-4">
            <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl gap-3">
              <NeonInput
                value={messageInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                placeholder="Transmit message..."
                className="flex-1"
              />
              <CornerCutButton type="submit">
                <div className="flex items-center">
                  <Send className="mr-2 h-4 w-4" />
                  SEND
                </div>
              </CornerCutButton>
            </form>
          </div>
        </main>

      </div>
    </div>
  )
}