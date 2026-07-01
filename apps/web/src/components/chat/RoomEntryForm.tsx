"use client"

import{ useState } from 'react'
import CornerCutButton from '../neonblade-ui/corner-cut-button'
import NeonInput from '../neonblade-ui/neon-input'
import { useRouter } from "next/navigation";

const RoomEntryForm = () => {
  const [roomId, setRoomId] = useState<string>("")
  const router = useRouter()

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    
    // Instead of setCurrentRoom(roomInput), do this:
    router.push(`/room/${roomId}`);
};

  return (
    <div className="flex w-full justify-center">
        <div className="flex w-full max-w-sm flex-col gap-6 border border-cyan-500/30 bg-[#0a0f14] p-6">

          <div className="relative z-10">
            <h2 className="mb-1 font-orbitron text-xl uppercase text-cyan-400">
              Room Access
            </h2>
            <p className="text-sm text-cyan-400/65">
              Enter roomId
            </p>
          </div>

          <form className="flex flex-col gap-5"
          onSubmit={handleJoinRoom}
          >
            <NeonInput
              shape="corner-cut"
              corner="tl-br"
              cornerSize={10}
              color="cyan"
              label="room_id"
              placeholder="Enter room_id"
              glowIntensity="strong"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />

            <CornerCutButton
              color="cyan"
              showArrow
              hoverEffect="glow"
              type="submit"
            >
              Enter Room
            </CornerCutButton>
          </form>

        </div>
      </div>
  )
}

export default RoomEntryForm
