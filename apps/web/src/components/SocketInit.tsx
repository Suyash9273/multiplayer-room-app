"use client"

import { useEffect } from "react"
import { registerSocketListeners } from "@/lib/socketListeners"

export function SocketInit() {
  useEffect(() => {
    const cleanup = registerSocketListeners()
    return cleanup /** it's like return () => {} cause similarly cleanup is just a fn reference */
  }, [])

  return null
}