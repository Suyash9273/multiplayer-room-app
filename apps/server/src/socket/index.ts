import {Server} from "socket.io"
import type {Server as HttpServer} from "http"
import { addUser, removeUser, getOnlineUsers, leaveRoom } from "./presence.js"

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