import {io} from "socket.io-client"
const BACKEND_URL = "http://localhost:5000"

//1. Initializing the connection:->
export const socket = io(BACKEND_URL)

//2. Global Connect Listener:->
socket.on("connect", () => {
    console.log(`User connected with socket-id:${socket.id}`)
})

//3. Global disconnect listener :->
socket.on("disconnect", (reason) => {
    console.log(`User disconnected due to : ${reason}`)
})

