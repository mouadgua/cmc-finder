"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ArrowUpIcon,
  BotIcon,
  FileTextIcon,
  GraduationCapIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  appendChatMessage,
  getChatHistorySnapshot,
  readChatHistory,
  subscribeToChatHistory,
} from "@/lib/chat-history"

const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 4 * 1024 * 1024
const MAX_TOTAL_SIZE = 8 * 1024 * 1024
const ACCEPTED_FILE_TYPES = new Set([
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
])

type SelectedAttachment = {
  file: File
  previewUrl?: string
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  attachments?: { name: string; type: string; previewUrl?: string }[]
  students?: {
    id: string
    name: string
    filiere: string | null
    groupe: string | null
    etablissement: string
  }[]
}

const EMPTY_MESSAGES: ChatMessage[] = []

const suggestions = [
  "Comment choisir mon établissement ?",
  "Quelles sont les étapes d’inscription ?",
  "Je cherche une formation en informatique",
]

export function AssistantChat({
  initialQuestion,
  initialSessionId,
  isConfigured,
}: {
  initialQuestion: string
  initialSessionId: string
  isConfigured: boolean
}) {
  const historySnapshot = useSyncExternalStore(
    subscribeToChatHistory,
    getChatHistorySnapshot,
    () => "[]",
  )
  const sessions = useMemo(
    () => readChatHistory(historySnapshot),
    [historySnapshot],
  )
  const [sessionId, setSessionId] = useState(initialSessionId || "")
  const activeSession = sessions.find((session) => session.id === sessionId)
  const messages = (activeSession?.messages ?? EMPTY_MESSAGES) as ChatMessage[]
  const [input, setInput] = useState(initialQuestion)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([])
  const endOfMessagesRef = useRef<HTMLDivElement>(null)
  const documentPickerRef = useRef<HTMLInputElement>(null)
  const imagePickerRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef(new Set<string>())

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const objectUrls = objectUrlsRef.current
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ""
    if (selectedFiles.length === 0) return

    const acceptedFiles = selectedFiles.filter(
      (file) => ACCEPTED_FILE_TYPES.has(file.type),
    )
    const sizeOkFiles = acceptedFiles.filter((file) => file.size <= MAX_FILE_SIZE)
    const totalSize = attachments.reduce((sum, item) => sum + item.file.size, 0)
    const withinCount = sizeOkFiles.slice(0, MAX_ATTACHMENTS - attachments.length)
    let remainingSize = MAX_TOTAL_SIZE - totalSize
    const withinTotal = withinCount.filter((file) => {
      if (file.size > remainingSize) return false
      remainingSize -= file.size
      return true
    })

    const rejected = acceptedFiles.length !== selectedFiles.length
    const tooLarge = sizeOkFiles.length !== acceptedFiles.length
    const overLimit = withinTotal.length !== selectedFiles.length

    setError(
      rejected
        ? "Format non pris en charge. Ajoutez une image, un PDF, un document Word, un tableur ou un fichier texte."
        : tooLarge || overLimit
          ? "Limite atteinte : 5 fichiers maximum, 4 Mo par fichier et 8 Mo au total."
          : "",
    )

    const newAttachments = withinTotal.map((file) => {
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined
      if (previewUrl) objectUrlsRef.current.add(previewUrl)
      return { file, previewUrl }
    })
    setAttachments((current) => [...current, ...newAttachments])
  }

  function removeAttachment(index: number) {
    const removed = attachments[index]
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl)
      objectUrlsRef.current.delete(removed.previewUrl)
    }
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = input.trim()
    if ((!content && attachments.length === 0) || loading) return
    const activeSessionId = sessionId || crypto.randomUUID()
    const sessionTitle = content || attachments[0]?.file.name || "Nouvelle conversation"
    if (!sessionId) setSessionId(activeSessionId)

    const messageAttachments = attachments.map(({ file, previewUrl }) => ({
      name: file.name,
      type: file.type,
      previewUrl,
    }))
    const userMessage = {
      role: "user" as const,
      content,
      attachments: messageAttachments,
    }
    appendChatMessage(activeSessionId, userMessage, sessionTitle)
    setInput("")
    setAttachments([])
    setError("")
    setLoading(true)

    try {
      const encodedAttachments = await Promise.all(
        attachments.map(
          ({ file }) =>
            new Promise<{ name: string; type: string; data: string }>(
              (resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    resolve({
                      name: file.name,
                      type: file.type,
                      data: reader.result,
                    })
                  } else {
                    reject(new Error("Unable to read file"))
                  }
                }
                reader.onerror = () => reject(reader.error)
                reader.readAsDataURL(file)
              },
            ),
        ),
      )
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          attachments: encodedAttachments,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error ?? "La réponse de l’assistant est indisponible.")
        return
      }

      appendChatMessage(
        activeSessionId,
        {
          role: "assistant",
          content: result.answer,
          students: result.students,
        },
        sessionTitle,
      )
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      {messages.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <GraduationCapIcon aria-hidden="true" className="size-6" />
          </div>
          <h2 className="text-2xl font-semibold md:text-3xl">
            En quoi puis-je vous aider ?
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Posez une question sur les formations, les établissements ou votre
            orientation.
          </p>
          {!isConfigured && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              L’assistant nécessite une configuration serveur.
            </p>
          )}
          <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                className="min-h-9 rounded-full border px-4 py-2 text-sm transition-colors hover:bg-muted"
                key={suggestion}
                onClick={() => setInput(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section
          aria-label="Conversation avec l’assistant CMC"
          aria-live="polite"
          className="flex flex-1 flex-col gap-7 overflow-y-auto py-8"
        >
          {messages.map((message, index) => (
              <div
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" && (
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <BotIcon aria-hidden="true" className="size-4" />
                  </span>
                )}
                <div
                  className={`max-w-[88%] ${message.role === "user" ? "rounded-3xl bg-muted px-4 py-3" : "py-2"}`}
                >
                  {message.content && (
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                  )}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        attachment.previewUrl ? (
                          <Image
                            alt={attachment.name}
                            className="size-20 rounded-xl border object-cover"
                            key={attachment.name}
                            src={attachment.previewUrl}
                            width={80}
                            height={80}
                            unoptimized
                          />
                        ) : (
                          <span
                            className="inline-flex max-w-56 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs"
                            key={attachment.name}
                          >
                            <FileTextIcon aria-hidden="true" className="size-4 shrink-0" />
                            <span className="truncate">{attachment.name}</span>
                          </span>
                        )
                      ))}
                    </div>
                  )}
                  {message.students && message.students.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {message.students.map((student) => (
                        <Link
                          className="rounded-lg border px-3 py-2 transition-colors hover:bg-muted"
                          href={`/dashboard/etudiants/${encodeURIComponent(student.id)}`}
                          key={student.id}
                        >
                          <span className="block text-sm font-medium">
                            {student.name}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {[student.filiere, student.groupe, student.etablissement]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
              <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
              L’assistant prépare une réponse…
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </section>
      )}

      {error && (
        <p
          className="mb-3 text-center text-sm text-amber-800 dark:text-amber-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <form className="mt-auto pb-3 pt-4" onSubmit={handleSubmit}>
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                className="relative flex h-16 max-w-52 items-center gap-2 rounded-xl border bg-background p-2 pr-8"
                key={`${attachment.file.name}-${index}`}
              >
                {attachment.previewUrl ? (
                  <Image
                    alt=""
                    className="size-12 rounded-lg object-cover"
                    src={attachment.previewUrl}
                    width={48}
                    height={48}
                    unoptimized
                  />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileTextIcon aria-hidden="true" className="size-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">
                    {attachment.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(attachment.file.size / (1024 * 1024)).toFixed(1)} Mo
                  </span>
                </span>
                <button
                  aria-label={`Retirer ${attachment.file.name}`}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm hover:text-foreground"
                  onClick={() => removeAttachment(index)}
                  title="Retirer le fichier"
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-3xl border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
          <label className="sr-only" htmlFor="assistant-message">
            Votre question
          </label>
          <Input
            className="h-11 border-0 bg-transparent px-2 text-sm shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0"
            id="assistant-message"
            maxLength={2000}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message à CMC Finder"
            type="text"
            value={input}
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="flex items-center gap-1">
              <button
                aria-label="Joindre des documents"
                className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => documentPickerRef.current?.click()}
                title="Joindre des documents"
                type="button"
              >
                <PaperclipIcon aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Documents</span>
              </button>
              <button
                aria-label="Ajouter des photos"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => imagePickerRef.current?.click()}
                title="Ajouter des photos"
                type="button"
              >
                <ImagePlusIcon aria-hidden="true" className="size-4" />
              </button>
              <input
                accept=".pdf,.txt,.md,.csv,.docx,.pptx,.xlsx,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                multiple
                onChange={addFiles}
                ref={documentPickerRef}
                tabIndex={-1}
                type="file"
              />
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                multiple
                onChange={addFiles}
                ref={imagePickerRef}
                tabIndex={-1}
                type="file"
              />
            </div>
            <button
              aria-label="Envoyer la question"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={(!input.trim() && attachments.length === 0) || loading}
              title="Envoyer"
              type="submit"
            >
              {loading ? (
                <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <ArrowUpIcon aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          L’assistant peut se tromper. Vérifiez les informations importantes.
        </p>
      </form>
    </div>
  )
}