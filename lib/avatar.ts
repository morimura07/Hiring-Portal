/** Renderable <img> src for a user's avatar, or undefined if none. */
export function avatarSrc(user: { id: string; avatarUrl?: string | null }): string | undefined {
  if (!user.avatarUrl) return undefined
  // Vercel Blob stores a public https URL — render directly.
  if (/^https?:\/\//.test(user.avatarUrl)) return user.avatarUrl
  // Local-disk dev: serve through the route.
  return `/api/profile/avatar?u=${user.id}`
}
