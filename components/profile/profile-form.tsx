"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { avatarSrc } from "@/lib/avatar"
import { updateProfileAction, changePasswordAction } from "@/app/(app)/profile/actions"

type ProfileUser = {
  id: string
  name: string | null
  email: string
  bio: string | null
  avatarUrl: string | null
  role: Role
}

function initials(name: string | null, email: string) {
  if (name) return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()
  const [name, setName] = React.useState(user.name ?? "")
  const [bio, setBio] = React.useState(user.bio ?? "")
  const [uploading, setUploading] = React.useState(false)
  const [cacheBust, setCacheBust] = React.useState(0)
  const [savingProfile, startProfile] = React.useTransition()
  const [savingPw, startPw] = React.useTransition()

  const base = avatarSrc(user)
  const src = base ? (cacheBust ? `${base}${base.includes("?") ? "&" : "?"}t=${cacheBust}` : base) : undefined

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      toast.success("Avatar updated")
      setCacheBust(Date.now())
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function saveProfile() {
    startProfile(() => {
      void (async () => {
        const r = await updateProfileAction({ name, bio })
        if (r.ok) {
          toast.success("Profile saved")
          router.refresh()
        } else toast.error(r.error)
      })()
    })
  }

  function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const currentPassword = String(form.get("current") ?? "")
    const newPassword = String(form.get("new") ?? "")
    const confirm = String(form.get("confirm") ?? "")
    if (newPassword !== confirm) {
      toast.error("New passwords don't match.")
      return
    }
    const formEl = e.currentTarget
    startPw(() => {
      void (async () => {
        const r = await changePasswordAction({ currentPassword, newPassword })
        if (r.ok) {
          toast.success("Password changed")
          formEl.reset()
        } else toast.error(r.error)
      })()
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-[-0.01em]">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your name, bio, photo, and password.</p>
      </div>

      {/* Avatar + identity */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            {src && <AvatarImage src={src} alt={name} />}
            <AvatarFallback className="text-lg">{initials(name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{name || user.email}</span>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                {user.role === "ADMIN" ? "Admin" : "Member"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Change photo
              <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Name + bio + email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">Email can&apos;t be changed.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="A short bio about you…"
              className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Enter your current password to set a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new">New password</Label>
                <Input id="new" name="new" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm</Label>
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={savingPw}>
                {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
