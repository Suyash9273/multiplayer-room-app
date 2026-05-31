"use client"

import NeonInput from "@/components/neonblade-ui/neon-input"
import { Hexagons } from "@/components/neonblade-ui/hexagons"

import { useState } from "react"
import { useSocket } from "@/hooks/useSocket"
import CornerCutButton from "../neonblade-ui/corner-cut-button"

const LoginScreen = () => {
  const [username, setUsername] = useState<string>("")
  const { join } = useSocket()

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">

      <Hexagons
        hexColor="transparent"              // cell fill (rgba or hex)
        hexBorderColor="rgba(0,243,255,0.2)"
        hexSize={40}                        // circumradius in px
        borderWidth={1}

        hoverEffect={true}                  // hover is tracked at document level —
        // works even through z-stacked overlays
        hoverColor="rgba(0,243,255,0.15)"   // fill color on hover
        hoverBorderColor="#00f3ff"          // border color on hover ("" = no change)

        borderGlowEffect={true}             // neon glow shadow on ALL borders
        borderGlowColor="#00f3ff"           // glow color (independent of border color)
        borderGlowRadius={10}               // glow blur radius in px

        beamEffect={true}                   // beams flowing along hex edges
        beamColor="#00f3ff"                 // hex or rgba — both fully supported
        beamGlowColor="#00f3ff"
        maxBeams={20}
        beamSpeed={2}
        beamLength={80}
        beamSpawnProbability={0.08}

        overlay={true}                      // dark vignette overlay
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 border border-cyan-500/30 bg-[#0a0f14] p-6">

        <div className="relative z-10">
          <h2 className="mb-1 font-orbitron text-xl uppercase text-cyan-400">
            System Access
          </h2>
          <p className="text-sm text-cyan-400/65">
            Enter your credentials to continue
          </p>
        </div>

        <form className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            join(username)
          }}>

          <NeonInput
            shape="corner-cut"
            corner="tl-br"
            cornerSize={10}
            color="cyan"
            label="Username"
            placeholder="Enter username"
            glowIntensity="strong"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <CornerCutButton
            color="cyan"
            showArrow
            hoverEffect="glow"
            type="submit"
          >
            Join
          </CornerCutButton>
        </form>

      </div>

    </div>
  )
}

export default LoginScreen
