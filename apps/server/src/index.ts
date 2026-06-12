import http from "http"
import { initializeSocket } from "./socket/index.js"
import {prisma} from "@multiplayer/db"
import express from "express"
import cors from "cors"

const PORT = 5000

const app = express()
app.use(cors())
app.use(express.json())

// REST API Route for fetching chat history
app.get("/api/rooms/:roomId/messages", async (req, res) => {
    const {roomId} = req.params
    try {
        const messages = await prisma.message.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                createdAt: "asc"
            },
            take: 50, // Only fetch last 50 messages to save the bandwidth
        })

        res.status(200).json(messages)
    } catch (error) {
        console.error("Failed to fetch messages:", error)
        res.status(500).json({error: "Internal Server Error"})
    }
})

//1. Create a raw HTTP server
const httpServer = http.createServer(app)

// 2. Attach the socket to http server by passing the live server object
initializeSocket(httpServer)

//3. Start the HTTP server: 
httpServer.listen(PORT, () => {
    console.log(`HTTP Server and Socket.IO are listening on port: ${PORT}`)
})