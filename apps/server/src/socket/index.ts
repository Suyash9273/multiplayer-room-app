import { Server } from "socket.io"
import cookie from "cookie"
import { prisma } from "@multiplayer/db"
import type { Server as HttpServer } from "http"
import { addUser, removeUser, getOnlineUsers, joinRoom, leaveRoom, getUsersInRoom, socketToUser } from "./presence.js"
import type { ChatMessage } from "@multiplayer/shared"

export const initializeSocket = (httpServer: HttpServer) => {
    //1. Attach socket.io to the provided http server:
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    }) // io initialization

    //socket middleware
    io.use(async (socket, next) => {
        try {
            //1. extracting raw cookies string from handshake headers
            console.log("\n--- 🛡️ BOUNCER INTERCEPT ---");

            const rawCookies = socket.request.headers.cookie
            console.log("Raw Cookies received:", rawCookies ? "Yes" : "NO");

            if (!rawCookies) {
                return next(new Error("Authentication error: No cookies provided."));
            }
            //2. Parse the cookies:
            const parsedCookies = cookie.parse(rawCookies)
            const rawSessionToken = parsedCookies["better-auth.session_token"]

            if (!rawSessionToken) {
                return next(new Error("Authentication error: Session token missing."))
            }

            const sessionToken = rawSessionToken.split(".")[0]

            console.log("Session-Token: ", sessionToken)

            //3. Verify the token directly against the shared Postgres DB
            const session = await prisma.session.findUnique({
                where: { token: sessionToken },
                include: { user: true }
            })

            // 4. Validate session existence and expiration
            if (!session || session.expiresAt < new Date()) {
                return next(new Error("Authentication Error: Session invalid or expired"))
            }

            //5. attach the securely verified Postgres user directly to the socket connection
            socket.data.user = session.user
            console.log("Hello-4----")
            //Let them in
            next()
        } catch (error) {
            console.error("Socket Middleware Error:", error);
            next(new Error("Internal Server Error during authentication"));
        }
    })

    //2. Define the socket logic
    io.on("connection", (socket) => {
        console.log(`The user connected with id: ${socket.id}`)

        // We extract the verified identity that the Bouncer attached
        const verifiedUser = socket.data.user;
        const username = verifiedUser.username;

        if (!username) {
            // Edge case: They authenticated, but somehow bypassed the Gatekeeper UI
            console.log(`User ${verifiedUser.email} has no username. Booting them.`);
            socket.disconnect();
            return;
        }

        console.log(`🟢 Verified connection: ${username} (${socket.id})`);

        socket.on("join", () => {
            console.log(`Before addUser: ${getOnlineUsers()}`)
            addUser(username, socket.id)
            console.log(`After addUser: ${getOnlineUsers()}`)
            io.emit("onlineUsers", getOnlineUsers())
        })

        //entering a room
        socket.on("enterRoom", async (roomId: string) => {
            //1. Network action
            socket.join(roomId)

            //2. Memory action
            joinRoom(roomId, socket.id)

            //3. 
            const username = socketToUser.get(socket.id)
            if (username) {
                try {
                    const sysMsg = await prisma.message.create({
                        data: {
                            roomId,
                            message: `${username} joined the room.`,
                            sender: "System",
                            type: "SYSTEM"
                        }
                    })

                    const formattedSysMsg: ChatMessage = {
                        id: sysMsg.id,
                        roomId: sysMsg.roomId,
                        message: sysMsg.message,
                        sender: sysMsg.sender,
                        timestamp: sysMsg.createdAt.getTime(),
                        status: "sent",
                        type: "SYSTEM"
                    }

                    socket.to(roomId).emit("receiveMessage", formattedSysMsg)

                } catch (error) {
                    console.error(error)
                }
            }

            //4. Scoped broadcasting
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
        socket.on("sendMessage", async (payload: ChatMessage, callback) => {

            //(1. Persist First)
            try {
                // We explicitly use payload.id so the database UUID perfectly matches 
                // the ID the frontend generated for the acknowledgement receipt!
                await prisma.message.create({
                    data: {
                        id: payload.id,
                        roomId: payload.roomId,
                        message: payload.message,
                        sender: payload.sender
                    }
                })

                //(2. Broadcast is the second part) routing the payload to everyone in the room except sender
                socket.to(payload.roomId).emit("receiveMessage", payload)

                //(3. Acknowledgement) Firing the acknowledgement callback back to the sender
                if (callback) {
                    callback({ status: "sent", id: payload.id })
                }
            } catch (error) {
                console.log("Failed to save the message to the database", error)
            }
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
        socket.on("disconnecting", async () => {
            const username = socketToUser.get(socket.id)

            for (const room of socket.rooms) {
                if (room === socket.id) continue

                if (username) {
                    try {
                        const sysMsg = await prisma.message.create({
                            data: {
                                roomId: room,
                                message: `${username} left the room.`,
                                sender: "System",
                                type: "SYSTEM"
                            }
                        })

                        const formattedSysMsg: ChatMessage = {
                            id: sysMsg.id,
                            roomId: sysMsg.roomId,
                            message: sysMsg.message,
                            sender: sysMsg.sender,
                            timestamp: sysMsg.createdAt.getTime(),
                            status: "sent",
                            type: "SYSTEM"
                        }

                        socket.to(room).emit(
                            "receiveMessage",
                            formattedSysMsg
                        )

                    } catch (error) {
                        console.error(error)
                    }
                }

                leaveRoom(room, socket.id)
            }
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