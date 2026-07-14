"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { registerSocketListeners } from "@/lib/socketListeners"
import { join } from "@/lib/socketActions"
import { useSessionStore } from "@/store/sessionStore"
import { socket } from "@/lib/socket"

type ExtendedUser = { id: string; username?: string | null }

export function SocketInit() {
  const { data: session, isPending } = useSession()
  const hasAttempted = useRef(false)

  useEffect(() => {
    const cleanup = registerSocketListeners()
    return cleanup
  }, [])

  useEffect(() => {
    if (isPending) return // Better Auth hasn't resolved the session yet — wait

    const user = session?.user as ExtendedUser | undefined
    const isJoined = useSessionStore.getState().isJoined

    if (user?.username && !isJoined && !hasAttempted.current) {
      hasAttempted.current = true
      join()
    }

    // Only tear down if we WERE a real authenticated user and the Better
    // Auth session has genuinely disappeared (signed out elsewhere,
    // expired). Guests never have a Better Auth session at all — `!user`
    // is completely normal and expected for them, not a signal anything
    // went wrong. Without the identityType check, this fired for every
    // guest on any session revalidation (e.g. tab refocus), wiping their
    // identity and bouncing them to the sign-in screen for no reason.
    const identityType = useSessionStore.getState().identityType
    if (!user && identityType === "user" && isJoined) {
      socket.disconnect()
      useSessionStore.getState().reset()
      hasAttempted.current = false
    }
  }, [session, isPending])

  return null
}