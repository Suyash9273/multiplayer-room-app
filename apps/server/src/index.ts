import "./env.js"; // MUST be the first import — loads env vars before anything else reads them

import http from "http";
import app from "./app.js";
import { initializeSocket } from "./socket/index.js";
import { cleanupExpiredGuests } from "./lib/cleanupExpiredGuests.js";

// Catch any unhandled crash BEFORE it silently kills the process
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

console.log(`Starting server, PORT env = ${process.env.PORT}, using port ${PORT}`);

// 1. Create a raw HTTP server using the Express app
const httpServer = http.createServer(app);

// 2. Attach the socket to http server
const io = initializeSocket(httpServer);

// 3. Attach the `io` instance to Express's global app state
app.set("io", io);

// 4. Periodic cleanup of expired guest identities
cleanupExpiredGuests();
setInterval(cleanupExpiredGuests, 60 * 60 * 1000);

// 5. Start the HTTP server — bind to 0.0.0.0 explicitly (required by Render)
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 HTTP Server and Socket.IO are listening on port: ${PORT}`);
});