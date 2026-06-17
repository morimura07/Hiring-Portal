import type React from "react"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { AppSidebar } from "@/components/app-sidebar"
import { Topbar } from "@/components/topbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          id={user.id}
          name={user.name}
          email={user.email}
          role={user.role}
          avatarUrl={profile?.avatarUrl}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
