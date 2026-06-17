import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#001F63] px-4">
      {/* Ambient brand gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(1200px 600px at 70% -10%, #2452F1 0%, transparent 55%), radial-gradient(900px 500px at 0% 110%, #0B1D99 0%, transparent 50%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-semibold text-white ring-1 ring-white/20">
            HI
          </div>
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-white">
            Hiring Intelligence Portal
          </h1>
          <p className="mt-1 text-sm text-white/60">Team access only · sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
