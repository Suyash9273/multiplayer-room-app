"use client"

import { useState } from "react"
import { useSession, signIn, signOut, authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { join } from "@/lib/socketActions"

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

  const handleGoogleLogin = async () => {
    await signIn.social({ provider: "google", callbackURL: "/" })
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
    // We pass their CUSTOM username and the db userId to the WebSockets!
    if (user?.username) {
      join({
        username: user.username,
        userId: user.id
      }) 
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
          <CardContent className="flex justify-center">
            <Button className="w-full" onClick={handleGoogleLogin}>
              Sign in with Google
            </Button>
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
          <Button variant="ghost" className="w-full" onClick={() => signOut()}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}