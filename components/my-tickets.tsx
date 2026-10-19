"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { LoaderCircleIcon, MessageSquareTextIcon, SendIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Ticket = {
  id: string
  subject: string
  message: string
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | string
  adminResponse: string | null
  createdAt: string
  student: {
    id: string
    nom: string | null
    prenom: string | null
    Etablissement: { nom: string }
  } | null
  messages: {
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string; role: string }
  }[]
}

function statusLabel(status: string) {
  if (status === "APPROVED") return "Acceptée"
  if (status === "REJECTED") return "Refusée"
  if (status === "IN_PROGRESS") return "En cours"
  return "En attente"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

async function fetchTickets() {
  const response = await fetch("/api/tickets")
  const data = (await response.json()) as { tickets?: Ticket[]; error?: string }
  if (!response.ok || !data.tickets) {
    throw new Error(data.error ?? "Les tickets n’ont pas pu être chargés.")
  }
  return data.tickets
}

export function MyTickets({ isAdmin = false }: { isAdmin?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [subject, setSubject] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let active = true
    const refresh = () => fetchTickets()
      .then((items) => {
        if (active) setTickets(items)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Les tickets n’ont pas pu être chargés.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  async function refreshTickets() {
    const items = await fetchTickets()
    setTickets(items)
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy("new")
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: newMessage }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? "Le ticket n’a pas pu être créé.")
      }
      setSubject("")
      setNewMessage("")
      setNotice("Votre ticket a été créé. Vous recevrez ici les réponses et changements de statut.")
      await refreshTickets()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Le ticket n’a pas pu être créé.")
    } finally {
      setBusy("")
    }
  }

  async function sendReply(ticket: Ticket) {
    const content = replies[ticket.id]?.trim()
    if (!content) return
    setBusy(ticket.id)
    setError("")
    setNotice("")
    try {
      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? "Votre message n’a pas pu être envoyé.")
      }
      setReplies((current) => ({ ...current, [ticket.id]: "" }))
      await refreshTickets()
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Votre message n’a pas pu être envoyé.",
      )
    } finally {
      setBusy("")
    }
  }

  return (
    <section aria-label="Mes tickets" className="mx-auto w-full max-w-4xl space-y-6">
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau ticket</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pour une demande générale ou un problème de compte. Pour demander
              l’accès à un dossier, utilisez le bouton sur sa fiche.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createTicket}>
              <label className="block space-y-2 text-sm font-medium">
                Objet
                <Input
                  maxLength={120}
                  minLength={3}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                  value={subject}
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Votre message
                <textarea
                  className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  maxLength={2000}
                  minLength={5}
                  onChange={(event) => setNewMessage(event.target.value)}
                  required
                  value={newMessage}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                N’incluez pas de captures de conversations privées, d’informations
                intimes ou de données personnelles concernant d’autres personnes.
              </p>
              <Button disabled={busy !== ""} type="submit">
                {busy === "new" ? (
                  <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                ) : (
                  <SendIcon aria-hidden="true" />
                )}
                Envoyer le ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-600/30 p-4 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Chargement de vos tickets…
        </div>
      ) : tickets.length ? (
        <div className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{ticket.subject}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ticket.student
                      ? `${ticket.student.Etablissement.nom} · ${[ticket.student.prenom, ticket.student.nom].filter(Boolean).join(" ")} · `
                      : ""}
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <Badge
                  variant={ticket.status === "APPROVED" ? "default" : "outline"}
                >
                  {statusLabel(ticket.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Votre demande
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {ticket.message}
                  </p>
                </div>
                {ticket.messages.map((message) => (
                  <div className="rounded-lg border bg-muted/30 p-4" key={message.id}>
                    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <MessageSquareTextIcon aria-hidden="true" className="size-4" />
                      {message.author.role === "ADMIN"
                        ? "Administration"
                        : message.author.name}
                      {" · "}
                      {formatDate(message.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                  </div>
                ))}
                {ticket.adminResponse && ticket.messages.length === 0 && (
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Réponse de l’administrateur
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {ticket.adminResponse}
                    </p>
                  </div>
                )}
                {ticket.student && ticket.status === "APPROVED" && (
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        href={`/dashboard/etudiants/${encodeURIComponent(ticket.student.id)}`}
                      />
                    }
                    size="sm"
                    variant="outline"
                  >
                    Consulter la fiche
                  </Button>
                )}
                <div className="space-y-2 border-t pt-4">
                  <label
                    className="block text-sm font-medium"
                    htmlFor={`ticket-reply-${ticket.id}`}
                  >
                    Répondre à ce ticket
                  </label>
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    id={`ticket-reply-${ticket.id}`}
                    maxLength={2000}
                    onChange={(event) =>
                      setReplies((current) => ({
                        ...current,
                        [ticket.id]: event.currentTarget.value,
                      }))
                    }
                    value={replies[ticket.id] ?? ""}
                  />
                  <Button
                    disabled={busy !== "" || !replies[ticket.id]?.trim()}
                    onClick={() => void sendReply(ticket)}
                    size="sm"
                    variant="outline"
                  >
                    Envoyer le message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border py-10 text-center">
          <h3 className="font-medium">Aucun ticket pour le moment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez un ticket avec le formulaire ci-dessus ou demandez un accès à
            une fiche étudiant.
          </p>
        </div>
      )}
    </section>
  )
}
