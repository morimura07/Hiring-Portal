"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Role } from "@prisma/client"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/nav"

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN")

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#004FE5] text-xs font-semibold text-white">
          HI
        </div>
        <span className="text-sm font-medium tracking-[-0.01em]">Hiring Intelligence</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/50">
        Phase 1 · Foundation
      </div>
    </aside>
  )
}
