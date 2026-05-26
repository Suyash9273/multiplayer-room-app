import {Server} from "socket.io"
import type {Server as HttpServer} from "http"

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

        socket.on("disconnect", () => {
            console.log(`The user disconnected with id: ${socket.id}`)
        })
        //We would add more event listeners here in the future
    })
    
    // Returning 'io' is a good practice in case the main file needs it later
    return io
}