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
      join({ username: user.username, userId: user.id })
    }

    if (!user && isJoined) {
      // session expired/logged out elsewhere — tear down local state
      socket.disconnect()
      useSessionStore.getState().reset()
      hasAttempted.current = false
    }
  }, [session, isPending])

  return null
}