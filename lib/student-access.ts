export function hasStudentDirectoryAccess(email: string | null | undefined) {
  if (!email) return false

  const allowedEmails = (process.env.STUDENT_DIRECTORY_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean)

  return allowedEmails.includes(email.toLocaleLowerCase())
}