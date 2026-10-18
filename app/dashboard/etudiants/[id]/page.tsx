import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, GraduationCapIcon, UserRoundIcon } from "lucide-react"
import { headers } from "next/headers"

import { DashboardShell } from "@/components/dashboard-shell"
import { auth } from "@/lib/auth"
import { hasStudentDirectoryAccess } from "@/lib/student-access"
import { prisma } from "@/lib/prisma"

function formatDate(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(value)
}

export default async function StudentProfilePage({
  params,
}: PageProps<"/dashboard/etudiants/[id]">) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (!hasStudentDirectoryAccess(session.user.email)) notFound()

  const { id } = await params
  const student = await prisma.etudiant.findUnique({
    where: { id },
    select: {
      id: true,
      photoUrl: true,
      cin: true,
      cef: true,
      nom: true,
      prenom: true,
      nomComplet: true,
      sexe: true,
      dateNaissance: true,
      nationalite: true,
      telephone: true,
      telParents: true,
      filiere: true,
      groupe: true,
      anneeEtude: true,
      chambre: true,
      paiement: true,
      createdAt: true,
      updatedAt: true,
      Etablissement: { select: { nom: true } },
    },
  })

  if (!student) notFound()

  const fullName =
    student.nomComplet ||
    [student.prenom, student.nom].filter(Boolean).join(" ") ||
    "Étudiant"
  const profileFields = [
    ["Identifiant", student.id],
    ["CIN", student.cin],
    ["CEF", student.cef],
    ["Prénom", student.prenom],
    ["Nom", student.nom],
    ["Sexe", student.sexe],
    ["Date de naissance", student.dateNaissance],
    ["Nationalité", student.nationalite],
    ["Téléphone", student.telephone],
    ["Téléphone des parents", student.telParents],
    ["Établissement", student.Etablissement.nom],
    ["Filière", student.filiere],
    ["Année d’étude", student.anneeEtude],
    ["Groupe", student.groupe],
    ["Chambre", student.chambre],
    ["Paiement", student.paiement],
    ["Dossier créé le", formatDate(student.createdAt)],
    ["Dernière mise à jour", formatDate(student.updatedAt)],
  ] as const

  return (
    <DashboardShell title="Profil étudiant">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Retour à l’assistant
        </Link>

        <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-center">
          {student.photoUrl ? (
            <Image
              alt={`Photo de ${fullName}`}
              className="size-24 rounded-2xl border object-cover"
              height={96}
              src={student.photoUrl}
              unoptimized
              width={96}
            />
          ) : (
            <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl border bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <UserRoundIcon aria-hidden="true" className="size-10" />
            </span>
          )}
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <GraduationCapIcon aria-hidden="true" className="size-4" />
              Profil étudiant
            </p>
            <h2 className="mt-1 text-3xl font-semibold">{fullName}</h2>
            <p className="mt-1 text-muted-foreground">
              {student.Etablissement.nom}
            </p>
          </div>
        </header>

        <section aria-labelledby="student-details-title">
          <h3 className="text-lg font-semibold" id="student-details-title">
            Informations du dossier
          </h3>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {profileFields.map(([label, value]) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 border-b py-3 text-sm"
                key={label}
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words font-medium">{value || "Non renseigné"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </DashboardShell>
  )
}