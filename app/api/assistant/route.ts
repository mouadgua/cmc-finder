import { headers } from "next/headers"
import { z } from "zod"
import { OfficeParser } from "officeparser"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasStudentDirectoryAccess } from "@/lib/student-access"

const studentStopWords = new Set([
  "avec", "dans", "des", "du", "elle", "est", "etudiant", "etudiants",
  "etudiante", "etudiantes", "eleve", "eleves", "pour", "quel", "quelle",
  "quels", "quelles", "moi", "mon", "ma", "mes", "son", "sa", "ses",
  "les", "une", "des", "de", "la", "le", "qui", "sont", "tous", "toutes", "toute",
  "classe", "classes", "promotion", "promotions", "promo", "groupe", "groupes",
  "par", "sur", "chez", "aux", "the", "all", "student", "students",
  "je", "un", "certain", "certaine", "individu", "individus", "personne", "personnes",
  "ce", "que", "tu", "connais", "connaissez", "connait", "connaît", "sais",
  "tan", "kan", "ana", "nta", "nti", "wa7ed", "wahed", "7aja", "3la",
  "dyal", "dial", "smito", "smieto", "smiya", "smiyto", "bghit", "3tini",
  "qleb", "9eleb", "t9leb", "l9a", "wach", "kayen", "kayn", "had", "hada",
  "voir", "cherche", "chercher", "recherche", "rechercher", "trouve", "trouver",
  "montre", "montrer", "affiche", "afficher", "liste", "donne", "donner",
])

const studentSearchPattern =
  /\b(etudiants?|etudiantes?|eleves?|dossiers?|profils?|students?|pupils?|individus?|personnes?|classes?|promotions?|promos?|groupes?|cohortes?|liste des|list students)\b/i
const personLookupPattern =
  /\b(cherche|recherche|trouve|retrouve|montre|affiche|voir)\b.*\b(un certain|une certaine|nomme|nommee|qui s'appelle|qui s’appelle|individu|personne)\b/i
const studentFollowUpPattern =
  /\b(pas recu|pas recus|pas recue|pas recues|je ne les ai pas|je les ai pas|je n'ai rien recu|je n’ai rien recu|ou sont les liens|les liens ne|renvoie les|renvoyez les)\b/i

function isStudentSearchRequest(question: string) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  return (
    studentSearchPattern.test(normalized) || personLookupPattern.test(normalized)
  )
}

const acceptedAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

function getStudentSearchTerms(query: string) {
  const normalized = query
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([\p{L}]+)([\p{N}]+)/gu, "$1 $2")
    .replace(/([\p{N}]+)([\p{L}]+)/gu, "$1 $2")
  return [...new Set(normalized.match(/[\p{L}\p{N}]{2,}/gu) ?? [])]
    .filter((word) => !studentStopWords.has(word))
    .slice(0, 8)
}

function getStudentTermFilter(term: string) {
  return {
    OR: [
      { id: { contains: term, mode: "insensitive" as const } },
      { nomComplet: { contains: term, mode: "insensitive" as const } },
      { nom: { contains: term, mode: "insensitive" as const } },
      { prenom: { contains: term, mode: "insensitive" as const } },
      { cin: { contains: term, mode: "insensitive" as const } },
      { cef: { contains: term, mode: "insensitive" as const } },
      { sexe: { contains: term, mode: "insensitive" as const } },
      { dateNaissance: { contains: term, mode: "insensitive" as const } },
      { nationalite: { contains: term, mode: "insensitive" as const } },
      { telephone: { contains: term, mode: "insensitive" as const } },
      { telParents: { contains: term, mode: "insensitive" as const } },
      { filiere: { contains: term, mode: "insensitive" as const } },
      { groupe: { contains: term, mode: "insensitive" as const } },
      { anneeEtude: { contains: term, mode: "insensitive" as const } },
      { chambre: { contains: term, mode: "insensitive" as const } },
      { paiement: { contains: term, mode: "insensitive" as const } },
      {
        Etablissement: {
          is: { nom: { contains: term, mode: "insensitive" as const } },
        },
      },
    ],
  }
}

async function getAttachmentText(attachment: {
  type: (typeof acceptedAttachmentTypes)[number]
  data: string
}) {
  const prefix = `data:${attachment.type};base64,`
  const buffer = Buffer.from(attachment.data.slice(prefix.length), "base64")

  if (attachment.type.startsWith("text/")) {
    return new TextDecoder().decode(buffer).slice(0, 30000)
  }

  const ast = await OfficeParser.parseOffice(buffer)
  return (await ast.to("text")).value.slice(0, 30000)
}

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().max(2000),
      }),
    )
    .min(1)
    .max(20)
    .refine((messages) => messages.at(-1)?.role === "user"),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        type: z.enum(acceptedAttachmentTypes),
        data: z.string().startsWith("data:").max(5_700_000),
      }),
    )
    .max(5)
    .optional()
    .default([]),
  })

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json(
      { error: "Connectez-vous pour utiliser l’assistant." },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "La requête est invalide." }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Le message ou les pièces jointes sont invalides." },
      { status: 400 },
    )
  }

  const latestQuestion = parsed.data.messages.at(-1)?.content ?? ""
  if (!latestQuestion && parsed.data.attachments.length === 0) {
    return Response.json(
      { error: "Ajoutez un message ou une pièce jointe." },
      { status: 400 },
    )
  }

  const normalizedQuestion = latestQuestion
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  const previousStudentRequest = [...parsed.data.messages]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        message.content !== latestQuestion &&
        isStudentSearchRequest(message.content),
    )
  const isStudentSearch =
    isStudentSearchRequest(latestQuestion) ||
    (Boolean(previousStudentRequest) &&
      studentFollowUpPattern.test(normalizedQuestion))
  const studentSearchQuestion = isStudentSearchRequest(latestQuestion)
    ? latestQuestion
    : previousStudentRequest?.content ?? latestQuestion
  const isBulkStudentSearch =
    /\b(classes?|promotions?|promos?|groupes?|cohortes?)\b/i.test(
      studentSearchQuestion
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )
  const hasDirectoryAccess = hasStudentDirectoryAccess(session.user.email)
  if (isStudentSearch && !hasDirectoryAccess) {
    return Response.json(
      {
        error:
          "L’accès aux dossiers étudiants est réservé aux comptes autorisés. Contactez l’administrateur de CMC Finder.",
      },
      { status: 403 },
    )
  }

  const totalAttachmentBytes = parsed.data.attachments.reduce(
    (total, attachment) =>
      total + Math.ceil((attachment.data.length * 3) / 4),
    0,
  )
  if (totalAttachmentBytes > 8 * 1024 * 1024) {
    return Response.json(
      { error: "Les pièces jointes dépassent la limite de 8 Mo." },
      { status: 413 },
    )
  }

  for (const attachment of parsed.data.attachments) {
    if (!attachment.data.startsWith(`data:${attachment.type};base64,`)) {
      return Response.json(
        { error: "Le format d’une pièce jointe est invalide." },
        { status: 400 },
      )
    }
  }

  let context = ""
  let students: {
    id: string
    name: string
    filiere: string | null
    groupe: string | null
    etablissement: string
  }[] = []

  try {
    if (isStudentSearch && hasDirectoryAccess) {
      const searchTerms = getStudentSearchTerms(studentSearchQuestion)
      const studentSelect = {
        id: true,
        nomComplet: true,
        nom: true,
        prenom: true,
        cin: true,
        cef: true,
        sexe: true,
        dateNaissance: true,
        nationalite: true,
        telephone: true,
        telParents: true,
        filiere: true,
        groupe: true,
        anneeEtude: true,
        chambre: true,
        paiement: true,
        Etablissement: { select: { nom: true } },
      } as const

      let studentRecords = await prisma.etudiant.findMany({
        where: searchTerms.length
          ? { AND: searchTerms.map(getStudentTermFilter) }
          : undefined,
        select: studentSelect,
        orderBy: { nomComplet: "asc" },
        take: isBulkStudentSearch ? undefined : 8,
      })

      if (!isBulkStudentSearch && !studentRecords.length && searchTerms.length > 1) {
        const candidates = await prisma.etudiant.findMany({
          where: { OR: searchTerms.map(getStudentTermFilter) },
          select: studentSelect,
          take: 200,
        })
        const normalize = (value: string) =>
          value
            .toLocaleLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        const minimumMatches = Math.max(1, searchTerms.length - 1)

        studentRecords = candidates
          .map((student) => {
            const values = [
              student.id,
              student.nomComplet,
              student.nom,
              student.prenom,
              student.cin,
              student.cef,
              student.sexe,
              student.dateNaissance,
              student.nationalite,
              student.telephone,
              student.telParents,
              student.filiere,
              student.groupe,
              student.anneeEtude,
              student.chambre,
              student.paiement,
              student.Etablissement.nom,
            ]
              .filter((value): value is string => Boolean(value))
              .map(normalize)
            const matchCount = searchTerms.filter((term) =>
              values.some((value) => value.includes(normalize(term)),
              ),
            ).length

            return { student, matchCount }
          })
          .filter(({ matchCount }) => matchCount >= minimumMatches)
          .sort((left, right) => right.matchCount - left.matchCount)
          .slice(0, 8)
          .map(({ student }) => student)
      }

      students = studentRecords.map((student) => ({
        id: student.id,
        name:
          student.nomComplet ||
          [student.prenom, student.nom].filter(Boolean).join(" ") ||
          "Étudiant",
        filiere: student.filiere,
        groupe: student.groupe,
        etablissement: student.Etablissement.nom,
      }))
      context = students.length
        ? `La recherche autorisée a trouvé ${students.length} dossier(s) correspondant(s). Les liens vers les dossiers correspondants seront ajoutés par l’application. Ne demande pas et ne génère aucun nom ni détail personnel.`
        : "Aucun étudiant correspondant à cette recherche n’est présent dans la base. Ne propose aucun nom inventé."
    } else {
      const establishments = await prisma.etablissement.findMany({
        select: { nom: true },
        orderBy: { nom: "asc" },
        take: 100,
      })
      context = establishments.length
        ? establishments.map((item) => item.nom).join("\n")
        : "Aucun établissement n’est encore enregistré dans la base de données."
    }
  } catch {
    return Response.json(
      { error: "Les données de CMC Finder sont momentanément indisponibles." },
      { status: 503 },
    )
  }

  if (isStudentSearch) {
    const answer = students.length
      ? `J’ai trouvé ${students.length} étudiant${students.length > 1 ? "s" : ""} correspondant${students.length > 1 ? "s" : ""}. Voici ${students.length > 1 ? "les dossiers" : "le dossier"} :`
      : isBulkStudentSearch
        ? "Aucun étudiant n’a été trouvé pour cette classe ou ce groupe. Vérifie le code, par exemple DEV205."
        : "Aucun dossier correspondant n’a été trouvé. Essaie avec le nom complet, le CEF ou le CIN."
    return Response.json({ answer, students })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json(
      {
        error:
          "L’assistant IA n’est pas encore configuré. Ajoutez GROQ_API_KEY dans le fichier .env du serveur.",
      },
      { status: 503 },
    )
  }

  let documentContext = ""
  try {
    const documents = parsed.data.attachments.filter(
      (attachment) => !attachment.type.startsWith("image/"),
    )
    const extracted = await Promise.all(
      documents.map(async (attachment) => ({
        name: attachment.name,
        text: await getAttachmentText(attachment),
      })),
    )
    documentContext = extracted
      .map(({ name, text }) => `\n\nDocument : ${name}\n${text}`)
      .join("")
      .slice(0, 50000)
  } catch {
    return Response.json(
      { error: "Un document n’a pas pu être lu. Vérifiez son format et réessayez." },
      { status: 400 },
    )
  }

  const messages = parsed.data.messages.map((message, index) => {
    if (index !== parsed.data.messages.length - 1) return message

    const content: {
      type: "text" | "image_url"
      text?: string
      image_url?: { url: string }
    }[] = [
      {
        type: "text",
        text: `${message.content}${documentContext ? `\n\nContenu des documents joints :${documentContext}` : ""}`,
      },
    ]

    for (const attachment of parsed.data.attachments) {
      if (attachment.type.startsWith("image/")) {
        content.push({
          type: "image_url",
          image_url: { url: attachment.data },
        })
      }
    }

    return { role: message.role, content }
  })

  const hasImageAttachments = parsed.data.attachments.some((attachment) =>
    attachment.type.startsWith("image/"),
  )
  const model = hasImageAttachments
    ? process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct"
    : process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"

  let completion: Response
  try {
    completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Tu es l’assistant d’orientation de CMC Finder. Réponds dans la langue de l’utilisateur, clairement et prudemment. N’invente pas de dates, conditions d’admission, frais ou formations. Ne génère pas de noms d’étudiants, ne révèle jamais d’identifiant, CIN, CEF, date de naissance, téléphone, données de paiement ou autre détail personnel. Les noms trouvés seront affichés par l’application sous forme de liens privés. Si aucune correspondance n’existe, ne suggère aucun nom.\n\nContexte :\n${context}`,
          },
          ...messages,
        ],
        max_tokens: 700,
        temperature: 0.4,
      }),
    })
  } catch {
    return Response.json(
      { error: "Le service Groq est injoignable pour le moment." },
      { status: 502 },
    )
  }

  if (!completion.ok) {
    return Response.json(
      { error: "Groq n’a pas pu traiter votre demande. Vérifiez le modèle et la clé API." },
      { status: 502 },
    )
  }

  const result = (await completion.json()) as {
    choices?: { message?: { content?: string | null } }[]
  }
  const answer = result.choices?.[0]?.message?.content?.trim()
  if (!answer) {
    return Response.json(
      { error: "L’assistant n’a pas renvoyé de réponse." },
      { status: 502 },
    )
  }

  return Response.json({ answer, students })
}