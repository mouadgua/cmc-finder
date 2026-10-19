import Stripe from "stripe"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasStudentProfileAccess } from "@/lib/student-access"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Connectez-vous pour acheter l’accès." }, { status: 401 })
  }

  const { id: studentId } = await params
  const student = await prisma.etudiant.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) {
    return Response.json({ error: "Fiche étudiant introuvable." }, { status: 404 })
  }

  if (
    await hasStudentProfileAccess(
      session.user.id,
      session.user.email,
      session.user.emailVerified,
      student.id,
    )
  ) {
    return Response.json({ error: "Vous avez déjà accès à cette fiche." }, { status: 409 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PROFILE_PRICE_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!secretKey || !priceId || !appUrl) {
    return Response.json(
      { error: "Le paiement n’est pas configuré. Contactez l’administrateur." },
      { status: 503 },
    )
  }

  const stripe = new Stripe(secretKey)
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: `${session.user.id}:${student.id}`,
    metadata: { userId: session.user.id, studentId: student.id },
    success_url: `${appUrl.replace(/\/$/, "")}/dashboard/etudiants/${encodeURIComponent(student.id)}?payment=success`,
    cancel_url: `${appUrl.replace(/\/$/, "")}/dashboard/etudiants/${encodeURIComponent(student.id)}?payment=cancelled`,
  })

  return Response.json({ url: checkout.url })
}
