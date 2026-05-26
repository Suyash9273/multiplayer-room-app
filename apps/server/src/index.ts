import http from "http"
import { initializeSocket } from "./socket/index.js"

const PORT = 5000

//1. Create a raw HTTP server
const httpServer = http.createServer((req, res) => {
    //You can handle standard HTTP routes here
    if(req.method === 'GET' && req.url === '/') {
        res.writeHead(200, {"Content-Type": "text/plain"})
        res.end("Raw HTTP server is running!")
    }
})

// 2. Attach the socket to http server by passing the live server object
initializeSocket(httpServer)

//3. Start the HTTP server: 
httpServer.listen(PORT, () => {
    console.log(`HTTP Server and Socket.IO are listening on port: ${PORT}`)
})