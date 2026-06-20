"use client"

import LoginScreen from "@/components/chat/LoginScreen";
import LobbyScreen from "@/components/chat/LobbyScreen";
import RoomScreen from "@/components/chat/RoomScreen";

import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

export default function Home() {
  const router = useRouter()
  const {isJoined, currentRoom} = useSocket()

  if(!isJoined) {
    return <LoginScreen/>
  }
  else if(isJoined && !currentRoom) {
    return <LobbyScreen />
  }
  else if(isJoined && currentRoom) {
    return <RoomScreen />
  }
  return (
    <div></div>
  )
}
