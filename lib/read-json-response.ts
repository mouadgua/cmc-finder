export async function readJsonResponse<T>(
  response: Response,
  context: string,
): Promise<T> {
  const body = await response.text()
  if (!body.trim()) {
    throw new Error(
      `${context} : le serveur a renvoyé une réponse vide (HTTP ${response.status}).`,
    )
  }

  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(
      `${context} : la réponse du serveur est invalide (HTTP ${response.status}).`,
    )
  }
}
