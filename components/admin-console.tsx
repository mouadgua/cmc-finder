"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  SendIcon,
  UserRoundCogIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type UserRecord = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  role: "USER" | "ADMIN" | string
  aiAccess: boolean
  configuredAdmin: boolean
  directoryAllowlisted: boolean
  createdAt: string
  _count: { tickets: number; studentAccesses: number }
}

type TicketRecord = {
  id: string
  subject: string
  message: string
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | string
  adminResponse: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
  messages: {
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string; role: string }
  }[]
  student: {
    id: string
    nom: string | null
    prenom: string | null
    nomComplet: string | null
    Etablissement: { nom: string }
  } | null
}

async function fetchAdminData() {
  const [usersResponse, ticketsResponse] = await Promise.all([
    fetch("/api/admin/users"),
    fetch("/api/admin/tickets"),
  ])
  const [usersData, ticketsData] = (await Promise.all([
    usersResponse.json(),
    ticketsResponse.json(),
  ])) as [
    { users?: UserRecord[]; error?: string },
    { tickets?: TicketRecord[]; error?: string },
  ]
  if (!usersResponse.ok || !usersData.users) {
    throw new Error(usersData.error ?? "Les utilisateurs n’ont pas pu être chargés.")
  }
  if (!ticketsResponse.ok || !ticketsData.tickets) {
    throw new Error(ticketsData.error ?? "Les tickets n’ont pas pu être chargés.")
  }
  return { users: usersData.users, tickets: ticketsData.tickets }
}

function errorMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function AdminConsole() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [userQuery, setUserQuery] = useState("")
  const [ticketFilter, setTicketFilter] = useState("PENDING")
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [userMessageDrafts, setUserMessageDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchAdminData()
      setUsers(data.users)
      setTickets(data.tickets)
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Les données admin n’ont pas pu être chargées."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchAdminData()
      .then((data) => {
        if (!active) return
        setUsers(data.users)
        setTickets(data.tickets)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(errorMessage(cause, "Les données admin n’ont pas pu être chargées."))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const visibleUsers = useMemo(() => {
    const normalized = userQuery.trim().toLocaleLowerCase()
    if (!normalized) return users
    return users.filter((user) =>
      `${user.name} ${user.email}`.toLocaleLowerCase().includes(normalized),
    )
  }, [userQuery, users])

  const visibleTickets = useMemo(
    () =>
      ticketFilter === "ALL"
        ? tickets
        : tickets.filter((ticket) => ticket.status === ticketFilter),
    [ticketFilter, tickets],
  )

  async function updateUser(user: UserRecord, changes: Partial<UserRecord>) {
    setBusy(user.id)
    setError("")
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: changes.role ?? user.role,
          aiAccess: changes.aiAccess ?? user.aiAccess,
        }),
      })
      const result = (await response.json()) as {
        user?: { id: string; role: string; aiAccess: boolean }
        error?: string
      }
      if (!response.ok || !result.user) {
        throw new Error(result.error ?? "Les droits n’ont pas pu être modifiés.")
      }
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, role: result.user!.role, aiAccess: result.user!.aiAccess }
            : item,
        ),
      )
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Les droits n’ont pas pu être modifiés."))
    } finally {
      setBusy("")
    }
  }

  async function resolveTicket(
    ticket: TicketRecord,
    decision: "IN_PROGRESS" | "APPROVED" | "REJECTED",
  ) {
    const defaultResponse = decision === "IN_PROGRESS"
      ? "Votre demande est en cours de traitement. Nous vous informerons de la suite."
      : decision === "APPROVED"
        ? ticket.student
          ? "Votre demande a été acceptée. L’accès complet à la fiche est maintenant activé."
          : "Votre demande a été acceptée."
        : "Votre demande a été refusée. Contactez le support si vous souhaitez obtenir des précisions."
    const responseText = responseDrafts[ticket.id]?.trim() || defaultResponse
    setBusy(ticket.id)
    setError("")
    try {
      const response = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          decision,
          response: responseText,
        }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "La réponse au ticket n’a pas été enregistrée.")
      }
      await loadData()
    } catch (cause: unknown) {
      setError(errorMessage(cause, "La réponse au ticket n’a pas été enregistrée."))
    } finally {
      setBusy("")
    }
  }

  async function sendTicketMessage(ticket: TicketRecord) {
    const content = messageDrafts[ticket.id]?.trim()
    if (!content) return
    setBusy(ticket.id)
    setError("")
    try {
      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      )
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "Le message n’a pas pu être envoyé.")
      }
      setMessageDrafts((current) => ({ ...current, [ticket.id]: "" }))
      await loadData()
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Le message n’a pas pu être envoyé."))
    } finally {
      setBusy("")
    }
  }

  async function sendUserMessage(user: UserRecord) {
    const message = userMessageDrafts[user.id]?.trim()
    if (!message) return
    setBusy(user.id)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, message }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "Le message n’a pas pu être envoyé.")
      }
      setUserMessageDrafts((current) => ({ ...current, [user.id]: "" }))
      setNotice(`Message envoyé à ${user.name}. Il apparaîtra dans ses notifications.`)
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Le message n’a pas pu être envoyé."))
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Indicateurs admin">
        <Card>
          <CardHeader><CardTitle>Utilisateurs</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{users.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tickets en attente</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {tickets.filter((ticket) => ticket.status === "PENDING").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Accès activés</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {users.reduce((sum, user) => sum + user._count.studentAccesses, 0)}
            </p>
          </CardContent>
        </Card>
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-600/30 p-4 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Chargement de l’administration…
        </div>
      ) : (
        <>
          <section aria-labelledby="admin-tickets-title" className="space-y-4">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-xl font-semibold" id="admin-tickets-title">
                  Gestion des tickets
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chaque décision est enregistrée et sa réponse est visible dans l’espace du demandeur.
                </p>
              </div>
              <select
                aria-label="Filtrer les tickets"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                onChange={(event) => setTicketFilter(event.currentTarget.value)}
                value={ticketFilter}
              >
                <option value="PENDING">En attente</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="APPROVED">Acceptés</option>
                <option value="REJECTED">Refusés</option>
                <option value="ALL">Tous les tickets</option>
              </select>
            </header>
            {visibleTickets.length ? (
              <div className="grid gap-4">
                {visibleTickets.map((ticket) => {
                  const studentName =
                    [ticket.student?.prenom, ticket.student?.nom]
                      .filter(Boolean)
                      .join(" ") ||
                    ticket.student?.nomComplet ||
                    (ticket.student ? "Étudiant" : "Demande générale")
                  return (
                    <Card key={ticket.id}>
                      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle>{ticket.subject}</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {ticket.user.name} · {ticket.user.email} · {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                        <Badge variant={ticket.status === "PENDING" ? "outline" : "secondary"}>
                          {ticket.status === "PENDING"
                            ? "En attente"
                            : ticket.status === "IN_PROGRESS"
                              ? "En cours"
                              : ticket.status === "APPROVED"
                                ? "Acceptée"
                                : "Refusée"}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {ticket.student
                            ? `${studentName} · ${ticket.student.Etablissement.nom}`
                            : studentName}
                        </p>
                        <div className="rounded-lg bg-muted/40 p-3 text-sm leading-6">
                          {ticket.message}
                        </div>
                        {ticket.messages.map((message) => (
                          <div className="rounded-lg border p-3 text-sm" key={message.id}>
                            <p className="text-xs text-muted-foreground">
                              {message.author.role === "ADMIN" ? "Administration" : message.author.name}
                              {" · "}
                              {formatDate(message.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap leading-6">{message.content}</p>
                          </div>
                        ))}
                        {ticket.status === "PENDING" || ticket.status === "IN_PROGRESS" ? (
                          <>
                            <label className="block space-y-2 text-sm font-medium">
                              Message de réponse (envoyé dans l’espace tickets du client)
                              <textarea
                                className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                maxLength={2000}
                                onChange={(event) => {
                                  const value = event.currentTarget.value
                                  setResponseDrafts((current) => ({
                                    ...current,
                                    [ticket.id]: value,
                                  }))
                                }}
                                placeholder="Laissez vide pour utiliser le message automatique."
                                value={responseDrafts[ticket.id] ?? ""}
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={busy !== ""}
                                onClick={() => void resolveTicket(ticket, "IN_PROGRESS")}
                                variant="outline"
                              >
                                {ticket.status === "PENDING" ? "Mettre en cours" : "Toujours en cours"}
                              </Button>
                              <Button
                                disabled={busy !== ""}
                                onClick={() => void resolveTicket(ticket, "APPROVED")}
                              >
                                {busy === ticket.id ? (
                                  <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                                ) : (
                                  <CheckIcon aria-hidden="true" />
                                )}
                                {ticket.student ? "Accepter et donner accès" : "Accepter le ticket"}
                              </Button>
                              <Button
                                disabled={busy !== ""}
                                onClick={() => void resolveTicket(ticket, "REJECTED")}
                                variant="destructive"
                              >
                                <XIcon aria-hidden="true" />
                                Refuser
                              </Button>
                            </div>
                          </>
                        ) : ticket.adminResponse ? (
                          <div className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">Dernière réponse envoyée</p>
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {ticket.adminResponse}
                            </p>
                          </div>
                        ) : null}
                        <label className="block space-y-2 text-sm font-medium">
                          Nouveau message
                          <textarea
                            className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            maxLength={2000}
                            onChange={(event) => {
                              const value = event.currentTarget.value
                              setMessageDrafts((current) => ({
                                ...current,
                                [ticket.id]: value,
                              }))
                            }}
                            placeholder="Répondre au demandeur sans changer le statut."
                            value={messageDrafts[ticket.id] ?? ""}
                          />
                        </label>
                        <Button
                          disabled={busy !== "" || !messageDrafts[ticket.id]?.trim()}
                          onClick={() => void sendTicketMessage(ticket)}
                          variant="outline"
                        >
                          Envoyer le message
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Aucun ticket dans cette catégorie.
              </p>
            )}
          </section>

          <section aria-labelledby="admin-users-title" className="space-y-4">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold" id="admin-users-title">
                  <UserRoundCogIcon aria-hidden="true" className="size-5" />
                  Gestion des utilisateurs et des accès
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Définissez les administrateurs et les comptes autorisés à rechercher des étudiants avec l’assistant.
                </p>
              </div>
              <div className="w-full sm:max-w-sm">
                <Input
                  aria-label="Rechercher un utilisateur"
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Nom ou adresse e-mail"
                  type="search"
                  value={userQuery}
                />
              </div>
            </header>
            {visibleUsers.length ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Utilisateur</th>
                      <th className="px-4 py-3 font-medium">Rôle</th>
                      <th className="px-4 py-3 font-medium">Recherche IA</th>
                      <th className="px-4 py-3 font-medium">Droits / activité</th>
                      <th className="px-4 py-3 font-medium">Message direct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-muted-foreground">{user.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Inscrit le {formatDate(user.createdAt)}
                            {!user.emailVerified && " · E-mail non vérifié"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <label className="sr-only" htmlFor={`role-${user.id}`}>
                            Rôle de {user.email}
                          </label>
                          <select
                            className="h-9 rounded-lg border border-input bg-background px-2"
                            disabled={busy === user.id || user.configuredAdmin}
                            id={`role-${user.id}`}
                            onChange={(event) =>
                              void updateUser(user, { role: event.currentTarget.value })
                            }
                            value={user.configuredAdmin ? "ADMIN" : user.role}
                          >
                            <option value="USER">Utilisateur</option>
                            <option value="ADMIN">Administrateur</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              checked={user.aiAccess || user.directoryAllowlisted}
                              disabled={busy === user.id || user.directoryAllowlisted}
                              onChange={(event) =>
                                void updateUser(user, { aiAccess: event.currentTarget.checked })
                              }
                              type="checkbox"
                            />
                            <span>
                              {user.directoryAllowlisted
                                ? "Autorisé par la liste serveur"
                                : "Autoriser la recherche"}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <LockKeyholeIcon aria-hidden="true" className="size-3.5" />
                            {user._count.studentAccesses} fiche(s) · {user._count.tickets} ticket(s)
                          </span>
                        </td>
                        <td className="min-w-64 px-4 py-3">
                          <label className="sr-only" htmlFor={`message-${user.id}`}>
                            Envoyer un message à {user.name}
                          </label>
                          <textarea
                            className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            id={`message-${user.id}`}
                            maxLength={2000}
                            onChange={(event) => {
                              const value = event.target.value
                              setUserMessageDrafts((current) => ({
                                ...current,
                                [user.id]: value,
                              }))
                            }}
                            placeholder="Message dans ses notifications"
                            value={userMessageDrafts[user.id] ?? ""}
                          />
                          <Button
                            className="mt-2"
                            disabled={busy !== "" || !userMessageDrafts[user.id]?.trim()}
                            onClick={() => void sendUserMessage(user)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {busy === user.id ? (
                              <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                            ) : (
                              <SendIcon aria-hidden="true" />
                            )}
                            Envoyer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Aucun utilisateur ne correspond à cette recherche.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
