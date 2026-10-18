import { DashboardShell } from "@/components/dashboard-shell"
import { EstablishmentsList } from "@/components/establishments-list"
import { prisma } from "@/lib/prisma"

export default async function EstablishmentsPage() {
  let establishments: {
    id: string
    nom: string
    studentCount: number
  }[] = []
  let databaseUnavailable = false

  try {
    const records = await prisma.etablissement.findMany({
      select: {
        id: true,
        nom: true,
        _count: { select: { Etudiant: true } },
      },
      orderBy: { nom: "asc" },
    })

    establishments = records.map((record) => ({
      id: record.id,
      nom: record.nom,
      studentCount: record._count.Etudiant,
    }))
  } catch {
    databaseUnavailable = true
  }

  return (
    <DashboardShell title="Établissements">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Orientation et formation
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Les établissements CMC</h2>
          <p className="mt-2 leading-6 text-muted-foreground">
            Recherchez un établissement et posez vos questions à l’assistant
            pour préparer votre orientation.
          </p>
        </header>

        <EstablishmentsList
          databaseUnavailable={databaseUnavailable}
          establishments={establishments}
        />
      </main>
    </DashboardShell>
  )
}