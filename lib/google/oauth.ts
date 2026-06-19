import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/crypto"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

// gmail.send → send as the user; gmail.modify → read threads + mark read.
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
]

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured (set GOOGLE_CLIENT_ID/SECRET).")
  return { clientId, clientSecret }
}

/** The public origin the user is on (handles Vercel's proxy headers). */
export function originFromRequest(request: Request): string {
  const h = request.headers
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${proto}://${host}`
}

/**
 * The OAuth redirect URI. We derive it from the live request origin so it always
 * matches the domain the user actually opened — no stale GOOGLE_REDIRECT_URI to sync.
 * The env var is only a fallback for contexts without a request.
 */
export function resolveRedirectUri(origin?: string): string {
  if (origin) return `${origin}/api/google/callback`
  return process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google/callback"
}

export function buildAuthUrl(state: string, origin?: string): string {
  const { clientId } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolveRedirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token every time
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

export async function exchangeCode(code: string, origin?: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = config()
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: resolveRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = config()
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/** The connected Gmail address for an access token (no extra scope needed). */
export async function getProfileEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`getProfile failed: ${res.status}`)
  const data = (await res.json()) as { emailAddress: string }
  return data.emailAddress
}

export async function saveGoogleAccount(userId: string, tokens: TokenResponse, email: string) {
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000)
  const base = {
    email,
    accessToken: encrypt(tokens.access_token),
    expiryDate,
    scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
  }
  await prisma.googleAccount.upsert({
    where: { userId },
    update: {
      ...base,
      // Keep the existing refresh token if Google didn't return a new one.
      ...(tokens.refresh_token ? { refreshToken: encrypt(tokens.refresh_token) } : {}),
    },
    create: { userId, ...base, refreshToken: encrypt(tokens.refresh_token ?? "") },
  })
}

export async function getGoogleAccount(userId: string) {
  return prisma.googleAccount.findUnique({ where: { userId } })
}

export async function isGmailConnected(userId: string): Promise<{ connected: boolean; email?: string }> {
  const acct = await prisma.googleAccount.findUnique({ where: { userId }, select: { email: true } })
  return acct ? { connected: true, email: acct.email } : { connected: false }
}

/** Returns a valid access token, refreshing if near expiry. Null if not connected. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const acct = await prisma.googleAccount.findUnique({ where: { userId } })
  if (!acct) return null

  // Still valid for >60s?
  if (acct.expiryDate.getTime() - Date.now() > 60_000) {
    return decrypt(acct.accessToken)
  }

  const refreshToken = decrypt(acct.refreshToken)
  if (!refreshToken) return null
  const refreshed = await refreshAccessToken(refreshToken)
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      accessToken: encrypt(refreshed.access_token),
      expiryDate: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  })
  return refreshed.access_token
}

export async function disconnectGoogle(userId: string) {
  await prisma.googleAccount.deleteMany({ where: { userId } })
}
