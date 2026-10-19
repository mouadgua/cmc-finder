import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/student-access"

const messageSchema = z.object({
  content: z.string().trim().min(2).max(2000),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour répondre au ticket." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Le message est invalide." }, { status: 400 })
  }
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Le message doit contenir entre 2 et 2 000 caractères." }, { status: 400 })
  }

  const { id } = await params
  const admin = await isAdmin(
    session.user.id,
    session.user.email,
    session.user.emailVerified,
  )
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, userId: true, subject: true },
  })
  if (!ticket || (ticket.userId !== session.user.id && !admin)) {
    return Response.json({ error: "Ticket introuvable." }, { status: 404 })
  }

  const recipients = ticket.userId === session.user.id
    ? await prisma.user.findMany({
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
    : [{ id: ticket.userId }]

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        content: parsed.data.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true, role: true } },
      },
    })

    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: "Nouveau message sur un ticket",
          body: `${session.user.name} a répondu à « ${ticket.subject} ».`,
          href: ticket.userId === session.user.id
            ? "/dashboard/admin"
            : `/dashboard/tickets?id=${encodeURIComponent(ticket.id)}`,
        })),
      })
    }

    await tx.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    })
    return created
  })

  return Response.json({ message }, { status: 201 })
}
