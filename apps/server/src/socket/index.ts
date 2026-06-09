import {Server} from "socket.io"
import type {Server as HttpServer} from "http"
import { addUser, removeUser, getOnlineUsers, joinRoom, leaveRoom, getUsersInRoom, socketToUser } from "./presence.js"
import type { ChatMessage } from "@multiplayer/shared"

export const initializeSocket = (httpServer: HttpServer) => {
    //1. Attach socket.io to the provided http server:
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    })

    //2. Define the socket logic
    io.on("connection", (socket) => {
        console.log(`The user connected with id: ${socket.id}`)

        socket.on("join", (username: string) => {
            console.log(`Before addUser: ${getOnlineUsers()}`)
            addUser(username, socket.id)
            console.log(`After addUser: ${getOnlineUsers()}`)
            io.emit("onlineUsers", getOnlineUsers())
        })

        //entering a room
        socket.on("enterRoom", (roomId: string) => {
            //1. Network action
            socket.join(roomId)

            //2. Memory action
            joinRoom(roomId, socket.id)

            //3. Scoped broadcasting
            io.to(roomId).emit("roomUsers", getUsersInRoom(roomId))
        })

        //leaving a room
        socket.on("leaveRoom", (roomId: string) => {
            //1. Memory action
            leaveRoom(roomId, socket.id)

            //2. Network action
            socket.leave(roomId)

            //3. Scoped broadcasting
            socket.to(roomId).emit("roomUsers", getUsersInRoom(roomId))
        })

        //sending message
        socket.on("sendMessage", (payload: ChatMessage) => {
            //routing the payload to everyone in the room except sender
            socket.to(payload.roomId).emit("receiveMessage", payload)
        })

        //listening for typing events:->
        socket.on("typing", (roomId: string) => {
            // 1. Look up the username using socket.id
            const username = socketToUser.get(socket.id)
            // 2. Broadcasting the typing event to the room
            socket.to(roomId).emit("userTyping", username)
        })
        socket.on("stopTyping", (roomId: string) => {
            // 1. Look up the username using socket.id
            const username = socketToUser.get(socket.id)
            // 2. Broadcasting the typing event to the room
            socket.to(roomId).emit("userStoppedTyping", username)
        })
        

        //to fix the potential memory leak if user abruptly closes browser window
        socket.on("disconnecting", () => {
            socket.rooms.forEach((room) => {
                if(room !== socket.id) {
                    leaveRoom(room, socket.id)
                }
            })
        })

        socket.on("disconnect", () => {
            console.log(`The user disconnected with id: ${socket.id}`)
            removeUser(socket.id);
            console.log(`After remove user: ${getOnlineUsers()}`)
            socket.broadcast.emit("onlineUsers", getOnlineUsers())
        })
        //We would add more event listeners here in the future
    })
    
    // Returning 'io' is a good practice in case the main file needs it later
    return io
}