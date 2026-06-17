import { promises as fs } from "fs"
import path from "path"
import { put, del } from "@vercel/blob"

// On Vercel (serverless) the filesystem is ephemeral, so attachments go to Vercel Blob.
// Locally (no BLOB token) we fall back to disk under ./storage so dev needs no setup.
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const ROOT = path.join(process.cwd(), "storage", "attachments")

function safeName(filename: string): string {
  return filename.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "file"
}

const isRemote = (p: string) => /^https?:\/\//.test(p)

export async function saveAttachment(id: string, filename: string, data: Buffer): Promise<string> {
  if (useBlob) {
    const blob = await put(`attachments/${id}-${safeName(filename)}`, data, {
      access: "public",
      addRandomSuffix: false,
    })
    return blob.url
  }
  await fs.mkdir(ROOT, { recursive: true })
  const filePath = path.join(ROOT, `${id}-${safeName(filename)}`)
  await fs.writeFile(filePath, data)
  return filePath
}

export async function readAttachment(storagePath: string): Promise<Buffer> {
  if (isRemote(storagePath)) {
    const res = await fetch(storagePath)
    if (!res.ok) throw new Error(`Couldn't read attachment (${res.status})`)
    return Buffer.from(await res.arrayBuffer())
  }
  return fs.readFile(storagePath)
}

export async function deleteAttachment(storagePath: string): Promise<void> {
  try {
    if (isRemote(storagePath)) await del(storagePath)
    else await fs.unlink(storagePath)
  } catch {
    /* already gone */
  }
}
