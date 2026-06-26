"use client"
import NeonInput from "@/components/neonblade-ui/neon-input"
import { NotchCard } from "@/components/neonblade-ui/notch-card";
import { Cpu, Zap, Shield } from "lucide-react";
import { DatalinesWithGrid } from "../neonblade-ui/datalines-with-grid";

import { useState } from "react"
import CornerCutButton from "../neonblade-ui/corner-cut-button"

import { usePresenceStore } from "@/store/presenceStore"
import { useSessionStore } from "@/store/sessionStore"

import RoomEntryForm from "./RoomEntryForm";

const LobbyScreen = () => {
  const username = useSessionStore((s) => s.username)
  const onlineUsers = usePresenceStore((s) => s.onlineUsers)

  return (
    <div className="min-h-screen">

      <div>
        <DatalinesWithGrid />
      </div>

      <div className="flex min-h-screen">
        <div className="flex w-full flex-col items-center justify-center gap-8 p-4">
          <div className="w-full max-w-sm">
            <NotchCard
              notchSides={["top"]}
              notchSize={16}
              notchWidth={60}
              notchWidthV={15}
              borderColor="purple"
              accentColor="purple"
              hoverEffect="scan"
              glowIntensity="high"
              title={`Welcome: ${username}`}
              description="Enter in a room."
              icon={<Shield className="w-full h-full" />}
            />
          </div>

          <RoomEntryForm />
        </div>

        <div className="relative z-10 flex w-full max-w-sm flex-col border border-purple-500/30 bg-[#0a0f14] p-4">
          <h3 className="mb-3 border-b border-purple-500/30 pb-2 font-orbitron text-sm uppercase tracking-wider text-purple-400">
            Active Operators ({onlineUsers?.length || 0})
          </h3>

          {/* Scrollable Container */}
          {/* max-h-[220px] holds about 5-6 items before forcing a scrollbar */}
          <div className="cyber-scrollbar flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-2">

            {onlineUsers && onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <div
                  key={user}
                  className="flex items-center gap-3 border-l-2 border-purple-500 bg-purple-500/10 p-2 transition-colors hover:bg-purple-500/20"
                >
                  {/* Blinking green online indicator */}
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_#4ade80]"></div>

                  {/* Adjust user.username to just 'user' if your array is just strings */}
                  <span className="text-sm text-purple-100">
                    {user}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-sm text-purple-400/50">
                No other operators online.
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

export default LobbyScreen
