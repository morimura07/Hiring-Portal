import "server-only"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { saveAttachment, deleteAttachment, readAttachment } from "@/lib/storage"
import { writeAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Upload / replace the current user's avatar.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Must be an image" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image exceeds 5 MB" }, { status: 400 })

  // Admins may set another user's avatar by passing `userId`; otherwise update self.
  const targetId = form.get("userId")
  let userIdToUpdate = user.id
  if (typeof targetId === "string" && targetId && targetId !== user.id) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    userIdToUpdate = targetId
  }

  const buf = Buffer.from(await file.arrayBuffer())
  let storagePath: string
  try {
    storagePath = await saveAttachment(`avatar-${crypto.randomUUID()}`, file.name, buf)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const prev = await prisma.user.findUnique({ where: { id: userIdToUpdate }, select: { avatarUrl: true } })
  await prisma.user.update({ where: { id: userIdToUpdate }, data: { avatarUrl: storagePath } })
  if (prev?.avatarUrl && prev.avatarUrl !== storagePath) await deleteAttachment(prev.avatarUrl)
  await writeAudit({ actorUserId: user.id, action: "profile.avatar", entityType: "User", entityId: userIdToUpdate })

  return NextResponse.json({ ok: true })
}

const extMime: Record<string, string> = {
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
}

// Serve a user's avatar (used for local-disk dev; Blob URLs render directly).
export async function GET(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = new URL(request.url).searchParams.get("u")
  if (!u) return NextResponse.json({ error: "Missing user" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: u }, select: { avatarUrl: true } })
  if (!target?.avatarUrl) return new NextResponse(null, { status: 404 })

  try {
    const buf = await readAttachment(target.avatarUrl)
    const ext = target.avatarUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? ""
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": extMime[ext] ?? "image/jpeg", "Cache-Control": "private, max-age=60" },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
