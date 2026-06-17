import { withAuth } from "next-auth/middleware"

// Redirect unauthenticated users to our custom login page (not the default
// NextAuth /api/auth/signin page).
export default withAuth({
  pages: {
    signIn: "/login",
  },
})

// Protect everything except the login page, NextAuth API routes, and static assets.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
