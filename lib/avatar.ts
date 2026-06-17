/**
 * Renderable <img> src for a user's avatar, or undefined if none.
 * Avatars are stored as PRIVATE blobs (or local-disk in dev), so they're always
 * served through the authenticated /api/profile/avatar route — never a direct URL.
 */
export function avatarSrc(user: { id: string; avatarUrl?: string | null }): string | undefined {
  if (!user.avatarUrl) return undefined
  return `/api/profile/avatar?u=${user.id}`
}
