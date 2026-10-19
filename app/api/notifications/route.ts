import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const markReadSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string().min(1)).max(100).optional(),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour consulter vos notifications." }, { status: 401 })
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ])

  return Response.json({ notifications, unreadCount })
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour modifier vos notifications." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "La requête est invalide." }, { status: 400 })
  }
  const parsed = markReadSchema.safeParse(body)
  if (!parsed.success || (!parsed.data.all && !parsed.data.ids?.length)) {
    return Response.json({ error: "Sélectionnez une ou plusieurs notifications." }, { status: 400 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      ...(parsed.data.all ? {} : { id: { in: parsed.data.ids } }),
    },
    data: { readAt: new Date() },
  })

  return Response.json({ success: true })
}
