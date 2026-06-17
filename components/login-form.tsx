"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setIsLoading(false)

    if (!result || result.error) {
      toast.error("Invalid email or password, or your account is disabled.")
      return
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-md"
    >
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/80">
          Work email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/80">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/30"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="h-10 w-full bg-[#004FE5] text-white hover:bg-[#004FE5]/90"
      >
        {isLoading && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  )
}
