"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {socket} from "@/lib/socket"

export type SocketContextType = {
    onlineUsers: string[];
    roomUsers: string[];
    username: string;
    currentRoom: string;
    isJoined: boolean;
    join: (username: string) => void;
    enterRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [onlineUsers, setOnlineUsers] = useState<string[]>([])
    const [roomUsers, setRoomUsers] = useState<string[]>([])
    const [username, setUsername] = useState<string>("")
    const [isJoined, setIsJoined] = useState<boolean>(false)
    const [currentRoom, setCurrentRoom] = useState<string>("")

    function join(username: string) {
        socket.emit("join", username)
        setUsername(username)
        setIsJoined(true)
    }

    function enterRoom(roomId: string) {
        socket.emit("enterRoom", roomId)
        setCurrentRoom(roomId)
    }

    function leaveRoom(roomId: string) {
        socket.emit("leaveRoom", roomId)
        setCurrentRoom("")
    }

    useEffect(() => {
        socket.on("onlineUsers", (users) => {
            setOnlineUsers(users)
        })
        socket.on("roomUsers", (users) => {
            setRoomUsers(users)
        })

        return () => {
            socket.off("onlineUsers")
            socket.off("roomUsers")
        }
    }, [])

    return (
        <SocketContext.Provider
        value={{
            onlineUsers,
            roomUsers,
            username,
            isJoined,
            currentRoom,
            join,
            enterRoom,
            leaveRoom
        }}>
            {children}
        </SocketContext.Provider>
    )
}