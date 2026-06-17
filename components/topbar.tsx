"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import type { Role } from "@prisma/client"
import { NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/user-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Topbar({
  id,
  name,
  email,
  role,
  avatarUrl,
}: {
  id: string
  name?: string | null
  email?: string | null
  role: Role
  avatarUrl?: string | null
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN")
  const current = items.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile nav */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md p-2 hover:bg-accent md:hidden">
            <Menu className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className={cn(active && "font-medium")}>
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <h1 className="text-base font-medium tracking-[-0.01em]">{current?.title ?? "Portal"}</h1>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu id={id} name={name} email={email} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  )
}
