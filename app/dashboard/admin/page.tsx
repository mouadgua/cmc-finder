import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { AdminConsole } from "@/components/admin-console"
import { DashboardShell } from "@/components/dashboard-shell"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/student-access"

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (
    !(await isAdmin(
      session.user.id,
      session.user.email,
      session.user.emailVerified,
    ))
  ) {
    redirect("/dashboard")
  }

  return (
    <DashboardShell title="Administration">
      <main className="flex flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <header className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Espace sécurisé
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Administration CMC Finder</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Gérez les comptes, les autorisations de recherche et les demandes
            d’accès aux fiches étudiants.
          </p>
        </header>
        <AdminConsole />
      </main>
    </DashboardShell>
  )
}
