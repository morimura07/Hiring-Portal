import { promises as fs } from "fs"
import path from "path"
import { put, del, get } from "@vercel/blob"

// On Vercel (serverless) the filesystem is ephemeral, so files go to Vercel Blob as
// PRIVATE objects, and are streamed back through the app's authenticated routes.
// Locally (no Blob configured) we fall back to disk under ./storage so dev needs no setup.
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const onServerless = Boolean(process.env.VERCEL)
const ROOT = path.join(process.cwd(), "storage", "attachments")

function safeName(filename: string): string {
  return filename.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "file"
}

const isRemote = (p: string) => /^https?:\/\//.test(p)

export async function saveAttachment(id: string, filename: string, data: Buffer): Promise<string> {
  if (hasBlob) {
    const blob = await put(`attachments/${id}-${safeName(filename)}`, data, {
      access: "private",
      addRandomSuffix: false,
    })
    return blob.url
  }
  // Never write to ephemeral serverless disk — it would store a path that breaks immediately.
  if (onServerless) {
    throw new Error(
      "File storage isn't configured. Connect a Vercel Blob store to this project and redeploy.",
    )
  }
  await fs.mkdir(ROOT, { recursive: true })
  const filePath = path.join(ROOT, `${id}-${safeName(filename)}`)
  await fs.writeFile(filePath, data)
  return filePath
}

export async function readAttachment(storagePath: string): Promise<Buffer> {
  if (isRemote(storagePath)) {
    const res = await get(storagePath, { access: "private" })
    if (!res || res.statusCode !== 200 || !res.stream) throw new Error("Couldn't read attachment")
    return Buffer.from(await new Response(res.stream).arrayBuffer())
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
