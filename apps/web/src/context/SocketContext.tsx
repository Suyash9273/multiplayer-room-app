"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {socket} from "@/lib/socket"
import type { ChatMessage } from "@multiplayer/shared"
export type SocketContextType = {
    onlineUsers: string[];
    roomUsers: string[];
    messages: ChatMessage[];
    username: string;
    currentRoom: string;
    isJoined: boolean;
    join: (username: string) => void;
    enterRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
    sendMessage: (message: string) => void;
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
    const [messages, setMessages] = useState<ChatMessage[]>([])

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

    function sendMessage(message: string) {
        const payload: ChatMessage = {
            roomId:currentRoom,
            message,
            sender: username,
            timestamp: Date.now()
        }

        setMessages((prevMessages) => [...prevMessages, payload])
        socket.emit("sendMessage", payload)
    }

    useEffect(() => {
        socket.on("onlineUsers", (users) => {
            setOnlineUsers(users)
        })

        socket.on("roomUsers", (users) => {
            setRoomUsers(users)
        })

        socket.on("receiveMessage", (payload: ChatMessage) => {
            setMessages((prev) => [...prev, payload])
        })

        return () => {
            socket.off("onlineUsers")
            socket.off("roomUsers")
            socket.off("receiveMessage")
        }
    }, [])

    return (
        <SocketContext.Provider
        value={{
            onlineUsers,
            roomUsers,
            username,
            messages,
            isJoined,
            currentRoom,
            join,
            enterRoom,
            leaveRoom,
            sendMessage
        }}>
            {children}
        </SocketContext.Provider>
    )
}