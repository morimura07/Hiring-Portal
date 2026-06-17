"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { saveGroqKeyAction, clearGroqKeyAction, saveBidProfileAction } from "@/app/(app)/settings/actions"

export function AiCard({ hasKey, bidProfile }: { hasKey: boolean; bidProfile: string }) {
  const router = useRouter()
  const [key, setKey] = React.useState("")
  const [profile, setProfile] = React.useState(bidProfile)
  const [pending, startTransition] = React.useTransition()

  function saveKey() {
    if (!key.trim()) return
    startTransition(() => {
      void (async () => {
        const r = await saveGroqKeyAction(key)
        if (r.ok) {
          toast.success("Groq API key saved")
          setKey("")
          router.refresh()
        } else {
          toast.error(r.error)
        }
      })()
    })
  }

  function clearKey() {
    startTransition(() => {
      void (async () => {
        await clearGroqKeyAction()
        toast.success("Key removed")
        router.refresh()
      })()
    })
  }

  function saveProfile() {
    startTransition(() => {
      void (async () => {
        await saveBidProfileAction(profile)
        toast.success("Background saved")
        router.refresh()
      })()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI bid generation (Groq)
        </CardTitle>
        <CardDescription>
          Add your Groq API key to draft application bids from the job description. Get a free key at{" "}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            console.groq.com/keys
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="groq">Groq API key</Label>
          {hasKey ? (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Key saved
              </span>
              <div className="flex gap-2">
                <Input
                  id="groq"
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Replace key (gsk_…)"
                  className="w-56"
                />
                <Button onClick={saveKey} disabled={pending || !key.trim()} size="sm">
                  Update
                </Button>
                <Button onClick={clearKey} disabled={pending} size="sm" variant="outline">
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="groq"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="gsk_…"
              />
              <Button onClick={saveKey} disabled={pending || !key.trim()}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bidProfile">Your background (optional)</Label>
          <textarea
            id="bidProfile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            rows={4}
            placeholder="e.g. Senior full-stack + AI engineer, 8 yrs, strong with React/Node/Python, shipped LLM products…"
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Used to personalize generated bids. Not sent anywhere except Groq.</p>
          <Button onClick={saveProfile} disabled={pending} size="sm" variant="outline">
            Save background
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
