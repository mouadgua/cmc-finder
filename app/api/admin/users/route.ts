import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/student-access"

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]),
  aiAccess: z.boolean(),
})
const userMessageSchema = z.object({
  userId: z.string().min(1),
  message: z.string().trim().min(2).max(2000),
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

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      aiAccess: true,
      createdAt: true,
      _count: { select: { tickets: true, studentAccesses: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const configuredAdmins = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase())
      .filter(Boolean),
  )
  const directoryEmails = new Set(
    (process.env.STUDENT_DIRECTORY_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase())
      .filter(Boolean),
  )

  return Response.json({
    users: users.map((user) => ({
      ...user,
      configuredAdmin:
        user.emailVerified &&
        configuredAdmins.has(user.email.toLocaleLowerCase()),
      directoryAllowlisted:
        user.emailVerified &&
        directoryEmails.has(user.email.toLocaleLowerCase()),
    })),
  })
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Le message est invalide." }, { status: 400 })
  }

  const parsed = userMessageSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Le message doit contenir entre 2 et 2 000 caractères." },
      { status: 400 },
    )
  }

  const recipient = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  })
  if (!recipient) {
    return Response.json({ error: "Utilisateur introuvable." }, { status: 404 })
  }

  await prisma.notification.create({
    data: {
      userId: recipient.id,
      title: "Message de l’administration",
      body: parsed.data.message,
    },
  })

  return Response.json({ success: true }, { status: 201 })
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
    return Response.json({ error: "La modification est invalide." }, { status: 400 })
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Les droits transmis sont invalides." }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true },
  })
  if (!target) {
    return Response.json({ error: "Utilisateur introuvable." }, { status: 404 })
  }

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const configuredAdmins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase())
      .filter(Boolean)
    if (configuredAdmins.includes(target.email.toLocaleLowerCase())) {
      return Response.json(
        { error: "Un administrateur défini dans ADMIN_EMAILS ne peut pas être rétrogradé ici." },
        { status: 409 },
      )
    }

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return Response.json(
        { error: "Conservez au moins un administrateur actif." },
        { status: 409 },
      )
    }
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role, aiAccess: parsed.data.aiAccess },
    select: { id: true, role: true, aiAccess: true },
  })

  return Response.json({ user })
}
