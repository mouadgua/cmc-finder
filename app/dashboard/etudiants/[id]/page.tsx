import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, GraduationCapIcon, UserRoundIcon } from "lucide-react"
import { headers } from "next/headers"

import { DashboardShell } from "@/components/dashboard-shell"
import { StudentAccessActions } from "@/components/student-access-actions"
import { auth } from "@/lib/auth"
import { hasStudentProfileAccess } from "@/lib/student-access"
import { prisma } from "@/lib/prisma"

function formatDate(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(value)
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: PageProps<"/dashboard/etudiants/[id]">) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { id } = await params
  const student = await prisma.etudiant.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      prenom: true,
      nomComplet: true,
      etablissementId: true,
      Etablissement: { select: { nom: true } },
    },
  })
  if (!student) notFound()

  const hasAccess = await hasStudentProfileAccess(
    session.user.id,
    session.user.email,
    session.user.emailVerified,
    student.id,
  )
  const profile = hasAccess
    ? await prisma.etudiant.findUnique({
        where: { id },
        select: {
          id: true,
          photoUrl: true,
          cin: true,
          cef: true,
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
        },
      })
    : null
  if (hasAccess && !profile) notFound()

  const pendingTicket = hasAccess
    ? null
    : await prisma.ticket.findFirst({
        where: { userId: session.user.id, studentId: student.id, status: "PENDING" },
        select: { id: true },
      })

  const search = await searchParams
  const fullName =
    student.nomComplet ||
    [student.prenom, student.nom].filter(Boolean).join(" ") ||
    "Étudiant"
  const profileFields = profile
    ? [
        ["Identifiant", profile.id],
        ["CIN", profile.cin],
        ["CEF", profile.cef],
        ["Prénom", student.prenom],
        ["Nom", student.nom],
        ["Sexe", profile.sexe],
        ["Date de naissance", profile.dateNaissance],
        ["Nationalité", profile.nationalite],
        ["Téléphone", profile.telephone],
        ["Téléphone des parents", profile.telParents],
        ["Établissement", student.Etablissement.nom],
        ["Filière", profile.filiere],
        ["Année d’étude", profile.anneeEtude],
        ["Groupe", profile.groupe],
        ["Chambre", profile.chambre],
        ["Paiement", profile.paiement],
        ["Dossier créé le", formatDate(profile.createdAt)],
        ["Dernière mise à jour", formatDate(profile.updatedAt)],
      ] as const
    : []

  return (
    <DashboardShell title="Profil étudiant">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href={`/dashboard/etablissements/${encodeURIComponent(student.etablissementId)}`}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Retour à la liste des étudiants
        </Link>

        <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-center">
          {profile?.photoUrl ? (
            <Image
              alt={`Photo de ${fullName}`}
              className="size-24 rounded-2xl border object-cover"
              height={96}
              src={profile.photoUrl}
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
            <p className="mt-1 text-muted-foreground">{student.Etablissement.nom}</p>
          </div>
        </header>

        {search.payment === "success" && (
          <p className="rounded-lg border border-emerald-600/30 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" role="status">
            Paiement reçu. L’accès est activé dès confirmation sécurisée par Stripe; actualisez cette page dans quelques secondes si nécessaire.
          </p>
        )}
        {search.payment === "cancelled" && (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground" role="status">
            Le paiement a été annulé. Aucun accès n’a été débloqué.
          </p>
        )}

        {hasAccess ? (
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
                  <dd className="break-words font-medium">
                    {value || "Non renseigné"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <section
            aria-labelledby="locked-profile-title"
            className="rounded-2xl border bg-card p-5 sm:p-7"
          >
            <h3 className="text-lg font-semibold" id="locked-profile-title">
              Fiche protégée
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Seuls le nom et le prénom sont affichés avant autorisation.
              Déverrouillez cette fiche par paiement ou envoyez une demande à
              l’administrateur; les autres informations ne sont pas chargées.
            </p>
            <div className="mt-5">
              <StudentAccessActions
                requestPending={Boolean(pendingTicket)}
                studentId={student.id}
              />
            </div>
          </section>
        )}
      </main>
    </DashboardShell>
  )
}
