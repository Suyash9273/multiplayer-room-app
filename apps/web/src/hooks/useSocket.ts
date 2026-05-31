"use client"
//Custom hook: A custom hook is just a regular function that uses React hook, and starts with "use"
//Here: -> it uses react hook: -> useContext, its name starts with use
import { useContext } from "react"
import { SocketContext } from "@/context/SocketContext"

export function useSocket() {
    const context = useContext(SocketContext)
    if(!context) {
        throw new Error("useSocket must be used inside a SocketProvider")
    }

    return context
}