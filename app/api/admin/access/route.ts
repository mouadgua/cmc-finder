import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/student-access"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  const allowed = session
    ? await isAdmin(
        session.user.id,
        session.user.email,
        session.user.emailVerified,
      )
    : false

  return Response.json({ isAdmin: allowed })
}
