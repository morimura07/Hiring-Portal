import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Building2,
  Send,
  Inbox,
  Users,
  ScrollText,
  Settings,
  TrendingUp,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Companies", href: "/companies", icon: Building2 },
  { title: "Applications", href: "/applications", icon: Send },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "Users", href: "/users", icon: Users, adminOnly: true },
  { title: "Score Management", href: "/score-management", icon: TrendingUp, adminOnly: true },
  { title: "Audit Logs", href: "/audit-logs", icon: ScrollText, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings },
]
