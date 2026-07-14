import http from "http";
import app from "./app.js";
import { initializeSocket } from "./socket/index.js";
import { cleanupExpiredGuests } from "./lib/cleanupExpiredGuests.js";

const PORT = 5000;

// 1. Create a raw HTTP server using the Express app
const httpServer = http.createServer(app);

// 2. Attach the socket to http server
const io = initializeSocket(httpServer);

//3. Attach the `io` instance to Express's global app state
app.set("io", io)

// 4. Periodic cleanup of expired guest identities (see cleanupExpiredGuests.ts
// for why this needs to exist at all — expiresAt was only ever checked,
// never acted on). Runs once at startup, then hourly.
cleanupExpiredGuests();
setInterval(cleanupExpiredGuests, 60 * 60 * 1000);

// 5. Start the HTTP server
httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP Server and Socket.IO are listening on port: ${PORT}`);
});