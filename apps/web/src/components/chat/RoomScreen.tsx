"use client"

import { useSocket } from "@/hooks/useSocket"

const RoomScreen = () => {
  const {currentRoom, roomUsers, leaveRoom} = useSocket()
  return (
    <div>
      <h1>You are in room: {currentRoom}</h1>
      <ul>
        {
          roomUsers.map((user) => {
            return (
              <li key={user}>{user}</li>
            )
          })
        }
      </ul>

      <button type="button" onClick={() => {leaveRoom(currentRoom)}}>Leave</button>
    </div>
  )
}

export default RoomScreen
