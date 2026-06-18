"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { socket } from "@/lib/socket"
import type { ChatMessage } from "@multiplayer/shared"
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
    setMessagesFromHistory: (messages: ChatMessage[]) => void;
}

interface DBMessage {
    id: string
    roomId: string
    message: string
    sender: string
    type?: "USER" | "SYSTEM"
    createdAt: string
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
        console.log("ENTER ROOM CALLED:", roomId)

        // Clear previous room state
        setMessages([])

        // Connect to live stream
        socket.emit("enterRoom", roomId)

        setCurrentRoom(roomId)
    }

    function leaveRoom(roomId: string) {
        socket.emit("leaveRoom", roomId)
        setCurrentRoom("")
        setTypingUsers([])
        setMessages([])
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

    // Used ONLY for loading older paginated messages
    const prependMessages = (historicalMessages: ChatMessage[]) => {
        setMessages((prev) => [...historicalMessages, ...prev]);
    };

    const setMessagesFromHistory = (messages: ChatMessage[]) => {
        setMessages(messages);
    };

    useEffect(() => {
        socket.on("onlineUsers", (users) => {
            setOnlineUsers(users)
        })

        socket.on("roomUsers", (users) => {
            setRoomUsers(users)
        })

        // socket.on("receiveMessage", (payload: ChatMessage) => {
        //     console.log(payload)
        //     setMessages((prev) => [...prev, payload])
        // })

        socket.on("receiveMessage", (payload: ChatMessage) => {
            console.log("RECEIVED SOCKET MESSAGE:", payload)

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
                emitStopTyping,
                setMessagesFromHistory
            }}>
            {children}
        </SocketContext.Provider>
    )
}