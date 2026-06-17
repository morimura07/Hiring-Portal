import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ProfileForm } from "@/components/profile/profile-form"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await requireUser()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { id: true, name: true, email: true, bio: true, avatarUrl: true, role: true },
  })

  return <ProfileForm user={user} />
}
