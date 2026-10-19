import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasStudentProfileAccess, isAdmin } from "@/lib/student-access"

const createTicketSchema = z
  .object({
    studentId: z.string().min(1).max(200).optional(),
    subject: z.string().trim().min(3).max(120).optional(),
    message: z.string().trim().min(5).max(2000),
  })
  .refine((data) => Boolean(data.studentId || data.subject), {
    message: "Un objet est requis pour créer un ticket général.",
  })

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour consulter vos demandes." }, { status: 401 })
  }

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      subject: true,
      message: true,
      status: true,
      adminResponse: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      student: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          Etablissement: { select: { nom: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ tickets })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour envoyer une demande." }, { status: 401 })
  }
  if (
    await isAdmin(
      session.user.id,
      session.user.email,
      session.user.emailVerified,
    )
  ) {
    return Response.json(
      { error: "Les administrateurs ne peuvent pas créer de tickets." },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "La demande est invalide." }, { status: 400 })
  }

  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Le motif doit contenir entre 5 et 2 000 caractères." },
      { status: 400 },
    )
  }

  const student = parsed.data.studentId
    ? await prisma.etudiant.findUnique({
        where: { id: parsed.data.studentId },
        select: {
          id: true,
          nom: true,
          prenom: true,
          nomComplet: true,
          Etablissement: { select: { nom: true } },
        },
      })
    : null
  if (parsed.data.studentId && !student) {
    return Response.json({ error: "Fiche étudiant introuvable." }, { status: 404 })
  }

  if (student) {
    if (
      await hasStudentProfileAccess(
        session.user.id,
        session.user.email,
        session.user.emailVerified,
        student.id,
      )
    ) {
      return Response.json(
        { error: "Vous avez déjà accès à cette fiche." },
        { status: 409 },
      )
    }

    const pending = await prisma.ticket.findFirst({
      where: { userId: session.user.id, studentId: student.id, status: "PENDING" },
      select: { id: true },
    })
    if (pending) {
      return Response.json(
        { error: "Une demande est déjà en attente pour cette fiche." },
        { status: 409 },
      )
    }
  }

  const studentName = student
    ? [student.prenom, student.nom].filter(Boolean).join(" ") ||
      student.nomComplet ||
      "Étudiant"
    : null
  const subject =
    parsed.data.subject?.trim() ||
    `Demande d’accès à la fiche de ${studentName}`
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        {
          email: {
            in: (process.env.ADMIN_EMAILS ?? "")
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean),
          },
        },
      ],
      id: { not: session.user.id },
    },
    select: { id: true },
  })
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        userId: session.user.id,
        studentId: student?.id,
        subject,
        message: parsed.data.message,
      },
      select: { id: true, subject: true, status: true, createdAt: true },
    })
    await tx.notification.create({
      data: {
        userId: session.user.id,
        title: "Ticket créé",
        body: `Votre ticket « ${created.subject} » a bien été transmis à l’équipe.`,
        href: `/dashboard/tickets?id=${encodeURIComponent(created.id)}`,
      },
    })
    if (adminUsers.length) {
      await tx.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          title: "Nouveau ticket reçu",
          body: `${session.user.name} a créé le ticket « ${created.subject} ».`,
          href: "/dashboard/admin",
        })),
      })
    }
    return created
  })

  return Response.json({ ticket }, { status: 201 })
}
