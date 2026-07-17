"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { join } from "@/lib/socketActions"
import { mintGuestIdentity } from "@/lib/guest"
import { logout } from "@/lib/logout"
import { syncBearerToken } from "@/lib/authToken"

type ExtendedUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
};

export default function LoginScreen() {
  const { data: session, isPending } = useSession()

  // FIX 2: Use our clean interface instead of the complex typeof logic
  const user = session?.user as ExtendedUser | undefined;

  const [usernameInput, setUsernameInput] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [isMintingGuest, setIsMintingGuest] = useState(false)
  const [guestError, setGuestError] = useState("")

  // The Better Auth session cookie is scoped to this (Vercel) domain and
  // can never reach the Railway server, so we separately fetch the raw
  // session token via our own same-origin route and store it — that's what
  // socket.ts and apiFetch.ts send to the backend instead of relying on
  // the cookie crossing domains. Runs as soon as we know who the user is,
  // which covers both the fresh mount right after the OAuth redirect back
  // from Google, and any later remount with an existing session.
  useEffect(() => {
    if (user?.id) {
      syncBearerToken()
    }
  }, [user?.id])

  const handleGoogleLogin = async () => {
    await signIn.social({ provider: "google", callbackURL: "/" })
  }

  // The anonymous-chat entry point. Mints (or recovers, if the browser
  // already holds a valid guest cookie) a guest identity via the backend,
  // then joins the socket layer exactly like an authenticated user does —
  // `join()` doesn't care which kind of identity resolved server-side, it
  // just trusts whatever the ack tells it.
  const handleContinueAsGuest = async () => {
    setIsMintingGuest(true)
    setGuestError("")
    try {
      await mintGuestIdentity()
      join()
    } catch (err) {
      console.error(err)
      setGuestError("Couldn't start an anonymous session. Try again.")
    } finally {
      setIsMintingGuest(false)
    }
  }

  const handleClaimUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameInput.trim()) return
    
    setIsUpdating(true)
    setErrorMsg("")

    // FIX 2: The Mutation Escape Hatch
    // We cast the payload to `any` to force it past the strict frontend SDK
    const payload = {
      username: usernameInput.trim()
    } as any;

    const { error } = await authClient.updateUser(payload)

    setIsUpdating(false)

    if (error) {
      setErrorMsg(error.message || "Failed to claim username. It might be taken.")
    }
  }

  const handleEnterLobby = () => {
    // join() no longer takes params — the server resolves and confirms
    // the identity from the session cookie itself and hands it back
    // through the ack, so the client never has to assert its own name.
    if (user?.username) {
      join()
    }
  }

  // STATE 1: Loading
  if (isPending) return <div className="flex h-screen items-center justify-center"><span className="animate-pulse">Verifying identity...</span></div>

  // STATE 2: Unauthenticated
  if (!user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">ChitChat</CardTitle>
            <CardDescription>Secure multiplayer communication</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full" onClick={handleGoogleLogin}>
              Sign in with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={handleContinueAsGuest}
              disabled={isMintingGuest}
            >
              {isMintingGuest ? "Starting..." : "Chat Anonymously"}
            </Button>
            {guestError && <p className="text-xs text-red-500 font-medium text-center">{guestError}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  // STATE 3A: Gatekeeper (Authenticated, but NO username)
  if (!user.username) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Almost there!</CardTitle>
            <CardDescription>Pick a unique gamer tag for the chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaimUsername} className="flex flex-col gap-3">
              <Input
                placeholder="e.g. Blade"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled={isUpdating}
                maxLength={20}
              />
              {errorMsg && <p className="text-xs text-red-500 font-medium text-center">{errorMsg}</p>}
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Claiming..." : "Claim Tag"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // STATE 3B: Ready (Authenticated AND has username)
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-background">
      <Card className="w-[350px]">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back,</CardTitle>
          <CardDescription className="text-2xl text-primary font-bold mt-2">
            {user.username}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" size="lg" onClick={handleEnterLobby}>
            Enter Lobby
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => logout()}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}