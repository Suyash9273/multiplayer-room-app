"use client"

import LoginScreen from "@/components/chat/LoginScreen";
import LobbyScreen from "@/components/chat/LobbyScreen";
import RoomScreen from "@/components/chat/RoomScreen";

import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore"

export default function Home() {
  const router = useRouter()
  
  const isJoined = useSessionStore((s) => s.isJoined)
  const currentRoom = useSessionStore((s) => s.currentRoom)

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
