"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { disconnectGmailAction } from "@/app/(app)/settings/actions"

export function GmailCard({
  connected,
  email,
  configured,
}: {
  connected: boolean
  email?: string
  configured: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function disconnect() {
    startTransition(() => {
      void (async () => {
        await disconnectGmailAction()
        toast.success("Gmail disconnected")
        router.refresh()
      })()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Gmail
        </CardTitle>
        <CardDescription>
          Send applications and receive replies inside the portal — no separate email app needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!configured ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Gmail isn&apos;t configured on the server yet. Add <code>GOOGLE_CLIENT_ID</code> /{" "}
            <code>GOOGLE_CLIENT_SECRET</code> to <code>.env</code>.
          </p>
        ) : connected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                Connected as <span className="font-medium">{email}</span>
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Not connected.</span>
            <Button asChild>
              <a href="/api/google/connect">Connect Gmail</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
