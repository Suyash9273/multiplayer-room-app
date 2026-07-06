import { BACKEND_URL } from "@/lib/socket"
import type { GuestMintResponse } from "@multiplayer/shared"

// Calls POST /api/guest. The server sets the httpOnly guest cookie itself —
// this function never sees or handles the secret token, only the public
// { id, displayName } the server hands back for the UI to render.
// Safe to call repeatedly: if the browser already holds a valid guest (or
// user) cookie, the server just returns that existing identity.
export async function mintGuestIdentity(): Promise<GuestMintResponse> {
    const res = await fetch(`${BACKEND_URL}/api/guest`, {
        method: "POST",
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Failed to mint guest identity: ${res.status}`)
    }

    return res.json()
}
