import http from "http";
import app from "./app.js";
import { initializeSocket } from "./socket/index.js";

const PORT = 5000;

// 1. Create a raw HTTP server using the Express app
const httpServer = http.createServer(app);

// 2. Attach the socket to http server
const io = initializeSocket(httpServer);

//3. Attach the `io` instance to Express's global app state
app.set("io", io)

// 4. Start the HTTP server
httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP Server and Socket.IO are listening on port: ${PORT}`);
});