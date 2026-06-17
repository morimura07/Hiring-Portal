"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Plus, UserPlus, Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { avatarSrc } from "@/lib/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserFormDialog } from "@/components/users/user-form-dialog"
import { setUserDisabledAction, deleteUserAction } from "@/app/(app)/users/actions"

export type UserRow = {
  id: string
  name: string | null
  email: string
  role: Role
  disabled: boolean
  avatarUrl: string | null
  createdAt: string
}

function initials(name: string | null, email: string) {
  if (name) return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [avatarUploadingId, setAvatarUploadingId] = React.useState<string | null>(null)

  async function uploadAvatar(userId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploadingId(userId)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("userId", userId)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      toast.success("Avatar updated")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAvatarUploadingId(null)
      e.target.value = ""
    }
  }

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(user: UserRow) {
    setEditTarget(user)
    setFormOpen(true)
  }

  async function toggleDisabled(user: UserRow) {
    setPendingId(user.id)
    const result = await setUserDisabledAction(user.id, !user.disabled)
    setPendingId(null)
    if (result.ok) {
      toast.success(user.disabled ? "User enabled" : "User disabled")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setPendingId(deleteTarget.id)
    const result = await deleteUserAction(deleteTarget.id)
    setPendingId(null)
    if (result.ok) {
      toast.success("User deleted")
      setDeleteTarget(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.01em]">User Management</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "account" : "accounts"} · admin-only
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <UserPlus className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const busy = pendingId === user.id
              return (
                <TableRow key={user.id} className={user.disabled ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <label className="group relative cursor-pointer" title="Set photo">
                        <Avatar className="h-8 w-8">
                          {avatarSrc(user) && <AvatarImage src={avatarSrc(user)} alt={user.name ?? user.email} />}
                          <AvatarFallback className="text-[10px]">{initials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          {avatarUploadingId === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          ) : (
                            <Camera className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(user.id, e)} />
                      </label>
                      <span>
                        {user.name ?? "—"}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role === "ADMIN" ? "Admin" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.disabled ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Disabled
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFmt.format(new Date(user.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busy}>
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleDisabled(user)}
                          disabled={isSelf && !user.disabled}
                        >
                          {user.disabled ? "Enable" : "Disable"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(user)}
                          disabled={isSelf}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        target={editTarget}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-medium">{deleteTarget?.email}</span> and
              their access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
