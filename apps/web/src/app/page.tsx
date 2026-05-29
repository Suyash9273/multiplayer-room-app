"use client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";

export default function Home() {
  const [username, setUsername] = useState<string>("")
  const [isJoined, setIsJoined] = useState<boolean>(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>()
  
  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault() //harmless even if not needed, good practice
    socket.emit("join", username)
    setIsJoined(true)
  }

  useEffect(() => {
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users)
    })

    return () => {
      socket.off("onlineUsers")
    }
  }, [])

  
  if(isJoined) {
    return (
      <ul>
        {
          onlineUsers?.map((user) => (
            <li key={user}>{user} is online.</li>
          ))
        }
      </ul>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your username below
        </CardDescription>
        <CardAction>
          <Button variant="link">Sign Up</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Jin@example"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="button" className="w-full" onClick={handleJoin}>
          Join
        </Button>
      </CardFooter>
    </Card>
    </div>
  )
}
