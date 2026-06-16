"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { socket } from "@/lib/socket"
import type { ChatMessage } from "@multiplayer/shared"
import { timeStamp } from "console"
export type SocketContextType = {
    onlineUsers: string[];
    roomUsers: string[];
    messages: ChatMessage[];
    username: string;
    currentRoom: string;
    typingUsers: string[];
    isJoined: boolean;
    join: (username: string) => void;
    enterRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
    prependMessages: (historicalMessages: ChatMessage[]) => void;
    sendMessage: (message: string) => void;
    emitTyping: () => void;
    emitStopTyping: () => void;
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
    const [typingUsers, setTypingUsers] = useState<string[]>([])

    function join(username: string) {
        socket.connect()

        socket.once("connect", () => {
            console.log("Socket connected:", socket.id)

            socket.emit("join")

            setUsername(username)
            setIsJoined(true)
        })
    }

    function enterRoom(roomId: string) {
        //1. fetch the room history
        fetchRoomHistory(roomId)

        //2. Connect to live stream via sockets
        socket.emit("enterRoom", roomId)
        setCurrentRoom(roomId)
    }

    function leaveRoom(roomId: string) {
        socket.emit("leaveRoom", roomId)
        setCurrentRoom("")
        setTypingUsers([])
    }

    async function fetchRoomHistory(roomId: string) {
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/messages`);
            if (!response.ok) {
                throw new Error("Failed to fetch room history")
            }
            //1. Get the raw history(different format than our ChatMessage)
            const rawHistory = await response.json()

            //2. The Adapter: Mold the DB rows into Frontend State
            const formattedHistory: ChatMessage[] = rawHistory.map((dbMsg: any) => ({
                id: dbMsg.id,
                roomId: dbMsg.roomId,
                message: dbMsg.message,
                sender: dbMsg.sender,
                //Convert the posgres std ISO string back to a std JS number
                timeStamp: new Date(dbMsg.createdAt).getTime(),
                //It is coming from db, so it is gauranteed to be sent
                status: "sent",
                type: dbMsg.type
            }))

            //3. Hand the perfectly formatted data to react
            setMessages(formattedHistory)
        } catch (error) {
            console.log(`Error loading chat history: `, error)
        }
    }

    function sendMessage(message: string) {
        const payload: ChatMessage = {
            id: crypto.randomUUID(),
            roomId: currentRoom,
            message,
            sender: username,
            timestamp: Date.now(),
            status: "pending"
        }
        setMessages((prev) => [...prev, payload])

        socket.emit("sendMessage", payload, (receipt: { status: string, id: string }) => {
            console.log("The server replied!!", receipt)
            setMessages((prevMessages) => {
                return prevMessages.map((message) => {
                    if (message.id === receipt.id) {
                        return { ...message, status: "sent" }
                    }
                    return message
                })
            })
        })
    }

    function emitTyping() {
        socket.emit("typing", currentRoom)
    }

    function emitStopTyping() {
        socket.emit("stopTyping", currentRoom)
    }

    const prependMessages = (historicalMessages: ChatMessage[]) => {
        setMessages((prev) => [...historicalMessages, ...prev]);
    };

    useEffect(() => {
        socket.on("onlineUsers", (users) => {
            setOnlineUsers(users)
        })

        socket.on("roomUsers", (users) => {
            setRoomUsers(users)
        })

        socket.on("receiveMessage", (payload: ChatMessage) => {
            console.log(payload)
            setMessages((prev) => [...prev, payload])
        })

        socket.on("userTyping", (username: string) => {
            setTypingUsers((prev) => {
                if (prev.includes(username)) return prev
                return [...prev, username]
            })
        })

        socket.on("userStoppedTyping", (username: string) => {
            setTypingUsers((prev) => {
                //Remove the username from typingUsers array
                return prev.filter((user) => user !== username)
            })
        })

        return () => {
            socket.off("onlineUsers")
            socket.off("roomUsers")
            socket.off("receiveMessage")
            socket.off("userTyping")
            socket.off("userStoppedTyping")
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
                typingUsers,
                join,
                enterRoom,
                leaveRoom,
                sendMessage,
                prependMessages,
                emitTyping,
                emitStopTyping
            }}>
            {children}
        </SocketContext.Provider>
    )
}