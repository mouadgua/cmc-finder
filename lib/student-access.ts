import { prisma } from "@/lib/prisma"

function configuredEmails(variable: string) {
  return (process.env[variable] ?? "")
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean)
}

export function isDirectoryEmailAllowed(
  email: string | null | undefined,
  emailVerified: boolean,
) {
  return Boolean(
    emailVerified &&
    email &&
    configuredEmails("STUDENT_DIRECTORY_EMAILS").includes(
      email.toLocaleLowerCase(),
    ),
  )
}

export async function isAdmin(
  userId: string,
  email: string | null | undefined,
  emailVerified: boolean,
) {
  if (
    emailVerified &&
    email &&
    configuredEmails("ADMIN_EMAILS").includes(email.toLocaleLowerCase())
  ) {
    return true
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  return user?.role === "ADMIN"
}

export async function hasStudentDirectoryAccess(
  userId: string,
  email: string | null | undefined,
  emailVerified: boolean,
) {
  if (
    isDirectoryEmailAllowed(email, emailVerified) ||
    (await isAdmin(userId, email, emailVerified))
  ) {
    return true
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiAccess: true },
  })

  return user?.aiAccess ?? false
}

export async function hasStudentProfileAccess(
  userId: string,
  email: string | null | undefined,
  emailVerified: boolean,
  studentId: string,
) {
  if (
    isDirectoryEmailAllowed(email, emailVerified) ||
    (await isAdmin(userId, email, emailVerified))
  ) {
    return true
  }

  const access = await prisma.studentAccess.findUnique({
    where: { userId_studentId: { userId, studentId } },
    select: { id: true },
  })

  return Boolean(access)
}
