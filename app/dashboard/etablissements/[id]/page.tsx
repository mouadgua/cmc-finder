import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, GraduationCapIcon } from "lucide-react"
import { headers } from "next/headers"

import { StudentsTable } from "@/components/students-table"
import { DashboardShell } from "@/components/dashboard-shell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function EstablishmentStudentsPage({
  params,
}: PageProps<"/dashboard/etablissements/[id]">) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { id } = await params
  const establishment = await prisma.etablissement.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      _count: { select: { Etudiant: true } },
    },
  })
  if (!establishment) notFound()

  return (
    <DashboardShell title={establishment.nom}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/dashboard/etablissements"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Retour aux établissements
        </Link>

        <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <GraduationCapIcon aria-hidden="true" className="size-4" />
              Répertoire des étudiants
            </p>
            <h2 className="mt-2 text-3xl font-semibold">{establishment.nom}</h2>
            <p className="mt-2 text-muted-foreground">
              {establishment._count.Etudiant} étudiant
              {establishment._count.Etudiant === 1 ? "" : "s"} enregistré
              {establishment._count.Etudiant === 1 ? "" : "s"}.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Référence {establishment.id}
          </p>
        </header>

        <StudentsTable etablissementId={establishment.id} />
      </main>
    </DashboardShell>
  )
}
