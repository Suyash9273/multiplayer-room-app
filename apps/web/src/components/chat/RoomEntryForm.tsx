"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BACKEND_URL } from "@/lib/socket"
import { apiFetch } from "@/lib/apiFetch"

// Joining a room by typing its id only makes sense for a room you're
// ALREADY a member of, or an ANONYMOUS room someone shared the id of with
// you — typing an arbitrary string was navigating straight to /room/{id}
// with no validation at all. Both `enterRoom` (socket) and the history
// fetch (REST) correctly refuse a room you're not a member of, but they do
// it SILENTLY — you'd just land in a dead, empty room with no explanation
// and a console error. This now calls the same join-by-id endpoint
// AnonymousRoomStarter/matchmaking use, and only navigates on success.
const RoomEntryForm = () => {
  const [roomId, setRoomId] = useState<string>("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed || isJoining) return;

    setIsJoining(true);
    setError("");

    try {
      const res = await apiFetch(`${BACKEND_URL}/api/rooms/anonymous/${trimmed}/join`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        setError(
          res.status === 404
            ? "Room not found. Check the ID and try again."
            : "Couldn't join that room. Try again."
        );
        return;
      }

      router.push(`/room/${trimmed}`);
    } catch (err) {
      console.error("Failed to join room by id:", err);
      setError("Couldn't reach the server. Try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleJoinRoom}>
      <div className="flex gap-2">
        <Input
          placeholder="Enter a room id..."
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isJoining}
        />
        <Button type="submit" disabled={isJoining}>
          {isJoining ? "Joining..." : "Join"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </form>
  )
}

export default RoomEntryForm
