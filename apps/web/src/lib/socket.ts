import { io } from "socket.io-client"
import { useSessionStore } from "@/store/sessionStore"

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

//1. Initializing the connection:->
export const socket = io(BACKEND_URL, {
    withCredentials: true,
    autoConnect: false
})

// How long to wait after a disconnect before treating the user as
// genuinely "not joined". Socket.IO's client auto-reconnects on its own
// (exponential backoff) after a dropped connection — most blips resolve
// within a second or two. Without this grace period, every momentary
// hiccup would immediately flip `isJoined` false and bounce the user
// through the login/lobby route guards, even though the connection was
// about to silently heal itself.
const DISCONNECT_GRACE_MS = 3000
let disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null

function clearDisconnectGrace() {
    if (disconnectGraceTimer) {
        clearTimeout(disconnectGraceTimer)
        disconnectGraceTimer = null
    }
}

// 2. Global Connect Listener — runs on EVERY connect, not just the first.
//
// This used to live inside socketActions.ts's join() as a ONE-TIME
// `.once("connect", ...)` handler. That meant the join handshake
// (server registering socket.id -> identity in its in-memory presence
// maps) only ever ran once per page load. If the socket ever dropped and
// Socket.IO auto-reconnected (server restart, network blip, laptop sleep)
// — which issues a BRAND NEW socket.id — nothing re-ran the handshake for
// it. The client's local `isJoined` state stayed stale-true from before
// the drop, so the UI never noticed, but the server had no presence entry
// for the new socket.id. That's what caused a previously-connected user
// to silently vanish from a room's "active" list while a freshly-connected
// guest worked fine.
//
// Making this persistent (not `.once`) means every reconnect — automatic
// or manual — re-confirms identity and re-registers presence.
socket.on("connect", () => {
    // A successful (re)connect means whatever disconnect triggered the
    // grace timer has already resolved — cancel it so we don't flip
    // isJoined false a few seconds from now for no reason.
    clearDisconnectGrace()

    console.log(`User connected with socket-id:${socket.id}`)
    socket.emit(
        "join",
        (identity: { id: string; displayName: string; type: "user" | "guest" }) => {
            useSessionStore.getState().setUserId(identity.id)
            useSessionStore.getState().setUsername(identity.displayName)
            useSessionStore.getState().setIdentityType(identity.type)
            useSessionStore.getState().setIsJoined(true)
            useSessionStore.getState().setJoinError(null)
        }
    )
})

// 3. Global connect_error listener — surfaces WHY a connection attempt
// failed (e.g. the auth middleware rejecting a missing/expired cookie)
// instead of leaving the UI stuck on a silent spinner forever.
socket.on("connect_error", (err) => {
    console.error("[socket] connect_error:", err.message)
    useSessionStore.getState().setJoinError(err.message || "Failed to connect")
})

// 4. Global disconnect listener — grace period before treating this as
// "actually not joined". If a reconnect (and re-join) succeeds within
// DISCONNECT_GRACE_MS, the "connect" handler above cancels this timer and
// the user never sees so much as a flicker. Only a disconnect that's
// still unresolved after the grace period actually flips isJoined false
// and lets the route guards react to it.
socket.on("disconnect", (reason) => {
    console.log(`User disconnected due to : ${reason}`)

    clearDisconnectGrace()
    disconnectGraceTimer = setTimeout(() => {
        useSessionStore.getState().setIsJoined(false)
        disconnectGraceTimer = null
    }, DISCONNECT_GRACE_MS)
})
