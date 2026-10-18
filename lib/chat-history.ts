export type ChatHistoryStudent = {
  id: string
  name: string
  filiere: string | null
  groupe: string | null
  etablissement: string
}

export type ChatHistoryMessage = {
  role: "user" | "assistant"
  content: string
  attachments?: { name: string; type: string }[]
  students?: ChatHistoryStudent[]
}

export type ChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatHistoryMessage[]
}

const HISTORY_KEY = "cmc-finder-chat-history-v1"
const HISTORY_EVENT = "cmc-finder-chat-history-changed"
const MAX_HISTORY_ITEMS = 20

function isChatSession(value: unknown): value is ChatSession {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "number" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number" &&
    "messages" in value &&
    Array.isArray(value.messages)
  )
}

export function readChatHistory(snapshot: string): ChatSession[] {
  try {
    const parsed: unknown = JSON.parse(snapshot)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item): ChatSession | null => {
        if (isChatSession(item)) return item
        if (
          typeof item?.id !== "string" ||
          typeof item?.question !== "string" ||
          typeof item?.createdAt !== "number"
        ) {
          return null
        }

        return {
          id: item.id,
          title: item.question,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
          messages: [{ role: "user", content: item.question }],
        }
      })
      .filter((session): session is ChatSession => session !== null)
  } catch {
    return []
  }
}

export function getChatHistorySnapshot() {
  try {
    return localStorage.getItem(HISTORY_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

export function subscribeToChatHistory(onChange: () => void) {
  window.addEventListener(HISTORY_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(HISTORY_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function appendChatMessage(
  sessionId: string,
  message: ChatHistoryMessage,
  fallbackTitle: string,
) {
  try {
    const history = readChatHistory(getChatHistorySnapshot())
    const previous = history.find((session) => session.id === sessionId)
    const now = Date.now()
    const safeMessage: ChatHistoryMessage = {
      role: message.role,
      content: message.content,
      attachments: message.attachments?.map(({ name, type }) => ({ name, type })),
      students: message.students,
    }
    const session: ChatSession = {
      id: sessionId,
      title: previous?.title ?? fallbackTitle.slice(0, 72),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      messages: [...(previous?.messages ?? []), safeMessage],
    }

    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(
        [session, ...history.filter((item) => item.id !== sessionId)].slice(
          0,
          MAX_HISTORY_ITEMS,
        ),
      ),
    )
    window.dispatchEvent(new Event(HISTORY_EVENT))
  } catch {
    // Browsers may disable local storage; chat still works without history.
  }
}