"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import { useSessionStore } from "@/store/sessionStore"
import { BACKEND_URL } from "@/lib/socket"

const MAX_INTERESTS = 10

// Deliberately basic — per the "focus isn't UI right now" direction, this
// uses only the shadcn primitives already in the project (no new visual
// design system), just enough to make interests genuinely editable.
export default function ProfileScreen() {
    const username = useSessionStore((s) => s.username)
    const identityType = useSessionStore((s) => s.identityType)

    const [interests, setInterests] = useState<string[]>([])
    const [newTag, setNewTag] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [statusMsg, setStatusMsg] = useState("")

    useEffect(() => {
        const loadInterests = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/profile/interests`, { credentials: "include" })
                if (res.ok) {
                    const data = await res.json()
                    setInterests(data.interests ?? [])
                }
            } catch (error) {
                console.error("Failed to load interests", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadInterests()
    }, [])

    const addTag = () => {
        const tag = newTag.trim()
        if (!tag) return
        if (interests.length >= MAX_INTERESTS) {
            setStatusMsg(`You can only have up to ${MAX_INTERESTS} interests.`)
            return
        }
        if (interests.some((t) => t.toLowerCase() === tag.toLowerCase())) {
            setNewTag("")
            return
        }
        setInterests([...interests, tag])
        setNewTag("")
    }

    const removeTag = (tag: string) => {
        setInterests(interests.filter((t) => t !== tag))
    }

    const handleSave = async () => {
        setIsSaving(true)
        setStatusMsg("")
        try {
            const res = await fetch(`${BACKEND_URL}/api/profile/interests`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ interests }),
            })
            if (!res.ok) throw new Error("Failed to save")
            const data = await res.json()
            // The server normalizes (trims/dedupes/caps) — reflect what it
            // actually stored, not just what we optimistically had locally.
            setInterests(data.interests)
            setStatusMsg("Saved.")
        } catch (error) {
            console.error(error)
            setStatusMsg("Failed to save. Try again.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="container mx-auto max-w-lg h-full py-10 space-y-6 px-4">
            <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                <Link href="/lobby">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Lobby
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>{username}</CardTitle>
                    <CardDescription className="capitalize">{identityType} account</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Interests</CardTitle>
                    <CardDescription>
                        Used to match you with strangers who share what you're into. Add or remove these anytime.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2 min-h-8">
                                {interests.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No interests added yet.</p>
                                ) : (
                                    interests.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                                aria-label={`Remove ${tag}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))
                                )}
                            </div>

                            <form
                                className="flex gap-2"
                                onSubmit={(e) => { e.preventDefault(); addTag(); }}
                            >
                                <Input
                                    placeholder="e.g. gaming, anime, coding..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    disabled={interests.length >= MAX_INTERESTS}
                                />
                                <Button type="submit" variant="outline" disabled={interests.length >= MAX_INTERESTS}>
                                    Add
                                </Button>
                            </form>

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs text-muted-foreground">{statusMsg}</p>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
