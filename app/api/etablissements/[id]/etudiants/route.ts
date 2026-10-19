import { headers } from "next/headers"
import { Prisma } from "@/lib/generated/prisma/client"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  isAdmin,
  isDirectoryEmailAllowed,
} from "@/lib/student-access"

const pageSize = 20

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour consulter cette liste." }, { status: 401 })
  }

  const { id: etablissementId } = await params
  const url = new URL(request.url)
  const requestedPage = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100)
  const filiere = (url.searchParams.get("filiere") ?? "").trim().slice(0, 100)
  const groupe = (url.searchParams.get("groupe") ?? "").trim().slice(0, 100)
  const hasFullDirectoryAccess =
    isDirectoryEmailAllowed(session.user.email, session.user.emailVerified) ||
    (await isAdmin(
      session.user.id,
      session.user.email,
      session.user.emailVerified,
    ))

  const etablissement = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    select: { id: true, nom: true },
  })
  if (!etablissement) {
    return Response.json({ error: "Établissement introuvable." }, { status: 404 })
  }

  const where: Prisma.EtudiantWhereInput = { etablissementId }
  if (query) {
    where.OR = [
      { nom: { contains: query, mode: "insensitive" } },
      { prenom: { contains: query, mode: "insensitive" } },
      { nomComplet: { contains: query, mode: "insensitive" } },
    ]
  }
  if (hasFullDirectoryAccess && filiere) {
    where.filiere = { contains: filiere, mode: "insensitive" }
  }
  if (hasFullDirectoryAccess && groupe) {
    where.groupe = { contains: groupe, mode: "insensitive" }
  }

  const total = await prisma.etudiant.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const rows = await prisma.etudiant.findMany({
    where,
    select: {
      id: true,
      nom: true,
      prenom: true,
      nomComplet: true,
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const rowIds = rows.map((row) => row.id)
  const [accesses, pendingTickets] = await Promise.all([
    hasFullDirectoryAccess
      ? Promise.resolve(rowIds.map((studentId) => ({ studentId })))
      : prisma.studentAccess.findMany({
          where: { userId: session.user.id, studentId: { in: rowIds } },
          select: { studentId: true },
        }),
    prisma.ticket.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
        studentId: { in: rowIds },
      },
      select: { studentId: true },
    }),
  ])
  const accessibleIds = accesses.map((access) => access.studentId)
  const [details, filieres, groupes] = await Promise.all([
    accessibleIds.length
      ? prisma.etudiant.findMany({
          where: { id: { in: accessibleIds } },
          select: { id: true, filiere: true, groupe: true, anneeEtude: true },
        })
      : Promise.resolve([]),
    hasFullDirectoryAccess
      ? prisma.etudiant.findMany({
          where: { etablissementId, filiere: { not: null } },
          distinct: ["filiere"],
          select: { filiere: true },
          orderBy: { filiere: "asc" },
        })
      : Promise.resolve([]),
    hasFullDirectoryAccess
      ? prisma.etudiant.findMany({
          where: { etablissementId, groupe: { not: null } },
          distinct: ["groupe"],
          select: { groupe: true },
          orderBy: { groupe: "asc" },
        })
      : Promise.resolve([]),
  ])
  const detailsById = new Map(details.map((student) => [student.id, student]))
  const pendingIds = new Set(pendingTickets.map((ticket) => ticket.studentId))

  return Response.json({
    etablissement,
    rows: rows.map((student) => {
      const detail = detailsById.get(student.id)
      return {
        id: student.id,
        nom: student.nom || student.nomComplet || "Étudiant",
        prenom: student.prenom,
        hasAccess: Boolean(detail),
        requestPending: pendingIds.has(student.id),
        ...(detail
          ? {
              filiere: detail.filiere,
              groupe: detail.groupe,
              anneeEtude: detail.anneeEtude,
            }
          : {}),
      }
    }),
    pagination: { page, pageSize, total, totalPages },
    filters: {
      filieres: filieres.flatMap((item) => item.filiere ? [item.filiere] : []),
      groupes: groupes.flatMap((item) => item.groupe ? [item.groupe] : []),
      enabled: hasFullDirectoryAccess,
    },
  })
}
