"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { avatarSrc } from "@/lib/avatar"

function initials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }
  return (email ?? "?").slice(0, 2).toUpperCase()
}

export function UserMenu({
  id,
  name,
  email,
  role,
  avatarUrl,
}: {
  id: string
  name?: string | null
  email?: string | null
  role: "ADMIN" | "MEMBER"
  avatarUrl?: string | null
}) {
  const src = avatarSrc({ id, avatarUrl })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          {src && <AvatarImage src={src} alt={name ?? email ?? ""} />}
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate">{name ?? "Unnamed user"}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="mt-1 w-fit">
            {role === "ADMIN" ? "Admin" : "Member"}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
