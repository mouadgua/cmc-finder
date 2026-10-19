import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard-shell"
import { MyTickets } from "@/components/my-tickets"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/student-access"

export default async function TicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const administrator = await isAdmin(
    session.user.id,
    session.user.email,
    session.user.emailVerified,
  )

  return (
    <DashboardShell title="Mes tickets">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <header>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {administrator ? "Boîte de réception" : "Suivi de vos demandes"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {administrator ? "Messages et tickets" : "Mes tickets"}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {administrator
              ? "Les administrateurs répondent aux tickets depuis le tableau de bord et écrivent aux utilisateurs depuis l’administration."
              : "Retrouvez ici les demandes envoyées à l’administration et les réponses associées."}
          </p>
        </header>
        <MyTickets isAdmin={administrator} />
      </main>
    </DashboardShell>
  )
}
