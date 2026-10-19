"use client"

import * as React from "react"
import Link from "next/link"
import {
  BellRingIcon,
  CheckCheckIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { readJsonResponse } from "@/lib/read-json-response"

type Notification = {
  id: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

type NotificationResponse = {
  notifications: Notification[]
  unreadCount: number
}

async function fetchNotifications(signal?: AbortSignal) {
  const response = await fetch("/api/notifications", { signal })
  const data = await readJsonResponse<NotificationResponse & { error?: string }>(
    response,
    "Chargement des notifications",
  )
  if (!response.ok) {
    throw new Error(data.error ?? "Les notifications n’ont pas pu être chargées.")
  }
  return data
}

export function NotificationList() {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length

  React.useEffect(() => {
    const controller = new AbortController()
    const refresh = () => {
      fetchNotifications(controller.signal)
        .then((data) => {
          setNotifications(data.notifications)
          setError("")
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Les notifications n’ont pas pu être chargées.",
            )
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }

    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [])

  async function markRead(ids?: string[]) {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : { all: true }),
      })
      const data = await readJsonResponse<{ error?: string }>(
        response,
        "Mise à jour des notifications",
      )
      if (!response.ok) {
        throw new Error(data.error ?? "La notification n’a pas pu être mise à jour.")
      }
      const refreshed = await fetchNotifications()
      setNotifications(refreshed.notifications)
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La notification n’a pas pu être mise à jour.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-label="Liste des notifications"
      className="mx-auto w-full max-w-4xl"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {unreadCount === 0
            ? "Vous êtes à jour."
            : `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
        </p>
        <Button
          disabled={unreadCount === 0 || busy}
          onClick={() => void markRead()}
          size="sm"
          variant="outline"
        >
          <CheckCheckIcon aria-hidden="true" />
          Tout marquer comme lu
        </Button>
      </div>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Chargement des notifications…
        </div>
      ) : notifications.length ? (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const content = (
              <Card
                className={
                  notification.readAt
                    ? "bg-card"
                    : "border-primary/25 bg-primary/[0.03]"
                }
                key={notification.id}
              >
                <CardContent className="flex items-start gap-4">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {notification.title.toLocaleLowerCase().includes("accept") ? (
                      <CircleCheckIcon aria-hidden="true" className="size-5" />
                    ) : notification.readAt ? (
                      <InfoIcon aria-hidden="true" className="size-5" />
                    ) : (
                      <BellRingIcon aria-hidden="true" className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.readAt && (
                        <span
                          aria-label="Non lue"
                          className="size-2 rounded-full bg-primary"
                        />
                      )}
                      <time className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(notification.createdAt))}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {notification.body}
                    </p>
                  </div>
                  {!notification.readAt && !notification.href && (
                    <Button
                      disabled={busy}
                      onClick={() => void markRead([notification.id])}
                      size="sm"
                      variant="ghost"
                    >
                      Marquer comme lu
                    </Button>
                  )}
                </CardContent>
              </Card>
            )

            return notification.href ? (
              <Link
                className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={notification.href}
                key={notification.id}
                onClick={() => {
                  if (!notification.readAt) void markRead([notification.id])
                }}
              >
                {content}
              </Link>
            ) : (
              <React.Fragment key={notification.id}>{content}</React.Fragment>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border py-12 text-center">
          <h3 className="font-medium">Aucune notification</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Les réponses et mises à jour des tickets apparaîtront ici.
          </p>
        </div>
      )}
    </section>
  )
}
