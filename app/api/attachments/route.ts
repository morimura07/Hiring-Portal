import "server-only"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { saveAttachment, readAttachment } from "@/lib/storage"

export const dynamic = "force-dynamic"

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB per file

// Upload one or more files (multipart). Returns attachment metadata to attach on send.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const files = form.getAll("files").filter((f): f is File => f instanceof File)
  if (files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 })

  const out = []
  for (const file of files) {
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `${file.name} exceeds 10 MB` }, { status: 400 })
    const id = crypto.randomUUID()
    const buf = Buffer.from(await file.arrayBuffer())
    const storagePath = await saveAttachment(id, file.name, buf)
    const row = await prisma.attachment.create({
      data: {
        id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: buf.length,
        storagePath,
      },
    })
    out.push({ id: row.id, filename: row.filename, size: row.size, mimeType: row.mimeType })
  }
  return NextResponse.json({ ok: true, attachments: out })
}

// Download an attachment the user owns (their sent/received messages).
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { message: { include: { conversation: { include: { application: true } } } } },
  })
  if (!att || att.message?.conversation.application.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const buf = await readAttachment(att.storagePath)
    return new NextResponse(buf, {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `attachment; filename="${att.filename.replace(/"/g, "")}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 })
  }
}
