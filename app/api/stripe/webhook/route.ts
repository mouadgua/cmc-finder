import Stripe from "stripe"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const profilePriceId = process.env.STRIPE_PROFILE_PRICE_ID
  const signature = request.headers.get("stripe-signature")
  if (!secretKey || !webhookSecret || !profilePriceId || !signature) {
    return Response.json({ error: "Le webhook Stripe n’est pas configuré." }, { status: 503 })
  }

  const stripe = new Stripe(secretKey)
  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    return Response.json({ error: "Signature Stripe invalide." }, { status: 400 })
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const checkout = event.data.object
    if (
      checkout.mode === "payment" &&
      checkout.payment_status === "paid" &&
      checkout.metadata?.userId &&
      checkout.metadata.studentId &&
      checkout.client_reference_id ===
        `${checkout.metadata.userId}:${checkout.metadata.studentId}`
    ) {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        checkout.id,
        { limit: 10 },
      )
      const purchasedProfilePrice = lineItems.data.some(
        (item) => item.price?.id === profilePriceId,
      )
      if (!purchasedProfilePrice) return Response.json({ received: true })

      const [user, student] = await Promise.all([
        prisma.user.findUnique({
          where: { id: checkout.metadata.userId },
          select: { id: true },
        }),
        prisma.etudiant.findUnique({
          where: { id: checkout.metadata.studentId },
          select: { id: true },
        }),
      ])

      if (user && student) {
        await prisma.studentAccess.upsert({
          where: {
            userId_studentId: { userId: user.id, studentId: student.id },
          },
          create: {
            userId: user.id,
            studentId: student.id,
            source: "STRIPE",
          },
          update: { source: "STRIPE" },
        })
      }
    }
  }

  return Response.json({ received: true })
}
