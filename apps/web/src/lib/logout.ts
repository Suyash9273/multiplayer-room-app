import { signOut } from "./auth-client"
import { socket } from "./socket"
import { useSessionStore } from "@/store/sessionStore"

// A plain `signOut()` call only clears the Better Auth session cookie —
// it leaves the socket connected under the OLD identity and leaves
// sessionStore's isJoined/username/etc stale-true, which is exactly the
// kind of state desync the rest of this app has been fixing all along.
// This is the one correct way to log out; both LoginScreen and
// ProfileScreen should call this rather than `signOut()` directly.
export async function logout() {
    try {
        await signOut()
    } catch (error) {
        console.error("Failed to sign out:", error)
    }

    // Disconnect BEFORE resetting the store. socket.ts's own "disconnect"
    // handler has a grace period meant for transient network blips — that
    // delay is wrong for a deliberate logout, so we reset the store
    // ourselves, immediately, rather than waiting on it.
    socket.disconnect()
    useSessionStore.getState().reset()
}
