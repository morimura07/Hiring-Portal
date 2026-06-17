import crypto from "crypto"

// AES-256-GCM encryption for OAuth tokens at rest. Key derived from APP_ENC_KEY.
function getKey(): Buffer {
  const secret = process.env.APP_ENC_KEY
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_ENC_KEY is required in production to encrypt tokens.")
    }
    // Dev-only insecure fallback so the app runs before the key is set.
    return crypto.createHash("sha256").update("dev-insecure-fallback-key").digest()
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}
