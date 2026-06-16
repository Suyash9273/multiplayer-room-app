import http from "http"
import { initializeSocket } from "./socket/index.js"
import {prisma, User} from "@multiplayer/db"
import express, { raw } from "express"
import cors from "cors"
import { Request, Response, NextFunction } from "express";
import cookie from "cookie";

const PORT = 5000

const app = express()
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true, // Crucial: Allows the Better Auth cookie to pass through
}));
app.use(express.json())

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// REST BOUNCER
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rawCookies = req.headers.cookie
        if(!rawCookies) {
            return res.status(401).json({ error: "Unauthorized: No cookies" });
        }
        const parsedCookies = cookie.parse(rawCookies)
        const fullCookieValue = parsedCookies["better-auth.session_token"]

        if (!fullCookieValue) {
            return res.status(401).json({ error: "Unauthorized: Token missing" });
        }

        // Split the cryptographic signature
        const sessionToken = fullCookieValue.split(".")[0];

        const session = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { user: true }
        });

        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: "Unauthorized: Invalid session" });
        }

        // Attach the securely verified user to the HTTP request
        req.user = session.user;
        next();
    } catch (error) {
        console.error("REST Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// REST API Route for fetching chat history(cursor pagination)
app.get("/api/rooms/:roomId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
        const roomId = req.params.roomId as string
        
        //Cursors are passed as query parameters (e.g., ?cursor=xyz123)
        const cursor = req.query.cursor as string | undefined

        //1. Ask Postgres for the 10 newest messages BEFORE the cursor
        const messages = await prisma.message.findMany({
            where: {roomId},
            take: 10,
            skip: cursor? 1 : 0, //If we have a cursor, skip the cursor row itself
            cursor: cursor? {id: cursor} : undefined,//don't think this is the schema field, this specefic cursor field is a prisma feature only
            orderBy: {
                createdAt: "desc"
            }
        })

        //2. Determine if there are more messages left
        const nextCursor = messages.length === 10 ? messages[messages.length-1].id: null

        //3. Reverse to chronological order for the React UI
        const chronologicallyOrdered = messages.reverse()

        //4. Send the payload
        return res.json({
            messages: chronologicallyOrdered,
            nextCursor
        })
    } catch (error) {
        console.error("Failed to fetch paginated messages:", error)
        return res.status(500).json({error: "Internal Server Error"})
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