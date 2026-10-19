import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/student-access"

const resolveTicketSchema = z.object({
  ticketId: z.string().min(1),
  decision: z.enum(["IN_PROGRESS", "APPROVED", "REJECTED"]),
  response: z.string().trim().min(5).max(2000),
})

async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (
    !session ||
    !(await isAdmin(
      session.user.id,
      session.user.email,
      session.user.emailVerified,
    ))
  ) {
    return null
  }
  return session
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 })
  }

  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      subject: true,
      message: true,
      status: true,
      adminResponse: true,
      createdAt: true,
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
      student: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          nomComplet: true,
          Etablissement: { select: { nom: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  })

  return Response.json({ tickets })
}

export async function PATCH(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "La réponse est invalide." }, { status: 400 })
  }

  const parsed = resolveTicketSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "La réponse doit contenir entre 5 et 2 000 caractères." }, { status: 400 })
  }

  const resolvedAt = new Date()
  const ticket = await prisma.$transaction(async (tx) => {
    const pendingTicket = await tx.ticket.findFirst({
      where: {
        id: parsed.data.ticketId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true, userId: true, studentId: true },
    })
    if (!pendingTicket) return null

    const changed = await tx.ticket.updateMany({
      where: {
        id: pendingTicket.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        status: parsed.data.decision,
        adminResponse: parsed.data.response,
        resolvedById:
          parsed.data.decision === "IN_PROGRESS" ? null : session.user.id,
        resolvedAt: parsed.data.decision === "IN_PROGRESS" ? null : resolvedAt,
      },
    })
    if (changed.count !== 1) return null

    if (parsed.data.decision === "APPROVED" && pendingTicket.studentId) {
      await tx.studentAccess.upsert({
        where: {
          userId_studentId: {
            userId: pendingTicket.userId,
            studentId: pendingTicket.studentId,
          },
        },
        create: {
          userId: pendingTicket.userId,
          studentId: pendingTicket.studentId,
          source: "ADMIN",
        },
        update: { source: "ADMIN" },
      })
    }

    await tx.ticketMessage.create({
      data: {
        ticketId: pendingTicket.id,
        authorId: session.user.id,
        content: parsed.data.response,
      },
    })
    await tx.notification.create({
      data: {
        userId: pendingTicket.userId,
        title:
          parsed.data.decision === "IN_PROGRESS"
            ? "Votre ticket est en cours"
            : parsed.data.decision === "APPROVED"
              ? "Votre demande a été acceptée"
              : "Votre demande a été refusée",
        body: parsed.data.response,
        href: `/dashboard/tickets?id=${encodeURIComponent(pendingTicket.id)}`,
      },
    })

    return tx.ticket.findUnique({
      where: { id: pendingTicket.id },
      select: {
        id: true,
        status: true,
        adminResponse: true,
        resolvedAt: true,
        studentId: true,
      },
    })
  })

  if (!ticket) {
    return Response.json(
      { error: "Cette demande a déjà été traitée ou n’existe plus." },
      { status: 409 },
    )
  }

  return Response.json({ ticket })
}
